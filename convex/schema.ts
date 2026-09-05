import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const roleValidator = v.union(
  v.literal("contributor"),
  v.literal("admin"),
  v.literal("superAdmin")
);

export const moodValidator = v.union(
  v.literal("chill"),
  v.literal("party"),
  v.literal("nature"),
  v.literal("culture"),
  v.literal("food"),
  v.literal("luxury"),
  v.literal("adventure")
);

export default defineSchema({
  travellers: defineTable({
    name: v.string(),
    initials: v.string(), // auto-derived from name, editable
    avatarColor: v.string(), // Vibe content colour name, e.g. "done-green"
    avatarUrl: v.optional(v.string()),
    role: roleValidator,
    pinHash: v.optional(v.string()), // "salt:sha256hex" — only for admin / superAdmin
    order: v.number(),
  }).index("by_order", ["order"]),

  destinations: defineTable({
    name: v.string(),
    colorToken: v.string(), // Vibe content colour name; resolved via DESTINATION_COLORS
    startDate: v.string(), // "YYYY-MM-DD" plain calendar date
    endDate: v.string(),
    order: v.number(),
    kind: v.union(v.literal("place"), v.literal("transit"), v.literal("buffer")),
    isDepartureWindow: v.optional(v.boolean()), // renders the fading tail
  }).index("by_order", ["order"]),

  travelSegments: defineTable({
    travellerId: v.id("travellers"),
    direction: v.union(v.literal("inbound"), v.literal("outbound")),
    flightDate: v.string(),
    arrivalDate: v.string(), // usually flightDate + 1 for inbound
    airport: v.optional(v.string()),
    flightNumber: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: v.union(v.literal("idea"), v.literal("booked"), v.literal("confirmed")),
  }).index("by_traveller", ["travellerId"]),

  // Presence is derived from travel segments by default; rows here are
  // explicit overrides only (isOverride is always true for stored rows,
  // kept in the schema to match derived rows returned by queries).
  presence: defineTable({
    travellerId: v.id("travellers"),
    destinationId: v.id("destinations"),
    startDate: v.string(),
    endDate: v.string(),
    isOverride: v.boolean(),
  })
    .index("by_traveller", ["travellerId"])
    .index("by_destination", ["destinationId"]),

  vibes: defineTable({
    destinationId: v.id("destinations"),
    authorId: v.id("travellers"),
    body: v.string(),
    mood: moodValidator,
    pinned: v.boolean(),
    createdAt: v.number(),
    reactions: v.optional(
      v.array(v.object({ travellerId: v.id("travellers"), emoji: v.string() }))
    ),
  }).index("by_destination", ["destinationId"]),

  activity: defineTable({
    actorId: v.id("travellers"),
    action: v.string(),
    entityType: v.string(),
    entityId: v.string(),
    before: v.optional(v.any()),
    after: v.optional(v.any()),
    at: v.number(),
  }).index("by_at", ["at"]),

  // Avatar-tap identity: the signed cookie references a row here.
  // PIN elevation state lives server-side so expiry is enforced in mutations.
  sessions: defineTable({
    token: v.string(), // random opaque token stored in the cookie
    travellerId: v.id("travellers"),
    elevatedUntil: v.optional(v.number()), // ms epoch; elevation expires after 30 min
    createdAt: v.number(),
    lastSeenAt: v.optional(v.number()), // heartbeat for "who's online" presence
  }).index("by_token", ["token"]),

  // Singleton trip settings. Core dates + buffer are Super Admin editable.
  settings: defineTable({
    tripStart: v.string(), // "2027-04-09"
    tripEnd: v.string(), // "2027-05-02"
    bufferDays: v.number(), // days rendered either side of core dates (default 3)
  }),
});
