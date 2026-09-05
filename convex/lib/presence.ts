// Presence derivation — shared by Convex queries and the client.
//
// By default a traveller is "at" a destination when their personal date range
// (inbound arrival -> outbound flight) overlaps the destination's dates.
// A traveller with no flights yet is assumed present for the whole trip.
// Stored `presence` rows are explicit overrides and replace the derived
// answer for that traveller + destination pair.

export interface TravellerRangeInput {
  tripStart: string;
  tripEnd: string;
  inboundArrival?: string; // arrivalDate of the inbound segment
  outboundFlight?: string; // flightDate of the outbound segment
}

export function travellerRange(input: TravellerRangeInput): { start: string; end: string } {
  return {
    start: input.inboundArrival ?? input.tripStart,
    end: input.outboundFlight ?? input.tripEnd,
  };
}

export interface PresenceEntry {
  travellerId: string;
  destinationId: string;
  startDate: string;
  endDate: string;
  isOverride: boolean;
}

interface DestinationLike {
  _id: string;
  startDate: string;
  endDate: string;
}

interface TravellerLike {
  _id: string;
}

interface SegmentLike {
  travellerId: string;
  direction: "inbound" | "outbound";
  arrivalDate: string;
  flightDate: string;
}

interface OverrideLike {
  travellerId: string;
  destinationId: string;
  startDate: string;
  endDate: string;
}

/**
 * Full presence map: for every traveller x destination, the date range they
 * are there (clipped to the destination's dates), or nothing when the ranges
 * don't overlap. Overrides win over derivation.
 */
export function derivePresence(
  travellers: TravellerLike[],
  destinations: DestinationLike[],
  segments: SegmentLike[],
  overrides: OverrideLike[],
  trip: { tripStart: string; tripEnd: string }
): PresenceEntry[] {
  const entries: PresenceEntry[] = [];

  const overrideKey = (t: string, d: string) => `${t}:${d}`;
  const overrideMap = new Map<string, OverrideLike>();
  for (const o of overrides) overrideMap.set(overrideKey(o.travellerId, o.destinationId), o);

  for (const traveller of travellers) {
    const inbound = segments.find(
      (s) => s.travellerId === traveller._id && s.direction === "inbound"
    );
    const outbound = segments.find(
      (s) => s.travellerId === traveller._id && s.direction === "outbound"
    );
    const range = travellerRange({
      tripStart: trip.tripStart,
      tripEnd: trip.tripEnd,
      inboundArrival: inbound?.arrivalDate,
      outboundFlight: outbound?.flightDate,
    });

    for (const dest of destinations) {
      const override = overrideMap.get(overrideKey(traveller._id, dest._id));
      if (override) {
        entries.push({
          travellerId: traveller._id,
          destinationId: dest._id,
          startDate: override.startDate,
          endDate: override.endDate,
          isOverride: true,
        });
        continue;
      }
      // Derived: intersection of traveller range and destination range.
      const start = range.start > dest.startDate ? range.start : dest.startDate;
      const end = range.end < dest.endDate ? range.end : dest.endDate;
      if (start <= end) {
        entries.push({
          travellerId: traveller._id,
          destinationId: dest._id,
          startDate: start,
          endDate: end,
          isOverride: false,
        });
      }
    }
  }
  return entries;
}
