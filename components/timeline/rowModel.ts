// Shared row model for the split view.
//
// The left table and the timeline body render from the SAME ordered list of
// rows, so they stay perfectly aligned and scroll in lock-step. Each
// destination contributes a group row (its bar) and, when expanded, one
// sub-row per traveller present there (their personal dates at that stop).

export const ROW_HEIGHT = 44;

export interface TravellerInfo {
  _id: string;
  name: string;
  initials: string;
  avatarColor: string;
  avatarUrl?: string;
  role: string;
  order: number;
}

export interface DestinationInfo {
  _id: string;
  name: string;
  colorToken: string;
  startDate: string;
  endDate: string;
  order: number;
  kind: "place" | "transit" | "buffer";
  isDepartureWindow?: boolean;
}

export interface PresenceInfo {
  travellerId: string;
  destinationId: string;
  startDate: string;
  endDate: string;
  isOverride: boolean;
}

export type Row =
  | {
      type: "destination";
      destination: DestinationInfo;
      /** Travellers present, with their dates, for the avatar stack. */
      present: (TravellerInfo & { startDate: string; endDate: string; isOverride: boolean })[];
      expanded: boolean;
    }
  | {
      type: "traveller";
      destination: DestinationInfo;
      traveller: TravellerInfo;
      startDate: string;
      endDate: string;
      isOverride: boolean;
    };

export function buildRows(
  destinations: DestinationInfo[],
  travellers: TravellerInfo[],
  presence: PresenceInfo[],
  expandedIds: ReadonlySet<string>
): Row[] {
  const travellerById = new Map(travellers.map((t) => [t._id, t]));
  const rows: Row[] = [];

  for (const dest of destinations) {
    const present = presence
      .filter((p) => p.destinationId === dest._id)
      .map((p) => {
        const t = travellerById.get(p.travellerId);
        if (!t) return null;
        return { ...t, startDate: p.startDate, endDate: p.endDate, isOverride: p.isOverride };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => a.order - b.order);

    const expanded = expandedIds.has(dest._id);
    rows.push({ type: "destination", destination: dest, present, expanded });
    if (expanded) {
      for (const t of present) {
        rows.push({
          type: "traveller",
          destination: dest,
          traveller: t,
          startDate: t.startDate,
          endDate: t.endDate,
          isOverride: t.isOverride,
        });
      }
    }
  }
  return rows;
}
