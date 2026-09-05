// ---------------------------------------------------------------------------
// Timeline grid maths
// ---------------------------------------------------------------------------
// The timeline is a plain CSS Grid: ONE COLUMN PER DAY, one row per bar.
// Everything is positioned by day index, where index 0 is the first rendered
// (buffer) day. All conversions between dates and columns live here so the
// components never do their own arithmetic.
//
//   rangeStart = tripStart - bufferDays      (e.g. 2027-04-06)
//   rangeEnd   = tripEnd   + bufferDays      (e.g. 2027-05-05)
//   totalDays  = daysBetween(rangeStart, rangeEnd) + 1   (inclusive, 30 days)
//
// A destination spanning startDate..endDate is drawn from the column of its
// startDate through the column of its endDate INCLUSIVE. Because overlap days
// are shared (the 16th is both last Samui day and first Phangan travel day),
// consecutive bars deliberately share their boundary column — they abut and
// overlap by one day rather than leaving a gap.
//
// CSS grid-column is 1-based and `grid-column: a / b` is exclusive of b, so:
//   gridColumnStart = dayIndex(startDate) + 1
//   gridColumnEnd   = dayIndex(endDate) + 2    (one past the inclusive end)
// ---------------------------------------------------------------------------

import { addDays, daysBetween, eachDay, isWeekend, isWithin, monthKey, monthLabel, PlainDate } from "@/lib/dates";

export type ZoomLevel = "day" | "week" | "month";

/** Day-column width in px for each zoom level ("~36px, zoomable"). */
export const DAY_WIDTH: Record<ZoomLevel, number> = {
  day: 36,
  week: 20,
  month: 10,
};

export interface TimelineRange {
  /** First rendered day (start of leading buffer). */
  rangeStart: PlainDate;
  /** Last rendered day (end of trailing buffer). */
  rangeEnd: PlainDate;
  /** Core trip window (buffer excluded). */
  tripStart: PlainDate;
  tripEnd: PlainDate;
  /** Every rendered day, in order. Index in this array == column index. */
  days: PlainDate[];
  totalDays: number;
}

export function buildRange(tripStart: PlainDate, tripEnd: PlainDate, bufferDays: number): TimelineRange {
  const rangeStart = addDays(tripStart, -bufferDays);
  const rangeEnd = addDays(tripEnd, bufferDays);
  const days = eachDay(rangeStart, rangeEnd);
  return { rangeStart, rangeEnd, tripStart, tripEnd, days, totalDays: days.length };
}

/** 0-based column index of a date; clamped into the rendered range. */
export function dayIndex(range: TimelineRange, d: PlainDate): number {
  const i = daysBetween(range.rangeStart, d);
  return Math.max(0, Math.min(range.totalDays - 1, i));
}

/** Inverse of dayIndex — the date at a 0-based column index (clamped). */
export function dateAtIndex(range: TimelineRange, index: number): PlainDate {
  const i = Math.max(0, Math.min(range.totalDays - 1, Math.round(index)));
  return addDays(range.rangeStart, i);
}

/**
 * CSS grid-column line numbers for an INCLUSIVE date span.
 * grid lines are 1-based; the end line is one past the last included column.
 */
export function gridColumnForSpan(
  range: TimelineRange,
  startDate: PlainDate,
  endDate: PlainDate
): { start: number; end: number } {
  return {
    start: dayIndex(range, startDate) + 1,
    end: dayIndex(range, endDate) + 2,
  };
}

/** True when the day is in the leading or trailing buffer. */
export function isBufferDay(range: TimelineRange, d: PlainDate): boolean {
  return d < range.tripStart || d > range.tripEnd;
}

export function isWeekendDay(d: PlainDate): boolean {
  return isWeekend(d);
}

/** True when today falls inside the rendered range (drives the today line). */
export function todayInRange(range: TimelineRange, today: PlainDate): boolean {
  return isWithin(today, range.rangeStart, range.rangeEnd);
}

export interface MonthSpan {
  key: string;
  label: string;
  /** CSS grid-column line numbers for the month header cell. */
  gridStart: number;
  gridEnd: number;
}

/** Group the rendered days into contiguous month spans for the header row. */
export function monthSpans(range: TimelineRange): MonthSpan[] {
  const spans: MonthSpan[] = [];
  for (let i = 0; i < range.days.length; i++) {
    const d = range.days[i];
    const key = monthKey(d);
    const last = spans[spans.length - 1];
    if (last && last.key === key) {
      last.gridEnd = i + 2;
    } else {
      spans.push({ key, label: monthLabel(d), gridStart: i + 1, gridEnd: i + 2 });
    }
  }
  return spans;
}
