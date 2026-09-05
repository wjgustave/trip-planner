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
