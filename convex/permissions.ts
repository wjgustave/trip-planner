// ---------------------------------------------------------------------------
// RBAC — the single source of truth for who may do what.
// ---------------------------------------------------------------------------
// Hiding buttons in the UI is a courtesy; THIS is the actual control. Every
// mutation calls requireAction(ctx, sessionToken, action) before writing.
//
// The PERMISSIONS map is deliberately a plain config object: edit the minimum
// role for an action here and every mutation picks it up — no mutation code
// changes needed. Role names are a first draft and can be renamed here too.
//
// Elevation: contributor-level actions need only a valid session. Actions at
// admin level or above ALSO require an active PIN elevation (entered in the
// last 30 minutes), verified server-side in auth.elevate.
// ---------------------------------------------------------------------------
import { MutationCtx, QueryCtx } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

export type Role = "contributor" | "admin" | "superAdmin";

/** Ordering used for "at least this role" checks. */
const ROLE_RANK: Record<Role, number> = {
  contributor: 0,
  admin: 1,
  superAdmin: 2,
};

/** Every permission-gated action in the app -> minimum role required. */
export const PERMISSIONS = {
  // --- Contributor (everyone with a session) ---
  editOwnFlights: "contributor", // own flight dates, airport, flight number
  editOwnProfile: "contributor", // own name, avatar, colour
  overrideOwnPresence: "contributor",
  addVibe: "contributor",
  reactToVibe: "contributor",
  deleteOwnVibe: "contributor",

  // --- Admin (PIN required) ---
  editAnyFlights: "admin",
  moveDestinationBars: "admin", // move / resize destination bars
  manageDestinations: "admin", // add, remove, reorder destinations
  recolorDestinations: "admin",
  moderateVibes: "admin", // pin or delete any vibe note

  // --- Super Admin (PIN required) ---
  manageTravellers: "superAdmin", // add / remove travellers
  assignRoles: "superAdmin", // assign roles, set PINs
  changeTripSettings: "superAdmin", // core dates or buffer window
  exportOrReset: "superAdmin",
} as const satisfies Record<string, Role>;

export type Action = keyof typeof PERMISSIONS;

/** How long a PIN elevation lasts. */
export const ELEVATION_MS = 30 * 60 * 1000;

export interface AuthedContext {
  session: Doc<"sessions">;
  traveller: Doc<"travellers">;
  /** True while a PIN elevation is active. */
  isElevated: boolean;
}

/** Resolve and validate the session token. Throws when missing/unknown. */
export async function requireSession(
  ctx: QueryCtx | MutationCtx,
  sessionToken: string | undefined
): Promise<AuthedContext> {
  if (!sessionToken) throw new Error("Not signed in");
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q) => q.eq("token", sessionToken))
    .unique();
  if (!session) throw new Error("Session expired — pick your avatar again");
  const traveller = await ctx.db.get(session.travellerId);
  if (!traveller) throw new Error("Traveller no longer exists");
  return {
    session,
    traveller,
    isElevated: (session.elevatedUntil ?? 0) > Date.now(),
  };
}

/**
 * The permission check every mutation uses. Verifies:
 *   1. the session is valid,
 *   2. the traveller's role meets the action's minimum role,
 *   3. for admin+ actions, a PIN elevation is currently active.
 */
export async function requireAction(
  ctx: QueryCtx | MutationCtx,
  sessionToken: string | undefined,
  action: Action
): Promise<AuthedContext> {
  const authed = await requireSession(ctx, sessionToken);
  const minRole = PERMISSIONS[action];
  if (ROLE_RANK[authed.traveller.role] < ROLE_RANK[minRole]) {
    throw new Error(`Not allowed: ${action} requires ${minRole}`);
  }
  if (ROLE_RANK[minRole] >= ROLE_RANK.admin && !authed.isElevated) {
    throw new Error("PIN required: enter your PIN to unlock admin actions");
  }
  return authed;
}

/** Record who changed what in the activity log. */
export async function logActivity(
  ctx: MutationCtx,
  actor: Doc<"travellers">,
  action: string,
  entityType: string,
  entityId: string,
  before?: unknown,
  after?: unknown
): Promise<void> {
  await ctx.db.insert("activity", {
    actorId: actor._id,
    action,
    entityType,
    entityId,
    before: before ?? undefined,
    after: after ?? undefined,
    at: Date.now(),
  });
}
