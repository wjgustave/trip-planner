// Lightweight identity: tap your avatar, get a session. The cookie holds an
// opaque random token; everything the token means (traveller, elevation
// state) lives server-side in the sessions table, so mutations can trust it.
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Tap an avatar -> new session. Returns the token for the cookie. */
export const createSession = mutation({
  args: { travellerId: v.id("travellers") },
  handler: async (ctx, { travellerId }) => {
    const traveller = await ctx.db.get(travellerId);
    if (!traveller) throw new Error("Traveller not found");
    const token = randomToken();
    await ctx.db.insert("sessions", {
      token,
      travellerId,
      createdAt: Date.now(),
    });
    return token;
  },
});

/** Who am I? Traveller + elevation state for a session token. */
export const getSession = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, { token }) => {
    if (!token) return null;
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!session) return null;
    const traveller = await ctx.db.get(session.travellerId);
    if (!traveller) return null;
    const { pinHash: _pinHash, ...safe } = traveller;
    return {
      traveller: { ...safe, hasPin: Boolean(_pinHash) },
      elevatedUntil: session.elevatedUntil ?? null,
      isElevated: (session.elevatedUntil ?? 0) > Date.now(),
    };
  },
});

/** "Not you?" — drop the session. */
export const endSession = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (session) await ctx.db.delete(session._id);
  },
});
