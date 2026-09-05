// Flight segment mutations. Everyone edits their own; Admin+ edits anyone's.
import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { logActivity, requireAction } from "./permissions";

const segmentFields = {
  travellerId: v.id("travellers"),
  direction: v.union(v.literal("inbound"), v.literal("outbound")),
  flightDate: v.string(),
  arrivalDate: v.string(),
  airport: v.optional(v.string()),
  flightNumber: v.optional(v.string()),
  notes: v.optional(v.string()),
  status: v.union(v.literal("idea"), v.literal("booked"), v.literal("confirmed")),
};

/** Create or replace a traveller's inbound/outbound segment. */
export const upsert = mutation({
  args: { sessionToken: v.string(), ...segmentFields },
  handler: async (ctx, { sessionToken, ...fields }) => {
    // Own flights need contributor; anyone else's needs admin + PIN.
    const { traveller } = await requireAction(ctx, sessionToken, "editOwnFlights");
    if (fields.travellerId !== traveller._id) {
      await requireAction(ctx, sessionToken, "editAnyFlights");
    }
    if (fields.direction === "inbound" && fields.arrivalDate < fields.flightDate) {
      throw new Error("Arrival cannot be before the flight date");
    }

    const existing = await ctx.db
      .query("travelSegments")
      .withIndex("by_traveller", (q) => q.eq("travellerId", fields.travellerId))
      .collect();
    const current = existing.find((s) => s.direction === fields.direction);

    if (current) {
      await ctx.db.patch(current._id, fields);
      await logActivity(
        ctx,
        traveller,
        `updated ${fields.direction} flight`,
        "travelSegment",
        current._id,
        { flightDate: current.flightDate, status: current.status },
        { flightDate: fields.flightDate, status: fields.status }
      );
      return current._id;
    }
    const id = await ctx.db.insert("travelSegments", fields);
    await logActivity(ctx, traveller, `added ${fields.direction} flight`, "travelSegment", id, undefined, {
      flightDate: fields.flightDate,
      status: fields.status,
    });
    return id;
  },
});

/** Delete a segment (own, or anyone's for Admin+). */
export const remove = mutation({
  args: { sessionToken: v.string(), segmentId: v.id("travelSegments") },
  handler: async (ctx, { sessionToken, segmentId }) => {
    const { traveller } = await requireAction(ctx, sessionToken, "editOwnFlights");
    const segment = await ctx.db.get(segmentId);
    if (!segment) return;
    if (segment.travellerId !== traveller._id) {
      await requireAction(ctx, sessionToken, "editAnyFlights");
    }
    await ctx.db.delete(segmentId);
    await logActivity(ctx, traveller, `removed ${segment.direction} flight`, "travelSegment", segmentId);
  },
});
