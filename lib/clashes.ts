// Gap and clash detection. These WARN — they never block a write.
import { PlainDate, addDays, daysBetween, longDate, shortDate } from "./dates";

interface Dest {
  _id: string;
  name: string;
  startDate: PlainDate;
  endDate: PlainDate;
  kind: string;
  order: number;
}

interface Traveller {
  _id: string;
  name: string;
}

interface Segment {
  travellerId: string;
  direction: "inbound" | "outbound";
  arrivalDate: PlainDate;
  flightDate: PlainDate;
}

export interface ClashWarning {
  id: string;
  message: string;
}

export function detectClashes(
  destinations: Dest[],
  travellers: Traveller[],
  segments: Segment[],
  range: { rangeStart: PlainDate; rangeEnd: PlainDate }
): ClashWarning[] {
  const warnings: ClashWarning[] = [];
  const sorted = [...destinations].sort((a, b) => a.order - b.order);
  const places = sorted.filter((d) => d.kind === "place");

  // 1. Arrivals landing after the destination they'd join has already ended.
  for (const traveller of travellers) {
    const inbound = segments.find(
      (s) => s.travellerId === traveller._id && s.direction === "inbound"
    );
    if (!inbound) continue;
    const arrival = inbound.arrivalDate;
    // The stop they'd join: the last place that starts on/before their arrival.
    const joining = [...places].reverse().find((d) => d.startDate <= arrival);
    if (joining && arrival > joining.endDate) {
      warnings.push({
        id: `arrival-${traveller._id}`,
        message: `${traveller.name} arrives ${longDate(arrival)} — after ${joining.name} has already ended (${shortDate(joining.endDate)}).`,
      });
    }
  }

  // 2. Unclaimed days between consecutive destinations (a day nobody's anywhere).
  for (let i = 0; i < sorted.length - 1; i++) {
    const prev = sorted[i];
    const next = sorted[i + 1];
    const gap = daysBetween(prev.endDate, next.startDate);
    if (gap >= 2) {
      const firstFree = addDays(prev.endDate, 1);
      const lastFree = addDays(next.startDate, -1);
      warnings.push({
        id: `gap-${prev._id}-${next._id}`,
        message:
          gap === 2
            ? `Unclaimed day between ${prev.name} and ${next.name}: ${longDate(firstFree)}.`
            : `${gap - 1} unclaimed days between ${prev.name} and ${next.name} (${shortDate(firstFree)} – ${shortDate(lastFree)}).`,
      });
    }
  }

  // 3. Bars pushed past the buffer edge.
  for (const dest of sorted) {
    if (dest.startDate < range.rangeStart || dest.endDate > range.rangeEnd) {
      warnings.push({
        id: `buffer-${dest._id}`,
        message: `${dest.name} extends past the buffer window (${shortDate(range.rangeStart)} – ${shortDate(range.rangeEnd)}).`,
      });
    }
  }

  return warnings;
}
