// Vibe note mutations. Everyone adds/reacts/deletes their own; Admin+ can pin
// or delete anyone's.
import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { moodValidator } from "./schema";
import { logActivity, requireAction } from "./permissions";

export const add = mutation({
  args: {
    sessionToken: v.string(),
    destinationId: v.id("destinations"),
    body: v.string(),
    mood: moodValidator,
  },
  handler: async (ctx, { sessionToken, destinationId, body, mood }) => {
    const { traveller } = await requireAction(ctx, sessionToken, "addVibe");
    if (!body.trim()) throw new Error("Write something first");
    const dest = await ctx.db.get(destinationId);
    if (!dest) throw new Error("Destination not found");
    const id = await ctx.db.insert("vibes", {
      destinationId,
      authorId: traveller._id,
      body: body.trim(),
      mood,
      pinned: false,
      createdAt: Date.now(),
    });
    await logActivity(ctx, traveller, "added vibe", "vibe", id, undefined, {
      destination: dest.name,
      mood,
    });
    return id;
  },
});

export const remove = mutation({
  args: { sessionToken: v.string(), vibeId: v.id("vibes") },
  handler: async (ctx, { sessionToken, vibeId }) => {
    const { traveller } = await requireAction(ctx, sessionToken, "deleteOwnVibe");
    const vibe = await ctx.db.get(vibeId);
    if (!vibe) return;
    if (vibe.authorId !== traveller._id) {
      await requireAction(ctx, sessionToken, "deleteAnyVibe");
    }
    await ctx.db.delete(vibeId);
    await logActivity(ctx, traveller, "deleted vibe", "vibe", vibeId, { body: vibe.body });
  },
});

export const setPinned = mutation({
  args: { sessionToken: v.string(), vibeId: v.id("vibes"), pinned: v.boolean() },
  handler: async (ctx, { sessionToken, vibeId, pinned }) => {
    const { traveller } = await requireAction(ctx, sessionToken, "pinVibes");
    const vibe = await ctx.db.get(vibeId);
    if (!vibe) return;
    await ctx.db.patch(vibeId, { pinned });
    await logActivity(ctx, traveller, pinned ? "pinned vibe" : "unpinned vibe", "vibe", vibeId, undefined, {
      body: vibe.body.slice(0, 60),
    });
  },
});

/** Toggle an emoji reaction. */
export const react = mutation({
  args: { sessionToken: v.string(), vibeId: v.id("vibes"), emoji: v.string() },
  handler: async (ctx, { sessionToken, vibeId, emoji }) => {
    const { traveller } = await requireAction(ctx, sessionToken, "reactToVibe");
    const vibe = await ctx.db.get(vibeId);
    if (!vibe) return;
    const reactions = vibe.reactions ?? [];
    const mine = reactions.findIndex(
      (r) => r.travellerId === traveller._id && r.emoji === emoji
    );
    const next =
      mine >= 0
        ? reactions.filter((_, i) => i !== mine)
        : [...reactions, { travellerId: traveller._id, emoji }];
    await ctx.db.patch(vibeId, { reactions: next });
  },
});
