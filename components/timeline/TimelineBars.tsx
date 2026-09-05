"use client";

// The bar rows layer: same grid template as the day columns. Renders from the
// shared row model — destination bars plus, for expanded groups, a thin
// presence sub-bar per traveller (their personal dates at that stop).
//
// Editing: drops commit through an optimistic Convex mutation so the bar
// lands instantly and reconciles with the server after. The PIN dialog
// intercepts the first admin action of a session.
import { useCallback } from "react";
import { useMutation } from "convex/react";
import { Avatar } from "@vibe/core";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useElevation } from "@/components/identity/ElevationProvider";
import { useIdentity } from "@/components/identity/IdentityProvider";
import { vibeColorSelectedVar, vibeColorVar } from "@/lib/colors";
import DestinationBar from "./DestinationBar";
import { ROW_HEIGHT, Row } from "./rowModel";
import { DAY_WIDTH, TimelineRange, ZoomLevel, gridColumnForSpan } from "./timelineMath";

interface TimelineBarsProps {
  rows: Row[];
  range: TimelineRange;
  zoom: ZoomLevel;
  /** Departure-window start (the fading tail) — from the transit window bar. */
  departureWindowStart?: string;
  onBarClick?: (destinationId: string) => void;
}

export default function TimelineBars({
  rows,
  range,
  zoom,
  departureWindowStart,
  onBarClick,
}: TimelineBarsProps) {
  const { traveller, sessionToken } = useIdentity();
  const { ensureElevated } = useElevation();
  const canEdit = traveller != null && traveller.role !== "contributor";

  const updateDates = useMutation(api.destinations.updateDates).withOptimisticUpdate(
    (localStore, args) => {
      const current = localStore.getQuery(api.trip.listDestinations, {});
      if (current) {
        localStore.setQuery(
          api.trip.listDestinations,
          {},
          current.map((d) =>
            d._id === args.destinationId
              ? { ...d, startDate: args.startDate, endDate: args.endDate }
              : d
          )
        );
      }
    }
  );

  const commitDates = useCallback(
    async (destinationId: string, startDate: string, endDate: string) => {
      if (!sessionToken) return;
      const ok = await ensureElevated();
      if (!ok) return; // PIN cancelled — bar snaps back untouched.
      try {
        await updateDates({
          sessionToken,
          destinationId: destinationId as Id<"destinations">,
          startDate,
          endDate,
        });
      } catch {
        // Server rejected (permissions/validation) — reactive query reverts the bar.
      }
    },
    [sessionToken, ensureElevated, updateDates]
  );
  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: `repeat(${range.totalDays}, ${DAY_WIDTH[zoom]}px)`,
        gridAutoRows: `${ROW_HEIGHT}px`,
        paddingTop: "var(--space-8)",
        paddingBottom: "var(--space-8)",
      }}
    >
      {rows.map((row, i) =>
        row.type === "destination" ? (
          <DestinationBar
            key={row.destination._id}
            destination={{
              ...row.destination,
              fadeFromDate:
                row.destination.isDepartureWindow && row.destination.kind === "place"
                  ? departureWindowStart
                  : row.destination.isDepartureWindow
                    ? row.destination.startDate
                    : undefined,
            }}
            travellers={row.present}
            range={range}
            zoom={zoom}
            row={i + 1}
            editable={canEdit && zoom === "day"}
            onCommitDates={(startDate, endDate) =>
              void commitDates(row.destination._id, startDate, endDate)
            }
            onClick={onBarClick ? () => onBarClick(row.destination._id) : undefined}
          />
        ) : (
          <TravellerSubBar key={`${row.destination._id}:${row.traveller._id}`} row={row} range={range} zoom={zoom} gridRow={i + 1} />
        )
      )}
    </div>
  );
}

function TravellerSubBar({
  row,
  range,
  zoom,
  gridRow,
}: {
  row: Extract<Row, { type: "traveller" }>;
  range: TimelineRange;
  zoom: ZoomLevel;
  gridRow: number;
}) {
  const { start, end } = gridColumnForSpan(range, row.startDate, row.endDate);
  return (
    <div
      className="flex items-center gap-1 px-1 self-center min-w-0"
      style={{
        gridColumn: `${start} / ${end}`,
        gridRow,
        height: "28px",
        background: vibeColorSelectedVar(row.destination.colorToken),
        border: `var(--border-width) var(--border-style) ${vibeColorVar(row.destination.colorToken)}`,
        borderRadius: "var(--border-radius-small)",
      }}
    >
      {zoom === "day" && (
        <>
          <Avatar
            type={row.traveller.avatarUrl ? "img" : "text"}
            src={row.traveller.avatarUrl}
            text={row.traveller.initials}
            backgroundColor={row.traveller.avatarColor as never}
            size="xs"
            aria-label={row.traveller.name}
          />
          <span
            className="truncate"
            style={{ font: "var(--font-text3-medium)", color: "var(--primary-text-color)" }}
          >
            {row.traveller.name}
          </span>
        </>
      )}
    </div>
  );
}
