import { internalMutation } from "./_generated/server";
import { hashPin } from "./lib/pin";

/**
 * Seeds the Thailand 2027 trip: settings, destinations, 7 traveller slots
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

    // --- Seven traveller slots. Wayne is Super Admin; the other six are
    // placeholders to be renamed in the app. Each gets a distinct Vibe colour.
    const superAdminPinHash = await hashPin(superAdminPin);
    const wayneId = await ctx.db.insert("travellers", {
      name: "Wayne",
      initials: "W",
      avatarColor: "royal",
      role: "superAdmin",
      pinHash: superAdminPinHash,
      order: 0,
    });

    const placeholderColors = [
      "done-green",
      "purple",
      "working_orange",
      "sunset",
      "aquamarine",
      "berry",
    ];
    for (let i = 0; i < 6; i++) {
      await ctx.db.insert("travellers", {
        name: `Traveller ${i + 2}`,
        initials: `T${i + 2}`,
        avatarColor: placeholderColors[i],
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

    return "Seeded: settings, 6 destinations, 7 travellers, Songkran vibe.";
  }
);
