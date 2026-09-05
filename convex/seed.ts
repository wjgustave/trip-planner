import { internalMutation } from "./_generated/server";
import { hashPin } from "./lib/pin";

/**
 * Seeds the Thailand 2027 trip: settings, destinations, the traveller roster
 * (Wayne = Super Admin) and the pinned Songkran vibe note on Bangkok.
 * Idempotent — refuses to run if travellers already exist.
 *
 * Run with: npx convex run seed:run '{"superAdminPin": "<pin>"}'
 */
export const run = internalMutation(
  async (ctx, { superAdminPin }: { superAdminPin: string }) => {
    const existing = await ctx.db.query("travellers").first();
    if (existing) {
      return "Already seeded — skipping.";
    }

    // --- Trip settings: core dates 9 Apr – 2 May 2027, 3 buffer days each side.
    await ctx.db.insert("settings", {
      tripStart: "2027-04-09",
      tripEnd: "2027-05-02",
      bufferDays: 3,
    });

    // --- Destinations (brief §2). Overlap days are shared: bars abut on the
    // 13th, 16th, 20th and 23rd rather than leaving gaps.
    const destinations = [
      {
        name: "Outbound flights",
        colorToken: "bright-blue", // --dest-transit #579BFC
        startDate: "2027-04-09",
        endDate: "2027-04-13", // fly 9–12, arrive next day 10–13
        order: 0,
        kind: "transit" as const,
      },
      {
        name: "Bangkok",
        colorToken: "purple", // --dest-bangkok #A25DDC
        startDate: "2027-04-13",
        endDate: "2027-04-16",
        order: 1,
        kind: "place" as const,
      },
      {
        name: "Koh Samui",
        colorToken: "done-green", // --dest-samui #00C875
        startDate: "2027-04-16",
        endDate: "2027-04-20",
        order: 2,
        kind: "place" as const,
      },
      {
        name: "Koh Phangan",
        colorToken: "working_orange", // --dest-phangan #FDAB3D
        startDate: "2027-04-20",
        endDate: "2027-04-23",
        order: 3,
        kind: "place" as const,
      },
      {
        name: "Phuket",
        colorToken: "sunset", // --dest-phuket #FF7575
        startDate: "2027-04-23",
        endDate: "2027-05-02",
        order: 4,
        kind: "place" as const,
        isDepartureWindow: true, // uncertain tail 30 Apr – 2 May
      },
      {
        name: "Return flights",
        colorToken: "explosive", // --dest-transit-out #C4C4C4
        startDate: "2027-04-30",
        endDate: "2027-05-02", // departure window, not a date
        order: 5,
        kind: "transit" as const,
        isDepartureWindow: true,
      },
    ];

    const destinationIds: Record<string, string> = {};
    for (const dest of destinations) {
      const id = await ctx.db.insert("destinations", dest);
      destinationIds[dest.name] = id;
    }

    // --- The roster. Wayne is Super Admin; the Super Admin can add more
    // travellers from the People view. Each gets a distinct Vibe colour.
    const superAdminPinHash = await hashPin(superAdminPin);
    const wayneId = await ctx.db.insert("travellers", {
      name: "Wayne",
      initials: "W",
      avatarColor: "royal",
      role: "superAdmin",
      pinHash: superAdminPinHash,
      order: 0,
    });

    const roster: Array<{ name: string; color: string }> = [
      { name: "Abdi", color: "done-green" },
      { name: "John", color: "purple" },
      { name: "Emmanuel", color: "working_orange" },
      { name: "Ali", color: "sunset" },
    ];
    for (let i = 0; i < roster.length; i++) {
      await ctx.db.insert("travellers", {
        name: roster[i].name,
        initials: roster[i].name[0].toUpperCase(),
        avatarColor: roster[i].color,
        role: "contributor",
        order: i + 1,
      });
    }

    // --- Pinned Songkran vibe on Bangkok so nobody discovers it late.
    await ctx.db.insert("vibes", {
      destinationId: destinationIds["Bangkok"] as never,
      authorId: wayneId,
      body: "Bangkok 13\u201316 April is Songkran \u2014 Thai New Year, the biggest week in the Thai calendar. Expect city-wide water fights, street parties and busy hotels. Book ahead.",
      mood: "culture",
      pinned: true,
      createdAt: Date.now(),
    });

    return "Seeded: settings, 6 destinations, 5 travellers, Songkran vibe.";
  }
);

/**
 * One-off migration: rename placeholder Travellers 2–5 to Abdi, John,
 * Emmanuel and Ali, and delete any remaining placeholder slots.
 *
 * Run with: npx convex run seed:migrateRoster
 */
export const migrateRoster = internalMutation(async (ctx) => {
  const renames: Record<string, string> = {
    "Traveller 2": "Abdi",
    "Traveller 3": "John",
    "Traveller 4": "Emmanuel",
    "Traveller 5": "Ali",
  };
  const travellers = await ctx.db.query("travellers").collect();
  const done: string[] = [];
  for (const t of travellers) {
    const newName = renames[t.name];
    if (newName) {
      await ctx.db.patch(t._id, {
        name: newName,
        initials: newName[0].toUpperCase(),
      });
      done.push(`${t.name} -> ${newName}`);
    } else if (/^Traveller \d+$/.test(t.name)) {
      // Leftover placeholder — remove it and anything it owns.
      const segments = await ctx.db
        .query("travelSegments")
        .withIndex("by_traveller", (q) => q.eq("travellerId", t._id))
        .collect();
      for (const s of segments) await ctx.db.delete(s._id);
      const presence = await ctx.db
        .query("presence")
        .withIndex("by_traveller", (q) => q.eq("travellerId", t._id))
        .collect();
      for (const p of presence) await ctx.db.delete(p._id);
      const sessions = await ctx.db.query("sessions").collect();
      for (const s of sessions) {
        if (s.travellerId === t._id) await ctx.db.delete(s._id);
      }
      const vibes = await ctx.db.query("vibes").collect();
      for (const vibe of vibes) {
        if (vibe.authorId === t._id) {
          await ctx.db.delete(vibe._id);
        } else if (vibe.reactions?.some((r) => r.travellerId === t._id)) {
          await ctx.db.patch(vibe._id, {
            reactions: vibe.reactions.filter((r) => r.travellerId !== t._id),
          });
        }
      }
      await ctx.db.delete(t._id);
      done.push(`deleted ${t.name}`);
    }
  }
  return done.length ? done.join(", ") : "Nothing to migrate.";
});

/**
 * Wipe the activity log (the feed of who-changed-what).
 *
 * Run with: npx convex run seed:clearActivity [--prod]
 */
export const clearActivity = internalMutation(async (ctx) => {
  const entries = await ctx.db.query("activity").collect();
  for (const entry of entries) await ctx.db.delete(entry._id);
  return `Cleared ${entries.length} activity entries.`;
});
