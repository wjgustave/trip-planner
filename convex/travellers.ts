// Traveller mutations: own profile edits for everyone, roster/roles/PINs for
// the Super Admin.
import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { hashPin } from "./lib/pin";
import { logActivity, requireAction } from "./permissions";

/** Edit own name, initials, avatar colour (Contributor+). */
export const updateProfile = mutation({
  args: {
    sessionToken: v.string(),
    travellerId: v.id("travellers"),
    name: v.optional(v.string()),
    initials: v.optional(v.string()),
    avatarColor: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, { sessionToken, travellerId, ...updates }) => {
    const { traveller } = await requireAction(ctx, sessionToken, "editOwnProfile");
    if (travellerId !== traveller._id) {
      // Renaming someone else's slot is a roster action.
      await requireAction(ctx, sessionToken, "manageTravellers");
    }
    const target = await ctx.db.get(travellerId);
    if (!target) throw new Error("Traveller not found");

    const fields: Record<string, string> = {};
    if (updates.name !== undefined && updates.name.trim()) {
      fields.name = updates.name.trim();
      // Re-derive initials from the new name unless explicitly provided.
      if (updates.initials === undefined) {
        fields.initials = deriveInitials(updates.name);
      }
    }
    if (updates.initials !== undefined && updates.initials.trim()) {
      fields.initials = updates.initials.trim().slice(0, 3).toUpperCase();
    }
    if (updates.avatarColor !== undefined) fields.avatarColor = updates.avatarColor;
    if (updates.avatarUrl !== undefined) fields.avatarUrl = updates.avatarUrl;

    await ctx.db.patch(travellerId, fields);
    await logActivity(
      ctx,
      traveller,
      "updated profile",
      "traveller",
      travellerId,
      { name: target.name },
      { name: fields.name ?? target.name }
    );
  },
});

/** Colours handed to new travellers, first unused one wins. */
const ROSTER_COLORS = [
  "done-green",
  "purple",
  "working_orange",
  "sunset",
  "aquamarine",
  "berry",
  "bright-blue",
  "egg_yolk",
  "peach",
  "winter",
];

/** Add a traveller slot to the roster (Super Admin, PIN). */
export const addTraveller = mutation({
  args: {
    sessionToken: v.string(),
    name: v.string(),
  },
  handler: async (ctx, { sessionToken, name }) => {
    const { traveller } = await requireAction(ctx, sessionToken, "manageTravellers");
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Traveller needs a name");

    const existing = await ctx.db.query("travellers").collect();
    const usedColors = new Set(existing.map((t) => t.avatarColor));
    const avatarColor =
      ROSTER_COLORS.find((c) => !usedColors.has(c)) ??
      ROSTER_COLORS[existing.length % ROSTER_COLORS.length];
    const order = existing.reduce((max, t) => Math.max(max, t.order), -1) + 1;

    const id = await ctx.db.insert("travellers", {
      name: trimmed,
      initials: deriveInitials(trimmed),
      avatarColor,
      role: "contributor",
      order,
    });
    await logActivity(ctx, traveller, "added traveller", "traveller", id, undefined, {
      name: trimmed,
    });
    return id;
  },
});

/** Remove a traveller and everything they own (Super Admin, PIN). */
export const removeTraveller = mutation({
  args: {
    sessionToken: v.string(),
    travellerId: v.id("travellers"),
  },
  handler: async (ctx, { sessionToken, travellerId }) => {
    const { traveller } = await requireAction(ctx, sessionToken, "manageTravellers");
    const target = await ctx.db.get(travellerId);
    if (!target) throw new Error("Traveller not found");
    if (target._id === traveller._id) throw new Error("You can't remove yourself");
    if (target.role === "superAdmin") throw new Error("The Super Admin can't be removed");

    // Cascade: flights, presence overrides, sessions, vibes + reactions.
    const segments = await ctx.db
      .query("travelSegments")
      .withIndex("by_traveller", (q) => q.eq("travellerId", travellerId))
      .collect();
    for (const s of segments) await ctx.db.delete(s._id);

    const presence = await ctx.db
      .query("presence")
      .withIndex("by_traveller", (q) => q.eq("travellerId", travellerId))
      .collect();
    for (const p of presence) await ctx.db.delete(p._id);

    const sessions = await ctx.db.query("sessions").collect();
    for (const s of sessions) {
      if (s.travellerId === travellerId) await ctx.db.delete(s._id);
    }

    const vibes = await ctx.db.query("vibes").collect();
    for (const vibe of vibes) {
      if (vibe.authorId === travellerId) {
        await ctx.db.delete(vibe._id);
      } else if (vibe.reactions?.some((r) => r.travellerId === travellerId)) {
        await ctx.db.patch(vibe._id, {
          reactions: vibe.reactions.filter((r) => r.travellerId !== travellerId),
        });
      }
    }

    await ctx.db.delete(travellerId);
    await logActivity(ctx, traveller, "removed traveller", "traveller", travellerId, {
      name: target.name,
    });
  },
});

/** Assign a role and optionally (re)set a PIN (Super Admin, PIN). */
export const setRole = mutation({
  args: {
    sessionToken: v.string(),
    travellerId: v.id("travellers"),
    role: v.union(v.literal("contributor"), v.literal("admin"), v.literal("superAdmin")),
    pin: v.optional(v.string()),
  },
  handler: async (ctx, { sessionToken, travellerId, role, pin }) => {
    const { traveller } = await requireAction(ctx, sessionToken, "assignRoles");
    const target = await ctx.db.get(travellerId);
    if (!target) throw new Error("Traveller not found");
    if (role !== "contributor" && !pin && !target.pinHash) {
      throw new Error("Admins need a PIN — provide one when assigning the role");
    }
    const fields: { role: typeof role; pinHash?: string } = { role };
    if (pin) {
      if (!/^\d{4}$/.test(pin)) throw new Error("PIN must be exactly 4 digits");
      fields.pinHash = await hashPin(pin);
    }
    await ctx.db.patch(travellerId, fields);
    await logActivity(
      ctx,
      traveller,
      "changed role",
      "traveller",
      travellerId,
      { name: target.name, role: target.role },
      { name: target.name, role }
    );
  },
});

function deriveInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}
