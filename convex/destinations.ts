// Destination mutations — all guarded by requireAction (see permissions.ts).
import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { logActivity, requireAction } from "./permissions";

/** Move or resize a destination bar (Admin+, PIN). */
export const updateDates = mutation({
  args: {
    sessionToken: v.string(),
    destinationId: v.id("destinations"),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, { sessionToken, destinationId, startDate, endDate }) => {
    const { traveller } = await requireAction(ctx, sessionToken, "moveDestinationBars");
    if (startDate > endDate) throw new Error("Start date must not be after end date");
    const dest = await ctx.db.get(destinationId);
    if (!dest) throw new Error("Destination not found");
    await ctx.db.patch(destinationId, { startDate, endDate });
    await logActivity(
      ctx,
      traveller,
      "moved destination",
      "destination",
      destinationId,
      { name: dest.name, startDate: dest.startDate, endDate: dest.endDate },
      { name: dest.name, startDate, endDate }
    );
  },
});

/** Change a destination's colour token (Admin+, PIN). */
export const recolor = mutation({
  args: {
    sessionToken: v.string(),
    destinationId: v.id("destinations"),
    colorToken: v.string(),
  },
  handler: async (ctx, { sessionToken, destinationId, colorToken }) => {
    const { traveller } = await requireAction(ctx, sessionToken, "recolorDestinations");
    const dest = await ctx.db.get(destinationId);
    if (!dest) throw new Error("Destination not found");
    await ctx.db.patch(destinationId, { colorToken });
    await logActivity(
      ctx,
      traveller,
      "recoloured destination",
      "destination",
      destinationId,
      { name: dest.name, colorToken: dest.colorToken },
      { name: dest.name, colorToken }
    );
  },
});

/** Add a destination (Admin+, PIN). */
export const add = mutation({
  args: {
    sessionToken: v.string(),
    name: v.string(),
    colorToken: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    kind: v.union(v.literal("place"), v.literal("transit"), v.literal("buffer")),
  },
  handler: async (ctx, { sessionToken, ...fields }) => {
    const { traveller } = await requireAction(ctx, sessionToken, "manageDestinations");
    if (fields.startDate > fields.endDate) throw new Error("Start date must not be after end date");
    const existing = await ctx.db.query("destinations").collect();
    const order = Math.max(0, ...existing.map((d) => d.order + 1));
    const id = await ctx.db.insert("destinations", { ...fields, order });
    await logActivity(ctx, traveller, "added destination", "destination", id, undefined, fields);
    return id;
  },
});

/** Remove a destination (Admin+, PIN). */
export const remove = mutation({
  args: { sessionToken: v.string(), destinationId: v.id("destinations") },
  handler: async (ctx, { sessionToken, destinationId }) => {
    const { traveller } = await requireAction(ctx, sessionToken, "manageDestinations");
    const dest = await ctx.db.get(destinationId);
    if (!dest) throw new Error("Destination not found");
    // Clean up dependents: vibes and presence overrides pointing at it.
    const vibes = await ctx.db
      .query("vibes")
      .withIndex("by_destination", (q) => q.eq("destinationId", destinationId))
      .collect();
    for (const vibe of vibes) await ctx.db.delete(vibe._id);
    const overrides = await ctx.db
      .query("presence")
      .withIndex("by_destination", (q) => q.eq("destinationId", destinationId))
      .collect();
    for (const o of overrides) await ctx.db.delete(o._id);
    await ctx.db.delete(destinationId);
    await logActivity(ctx, traveller, "removed destination", "destination", destinationId, {
      name: dest.name,
      startDate: dest.startDate,
      endDate: dest.endDate,
    });
  },
});

/** Reorder destinations (Admin+, PIN). */
export const reorder = mutation({
  args: { sessionToken: v.string(), orderedIds: v.array(v.id("destinations")) },
  handler: async (ctx, { sessionToken, orderedIds }) => {
    const { traveller } = await requireAction(ctx, sessionToken, "manageDestinations");
    for (let i = 0; i < orderedIds.length; i++) {
      await ctx.db.patch(orderedIds[i], { order: i });
    }
    await logActivity(ctx, traveller, "reordered destinations", "destination", "all");
  },
});
