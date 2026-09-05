import { query } from "./_generated/server";

/** Singleton trip settings (core dates + buffer size). */
export const getSettings = query(async (ctx) => {
  const settings = await ctx.db.query("settings").first();
  return settings;
});

/** All destinations in display order. */
export const listDestinations = query(async (ctx) => {
  return await ctx.db.query("destinations").withIndex("by_order").collect();
});

/** All travellers in display order (never exposes pinHash). */
export const listTravellers = query(async (ctx) => {
  const travellers = await ctx.db.query("travellers").withIndex("by_order").collect();
  return travellers.map(({ pinHash: _pinHash, ...t }) => ({
    ...t,
    hasPin: Boolean(_pinHash),
  }));
});

/** All travel segments, for the timeline and people views. */
export const listTravelSegments = query(async (ctx) => {
  return await ctx.db.query("travelSegments").collect();
});
