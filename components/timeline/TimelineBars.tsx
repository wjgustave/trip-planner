"use client";

// The bar rows layer: same grid template as the day columns, one row per
// destination, ordered as in the left panel.
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import DestinationBar, { BarTraveller } from "./DestinationBar";
import { DAY_WIDTH, TimelineRange, ZoomLevel } from "./timelineMath";

export const BAR_ROW_HEIGHT = 44;

interface TimelineBarsProps {
  range: TimelineRange;
  zoom: ZoomLevel;
  onBarClick?: (destinationId: string) => void;
}

export default function TimelineBars({ range, zoom, onBarClick }: TimelineBarsProps) {
  const destinations = useQuery(api.trip.listDestinations) ?? [];
  const travellers = useQuery(api.trip.listTravellers) ?? [];
  const presence = useQuery(api.trip.listPresence) ?? [];

  // The departure window (the fading tail on Phuket) starts where the
  // departure-window transit bar starts — people leave somewhere in there.
  const transitWindow = destinations.find((d) => d.kind === "transit" && d.isDepartureWindow);

  const travellersByDestination = new Map<string, BarTraveller[]>();
  for (const entry of presence) {
    const traveller = travellers.find((t) => t._id === entry.travellerId);
    if (!traveller) continue;
    const list = travellersByDestination.get(entry.destinationId) ?? [];
    list.push({
      _id: traveller._id,
      name: traveller.name,
      initials: traveller.initials,
      avatarColor: traveller.avatarColor,
      avatarUrl: traveller.avatarUrl,
      startDate: entry.startDate,
      endDate: entry.endDate,
    });
    travellersByDestination.set(entry.destinationId, list);
  }

  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: `repeat(${range.totalDays}, ${DAY_WIDTH[zoom]}px)`,
        gridAutoRows: `${BAR_ROW_HEIGHT}px`,
        paddingTop: "var(--space-8)",
        paddingBottom: "var(--space-8)",
      }}
    >
      {destinations.map((dest, i) => (
        <DestinationBar
          key={dest._id}
          destination={{
            ...dest,
            fadeFromDate:
              dest.isDepartureWindow && dest.kind === "place"
                ? transitWindow?.startDate ?? undefined
                : dest.isDepartureWindow
                  ? dest.startDate
                  : undefined,
          }}
          travellers={travellersByDestination.get(dest._id) ?? []}
          range={range}
          zoom={zoom}
          row={i + 1}
          onClick={onBarClick ? () => onBarClick(dest._id) : undefined}
        />
      ))}
    </div>
  );
}
