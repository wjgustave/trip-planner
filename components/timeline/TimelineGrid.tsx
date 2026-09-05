"use client";

// The hand-built Monday-style timeline grid: one CSS Grid column per day.
// Header rows: months on top, weekday initial + day number below.
// Decorations: weekend wash, buffer hatching, red today line.
import { CSSProperties, ReactNode } from "react";
import { Text } from "@vibe/core";
import { PlainDate, dayNumber, toPlain, weekdayInitial } from "@/lib/dates";
import {
  DAY_WIDTH,
  TimelineRange,
  ZoomLevel,
  dayIndex,
  isBufferDay,
  isWeekendDay,
  monthSpans,
  todayInRange,
} from "./timelineMath";
import "./timeline.css";

interface TimelineGridProps {
  range: TimelineRange;
  zoom: ZoomLevel;
  /** Bar rows rendered inside the grid body (steps 4+). */
  children?: ReactNode;
  /** Number of body rows children occupy, to size the day-column backgrounds. */
  bodyRows?: number;
}

export default function TimelineGrid({ range, zoom, children, bodyRows = 0 }: TimelineGridProps) {
  const dayWidth = DAY_WIDTH[zoom];
  const columns: CSSProperties = {
    gridTemplateColumns: `repeat(${range.totalDays}, ${dayWidth}px)`,
  };
  const today = toPlain(new Date());
  const showToday = todayInRange(range, today);
  const todayIdx = showToday ? dayIndex(range, today) : -1;
  const showDayLabels = zoom !== "month";

  return (
    <div className="relative inline-block min-w-full">
      {/* --- Header: months row --- */}
      <div
        className="grid sticky top-0 z-4"
        style={{ ...columns, background: "var(--primary-background-color)" }}
      >
        {monthSpans(range).map((m) => (
          <div
            key={m.key}
            className="timeline-day-col py-1 px-2 sticky left-0"
            style={{
              gridColumn: `${m.gridStart} / ${m.gridEnd}`,
              borderBottom: "var(--border-width) var(--border-style) var(--layout-border-color)",
            }}
          >
            <Text type="text2" weight="medium" color="secondary" ellipsis>
              {m.label}
            </Text>
          </div>
        ))}
      </div>

      {/* --- Header: day numbers row --- */}
      <div
        className="grid sticky z-4"
        style={{
          ...columns,
          top: "26px",
          background: "var(--primary-background-color)",
          borderBottom: "var(--border-width) var(--border-style) var(--layout-border-color)",
        }}
      >
        {range.days.map((d) => (
          <DayHeaderCell key={d} day={d} range={range} showLabels={showDayLabels} />
        ))}
      </div>

      {/* --- Body: day-column backgrounds + bar rows --- */}
      <div className="relative">
        <div
          className="grid absolute inset-0"
          aria-hidden
          style={{ ...columns, minHeight: "100%" }}
        >
          {range.days.map((d) => {
            const weekend = isWeekendDay(d);
            const buffer = isBufferDay(range, d);
            return (
              <div
                key={d}
                className={[
                  "timeline-day-col",
                  weekend ? "timeline-day-weekend" : "",
                  buffer ? "timeline-day-buffer" : "",
                ].join(" ")}
              />
            );
          })}
        </div>

        {/* Bar rows render above the background columns. */}
        <div className="relative z-1" style={{ minHeight: bodyRows === 0 ? "320px" : undefined }}>
          {children}
        </div>

        {/* Today line across the body. */}
        {showToday && (
          <div
            className="timeline-today-line"
            style={{ left: `${todayIdx * dayWidth + dayWidth / 2 - 1}px` }}
          >
            <div className="timeline-today-dot" />
          </div>
        )}
      </div>
    </div>
  );
}

function DayHeaderCell({
  day,
  range,
  showLabels,
}: {
  day: PlainDate;
  range: TimelineRange;
  showLabels: boolean;
}) {
  const buffer = isBufferDay(range, day);
  const weekend = isWeekendDay(day);
  return (
    <div
      className={[
        "timeline-day-col flex flex-col items-center py-1 select-none",
        weekend ? "timeline-day-weekend" : "",
        buffer ? "timeline-header-buffer" : "",
      ].join(" ")}
    >
      {showLabels && (
        <>
          <span
            style={{
              font: "var(--font-text3-normal)",
              color: buffer ? "inherit" : "var(--secondary-text-color)",
            }}
          >
            {weekdayInitial(day)}
          </span>
          <span
            style={{
              font: "var(--font-text2-medium)",
              color: buffer ? "inherit" : "var(--primary-text-color)",
            }}
          >
            {dayNumber(day)}
          </span>
        </>
      )}
    </div>
  );
}
