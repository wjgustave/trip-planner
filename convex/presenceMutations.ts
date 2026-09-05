// Presence overrides: anyone can override where THEY are; derived presence
// (from flight dates) is the default — see convex/lib/presence.ts.
import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { logActivity, requireAction } from "./permissions";

export const setOverride = mutation({
  args: {
    sessionToken: v.string(),
    destinationId: v.id("destinations"),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, { sessionToken, destinationId, startDate, endDate }) => {
    const { traveller } = await requireAction(ctx, sessionToken, "overrideOwnPresence");
    if (startDate > endDate) throw new Error("Start date must not be after end date");
    const dest = await ctx.db.get(destinationId);
    if (!dest) throw new Error("Destination not found");

    const existing = await ctx.db
      .query("presence")
      .withIndex("by_traveller", (q) => q.eq("travellerId", traveller._id))
      .collect();
    const current = existing.find((p) => p.destinationId === destinationId);
    if (current) {
      await ctx.db.patch(current._id, { startDate, endDate });
    } else {
      await ctx.db.insert("presence", {
        travellerId: traveller._id,
        destinationId,
        startDate,
        endDate,
        isOverride: true,
      });
    }
    await logActivity(ctx, traveller, "overrode own presence", "presence", destinationId, undefined, {
      destination: dest.name,
      startDate,
      endDate,
    });
  },
});

export const clearOverride = mutation({
  args: { sessionToken: v.string(), destinationId: v.id("destinations") },
  handler: async (ctx, { sessionToken, destinationId }) => {
    const { traveller } = await requireAction(ctx, sessionToken, "overrideOwnPresence");
    const existing = await ctx.db
      .query("presence")
      .withIndex("by_traveller", (q) => q.eq("travellerId", traveller._id))
      .collect();
    const current = existing.find((p) => p.destinationId === destinationId);
    if (current) {
      await ctx.db.delete(current._id);
      await logActivity(ctx, traveller, "cleared presence override", "presence", destinationId);
    }
  },
});
