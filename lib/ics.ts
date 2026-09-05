// .ics export — all-day events for destinations plus each traveller's flights.
// Dates are plain calendar dates; DTEND is exclusive per RFC 5545.
import { PlainDate, addDays } from "./dates";

function icsDate(d: PlainDate): string {
  return d.replaceAll("-", "");
}

function esc(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

interface DestLike {
  name: string;
  startDate: PlainDate;
  endDate: PlainDate;
  kind: string;
}

interface SegmentLike {
  travellerName: string;
  direction: "inbound" | "outbound";
  flightDate: PlainDate;
  airport?: string;
  flightNumber?: string;
}

export function buildIcs(destinations: DestLike[], segments: SegmentLike[]): string {
  const now = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Thailand 2027//Trip Planner//EN",
    "CALSCALE:GREGORIAN",
  ];

  let uid = 0;
  for (const dest of destinations) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:thailand2027-dest-${uid++}@trip-planner`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${icsDate(dest.startDate)}`,
      `DTEND;VALUE=DATE:${icsDate(addDays(dest.endDate, 1))}`,
      `SUMMARY:${esc(`Thailand: ${dest.name}`)}`,
      "END:VEVENT"
    );
  }
  for (const seg of segments) {
    const what = seg.direction === "inbound" ? "flight out" : "flight home";
    const detail = [seg.flightNumber, seg.airport].filter(Boolean).join(" from ");
    lines.push(
      "BEGIN:VEVENT",
      `UID:thailand2027-seg-${uid++}@trip-planner`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${icsDate(seg.flightDate)}`,
      `DTEND;VALUE=DATE:${icsDate(addDays(seg.flightDate, 1))}`,
      `SUMMARY:${esc(`${seg.travellerName} ${what}${detail ? ` (${detail})` : ""}`)}`,
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadIcs(content: string, filename = "thailand-2027.ics"): void {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
