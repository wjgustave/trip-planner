import { query } from "./_generated/server";
import { derivePresence } from "./lib/presence";

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

/** Presence (derived + overrides) for every traveller x destination. */
export const listPresence = query(async (ctx) => {
  const [settings, travellers, destinations, segments, overrides] = await Promise.all([
    ctx.db.query("settings").first(),
    ctx.db.query("travellers").collect(),
    ctx.db.query("destinations").collect(),
    ctx.db.query("travelSegments").collect(),
    ctx.db.query("presence").collect(),
  ]);
  if (!settings) return [];
  return derivePresence(travellers, destinations, segments, overrides, settings);
});
