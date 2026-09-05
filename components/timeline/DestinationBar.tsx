"use client";

// A single destination bar: solid Vibe colour, 4px radius, white semibold
// label, avatar stack overlaid on the right end. Departure-window bars get a
// gradient-faded tail instead of a hard stop.
import { CSSProperties } from "react";
import { Avatar, AvatarGroup } from "@vibe/core";
import { vibeColorVar } from "@/lib/colors";
import { shortDate } from "@/lib/dates";
import { TimelineRange, ZoomLevel, DAY_WIDTH, daysWide, gridColumnForSpan } from "./timelineMath";

export interface BarTraveller {
  _id: string;
  name: string;
  initials: string;
  avatarColor: string;
  avatarUrl?: string;
  /** Their dates at this destination, for the hover tooltip. */
  startDate: string;
  endDate: string;
}

export interface DestinationBarData {
  _id: string;
  name: string;
  colorToken: string;
  startDate: string;
  endDate: string;
  kind: "place" | "transit" | "buffer";
  isDepartureWindow?: boolean;
  /** Where the uncertain tail starts (only for departure-window bars). */
  fadeFromDate?: string;
}

interface DestinationBarProps {
  destination: DestinationBarData;
  travellers: BarTraveller[];
  range: TimelineRange;
  zoom: ZoomLevel;
  row: number; // 1-based grid row
  onClick?: () => void;
}

export default function DestinationBar({
  destination,
  travellers,
  range,
  zoom,
  row,
  onClick,
}: DestinationBarProps) {
  const { start, end } = gridColumnForSpan(range, destination.startDate, destination.endDate);
  const color = vibeColorVar(destination.colorToken);
  const dayWidth = DAY_WIDTH[zoom];

  // Departure window: fade the tail from fadeFromDate to the end of the bar.
  // The mask is measured from the bar's own left edge in px.
  let mask: string | undefined;
  if (destination.isDepartureWindow && destination.fadeFromDate) {
    const solidDays = daysWide(destination.startDate, destination.fadeFromDate) - 1;
    const totalDays = daysWide(destination.startDate, destination.endDate);
    const solidPx = solidDays * dayWidth;
    const totalPx = totalDays * dayWidth;
    mask = `linear-gradient(to right, black 0, black ${solidPx}px, rgba(0,0,0,0.45) ${
      (solidPx + totalPx) / 2
    }px, rgba(0,0,0,0.08) ${totalPx}px)`;
  }

  const barStyle: CSSProperties = {
    gridColumn: `${start} / ${end}`,
    gridRow: row,
    background: color,
    borderRadius: "var(--border-radius-small)",
    WebkitMaskImage: mask,
    maskImage: mask,
  };

  // Fit the avatar stack to the bar: wide bars show up to 4 + counter,
  // narrow bars show fewer, and very narrow bars drop the stack entirely.
  const barDays = daysWide(destination.startDate, destination.endDate);
  const maxAvatars = barDays >= 10 ? 4 : barDays >= 7 ? 3 : barDays >= 5 ? 2 : 0;
  const showAvatars = zoom === "day" && travellers.length > 0 && maxAvatars > 0;
  const showLabel = zoom !== "month";

  return (
    <div
      className="timeline-bar flex items-center gap-2 px-2 my-1 min-w-0"
      style={barStyle}
      onClick={onClick}
      data-destination-id={destination._id}
    >
      {showLabel && (
        <span
          className="truncate"
          style={{
            font: "var(--font-text2-medium)",
            fontWeight: 600,
            color: "var(--text-color-on-primary)",
          }}
        >
          {destination.name}
        </span>
      )}
      {showAvatars && (
        <div className="ml-auto flex items-center shrink-0 timeline-bar-avatars">
          <AvatarGroup size="small" max={maxAvatars}>
            {travellers.map((t) => (
              <Avatar
                key={t._id}
                type={t.avatarUrl ? "img" : "text"}
                src={t.avatarUrl}
                text={t.initials}
                backgroundColor={t.avatarColor as never}
                aria-label={t.name}
                tooltipProps={{
                  content: `${t.name} — ${shortDate(t.startDate)} to ${shortDate(t.endDate)}`,
                }}
              />
            ))}
          </AvatarGroup>
        </div>
      )}
    </div>
  );
}
