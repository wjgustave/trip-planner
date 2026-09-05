"use client";

// A single destination bar: solid Vibe colour, 4px radius, white semibold
// label, avatar stack overlaid on the right end. Departure-window bars get a
// gradient-faded tail instead of a hard stop.
//
// Editing (Admin+): drag the body to move, grab either end to resize. While
// dragging, the original bar dims and a dashed ghost previews the target
// position, snapping to whole days (deltaPx -> round(delta / dayWidth)).
import { CSSProperties, useCallback, useRef, useState } from "react";
import { Avatar, AvatarGroup } from "@vibe/core";
import { vibeColorSelectedVar, vibeColorVar } from "@/lib/colors";
import { addDays, shortDate } from "@/lib/dates";
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

type DragMode = "move" | "resize-left" | "resize-right";

interface DragState {
  mode: DragMode;
  originX: number;
  deltaDays: number;
  moved: boolean;
}

interface DestinationBarProps {
  destination: DestinationBarData;
  travellers: BarTraveller[];
  range: TimelineRange;
  zoom: ZoomLevel;
  row: number; // 1-based grid row
  /** Admin+ only — enables drag/resize. */
  editable?: boolean;
  /** Called on drop with the snapped new dates. */
  onCommitDates?: (startDate: string, endDate: string) => void;
  onClick?: () => void;
}

export default function DestinationBar({
  destination,
  travellers,
  range,
  zoom,
  row,
  editable = false,
  onCommitDates,
  onClick,
}: DestinationBarProps) {
  const dayWidth = DAY_WIDTH[zoom];
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);

  // Ghost dates for the current drag delta, clamped to the rendered range
  // and to a minimum width of one day.
  const ghostDates = useCallback(
    (d: DragState): { start: string; end: string } => {
      let start = destination.startDate;
      let end = destination.endDate;
      if (d.mode === "move") {
        start = addDays(start, d.deltaDays);
        end = addDays(end, d.deltaDays);
      } else if (d.mode === "resize-left") {
        start = addDays(start, d.deltaDays);
        if (start > end) start = end;
      } else {
        end = addDays(end, d.deltaDays);
        if (end < start) end = start;
      }
      // Clamp into the rendered range, preserving bar length on move.
      if (start < range.rangeStart) {
        if (d.mode === "move") end = addDays(end, daysWide(start, range.rangeStart) - 1);
        start = range.rangeStart;
      }
      if (end > range.rangeEnd) {
        if (d.mode === "move") start = addDays(start, -(daysWide(range.rangeEnd, end) - 1));
        end = range.rangeEnd;
      }
      return { start, end };
    },
    [destination.startDate, destination.endDate, range]
  );

  const beginDrag = useCallback(
    (mode: DragMode) => (e: React.PointerEvent) => {
      if (!editable || !onCommitDates) return;
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      const state: DragState = { mode, originX: e.clientX, deltaDays: 0, moved: false };
      dragRef.current = state;
      setDrag(state);
    },
    [editable, onCommitDates]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const current = dragRef.current;
      if (!current) return;
      const deltaDays = Math.round((e.clientX - current.originX) / dayWidth);
      const moved = current.moved || Math.abs(e.clientX - current.originX) > 3;
      if (deltaDays !== current.deltaDays || moved !== current.moved) {
        const next = { ...current, deltaDays, moved };
        dragRef.current = next;
        setDrag(next);
      }
    },
    [dayWidth]
  );

  const onPointerUp = useCallback(() => {
    const current = dragRef.current;
    dragRef.current = null;
    setDrag(null);
    if (!current) return;
    if (!current.moved) {
      onClick?.();
      return;
    }
    const { start, end } = ghostDates(current);
    if (start !== destination.startDate || end !== destination.endDate) {
      onCommitDates?.(start, end);
    }
  }, [ghostDates, destination.startDate, destination.endDate, onCommitDates, onClick]);

  const { start, end } = gridColumnForSpan(range, destination.startDate, destination.endDate);
  const color = vibeColorVar(destination.colorToken);

  // Departure window: fade the tail from fadeFromDate to the end of the bar.
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
    opacity: drag?.moved ? 0.45 : undefined,
    cursor: editable ? "grab" : onClick ? "pointer" : undefined,
    touchAction: editable ? "none" : undefined,
  };

  // Fit the avatar stack to the bar: wide bars show up to 4 + counter,
  // narrow bars show fewer, and very narrow bars drop the stack entirely.
  const barDays = daysWide(destination.startDate, destination.endDate);
  const maxAvatars = barDays >= 10 ? 4 : barDays >= 7 ? 3 : barDays >= 5 ? 2 : 0;
  const showAvatars = zoom === "day" && travellers.length > 0 && maxAvatars > 0;
  const showLabel = zoom !== "month";

  // Ghost preview while dragging.
  let ghost: { gridColumn: string } | null = null;
  if (drag?.moved) {
    const g = ghostDates(drag);
    const cols = gridColumnForSpan(range, g.start, g.end);
    ghost = { gridColumn: `${cols.start} / ${cols.end}` };
  }

  return (
    <>
      <div
        className="timeline-bar relative flex items-center gap-2 px-2 my-1 min-w-0"
        style={barStyle}
        onPointerDown={beginDrag("move")}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
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
        {/* Resize handles (Admin+ only). */}
        {editable && (
          <>
            <div
              className="timeline-bar-handle absolute inset-y-0 left-0"
              onPointerDown={beginDrag("resize-left")}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
            />
            <div
              className="timeline-bar-handle absolute inset-y-0 right-0"
              onPointerDown={beginDrag("resize-right")}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
            />
          </>
        )}
      </div>
      {/* Ghost preview: dashed outline at the snapped target position. */}
      {ghost && (
        <div
          className="my-1 pointer-events-none"
          style={{
            gridColumn: ghost.gridColumn,
            gridRow: row,
            background: vibeColorSelectedVar(destination.colorToken),
            border: `2px dashed ${color}`,
            borderRadius: "var(--border-radius-small)",
            opacity: 0.9,
          }}
        />
      )}
    </>
  );
}
