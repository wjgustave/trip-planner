// Lightweight identity: tap your avatar, get a session. The cookie holds an
// opaque random token; everything the token means (traveller, elevation
// state) lives server-side in the sessions table, so mutations can trust it.
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { verifyPin } from "./lib/pin";
import { ELEVATION_MS, requireSession } from "./permissions";

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Tap an avatar + enter your PIN -> new session. Returns the token for the
 * cookie. The PIN is verified server-side against the stored hash; since the
 * PIN was just proven, admin+ sessions start already elevated.
 */
export const createSession = mutation({
  args: { travellerId: v.id("travellers"), pin: v.string() },
  handler: async (ctx, { travellerId, pin }) => {
    const traveller = await ctx.db.get(travellerId);
    if (!traveller) throw new Error("Traveller not found");
    if (!traveller.pinHash) {
      throw new Error("No PIN set for this traveller — ask the Super Admin");
    }
    const ok = await verifyPin(pin, traveller.pinHash);
    if (!ok) throw new Error("Wrong PIN");
    const token = randomToken();
    await ctx.db.insert("sessions", {
      token,
      travellerId,
      createdAt: Date.now(),
      lastSeenAt: Date.now(),
      elevatedUntil:
        traveller.role === "contributor" ? undefined : Date.now() + ELEVATION_MS,
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

/**
 * PIN elevation, verified SERVER-SIDE against the stored hash. On success the
 * session is elevated for 30 minutes; admin+ mutations check this window.
 */
export const elevate = mutation({
  args: { token: v.string(), pin: v.string() },
  handler: async (ctx, { token, pin }) => {
    const { session, traveller } = await requireSession(ctx, token);
    if (traveller.role === "contributor") {
      throw new Error("Contributors have no admin actions to unlock");
    }
    if (!traveller.pinHash) {
      throw new Error("No PIN set for this traveller — ask the Super Admin");
    }
    const ok = await verifyPin(pin, traveller.pinHash);
    if (!ok) throw new Error("Wrong PIN");
    const elevatedUntil = Date.now() + ELEVATION_MS;
    await ctx.db.patch(session._id, { elevatedUntil });
    return elevatedUntil;
  },
});

/** How long after the last heartbeat someone still counts as online. */
const ONLINE_WINDOW_MS = 2 * 60 * 1000;

/**
 * Presence heartbeat — the client pings this every ~45s while the tab is
 * open. Each write also makes the whosOnline query recompute everywhere,
 * which is how stale entries age out reactively.
 */
export const heartbeat = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (session) await ctx.db.patch(session._id, { lastSeenAt: Date.now() });
  },
});

/** Travellers with a live session (heartbeat in the last 2 minutes). */
export const whosOnline = query(async (ctx) => {
  const cutoff = Date.now() - ONLINE_WINDOW_MS;
  const sessions = await ctx.db.query("sessions").collect();
  const onlineIds = new Set(
    sessions.filter((s) => (s.lastSeenAt ?? 0) > cutoff).map((s) => s.travellerId)
  );
  const travellers = await ctx.db.query("travellers").withIndex("by_order").collect();
  return travellers
    .filter((t) => onlineIds.has(t._id))
    .map(({ pinHash: _pinHash, ...t }) => t);
});

/** Manually drop elevation (also expires automatically). */
export const dropElevation = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const { session } = await requireSession(ctx, token);
    await ctx.db.patch(session._id, { elevatedUntil: undefined });
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
