// All trip dates are plain calendar dates stored as "YYYY-MM-DD" strings.
// They are parsed into local Date objects only for date-fns arithmetic and
// immediately formatted back — never into timestamps — so there is no
// timezone drift between the UK and Thailand.
import {
  addDays as dfAddDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  format,
  isWeekend as dfIsWeekend,
  parseISO,
} from "date-fns";

export type PlainDate = string; // "YYYY-MM-DD"

export function toDate(d: PlainDate): Date {
  return parseISO(d);
}

export function toPlain(d: Date): PlainDate {
  return format(d, "yyyy-MM-dd");
}

export function addDays(d: PlainDate, n: number): PlainDate {
  return toPlain(dfAddDays(toDate(d), n));
}

/** Days from a to b (b - a) in whole calendar days. */
export function daysBetween(a: PlainDate, b: PlainDate): number {
  return differenceInCalendarDays(toDate(b), toDate(a));
}

/** Inclusive list of every day in [start, end]. */
export function eachDay(start: PlainDate, end: PlainDate): PlainDate[] {
  return eachDayOfInterval({ start: toDate(start), end: toDate(end) }).map(toPlain);
}

export function isWeekend(d: PlainDate): boolean {
  return dfIsWeekend(toDate(d));
}

export function dayNumber(d: PlainDate): string {
  return format(toDate(d), "d");
}

export function weekdayInitial(d: PlainDate): string {
  return format(toDate(d), "EEEEE");
}

export function monthLabel(d: PlainDate): string {
  return format(toDate(d), "MMMM yyyy");
}

export function monthKey(d: PlainDate): string {
  return format(toDate(d), "yyyy-MM");
}

export function shortDate(d: PlainDate): string {
  return format(toDate(d), "d MMM");
}

export function longDate(d: PlainDate): string {
  return format(toDate(d), "EEE d MMM yyyy");
}

/** True when a <= d <= b. Works because ISO strings sort lexicographically. */
export function isWithin(d: PlainDate, a: PlainDate, b: PlainDate): boolean {
  return d >= a && d <= b;
}

/** True when ranges [aStart, aEnd] and [bStart, bEnd] overlap at all. */
export function rangesOverlap(
  aStart: PlainDate,
  aEnd: PlainDate,
  bStart: PlainDate,
  bEnd: PlainDate
): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}
