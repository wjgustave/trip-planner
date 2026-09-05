"use client";

// Split view: left table + horizontally scrolling date grid, Monday-style.
// A single scroll container owns BOTH axes; the left panel is sticky-left and
// the grid headers sticky-top, which gives lock-step scrolling without any
// JS scroll syncing.
import { useCallback, useMemo, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { ButtonGroup, Loader } from "@vibe/core";
import { api } from "@/convex/_generated/api";
import LeftPanel from "@/components/leftpanel/LeftPanel";
import TimelineGrid, { HEADER_HEIGHT } from "./TimelineGrid";
import TimelineBars from "./TimelineBars";
import { buildRows } from "./rowModel";
import { ZoomLevel, buildRange } from "./timelineMath";

const PANEL_MIN = 240;
const PANEL_MAX = 560;
const PANEL_DEFAULT = 380;

export default function TimelineView() {
  const settings = useQuery(api.trip.getSettings);
  const destinations = useQuery(api.trip.listDestinations);
  const travellers = useQuery(api.trip.listTravellers);
  const presence = useQuery(api.trip.listPresence);
  const vibes = useQuery(api.trip.listVibes);

  const [zoom, setZoom] = useState<ZoomLevel>("day");
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const [panelWidth, setPanelWidth] = useState(PANEL_DEFAULT);
  const dragState = useRef<{ startX: number; startWidth: number } | null>(null);

  const toggleGroup = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Panel resize: pointer-drag on the divider.
  const onDividerPointerDown = useCallback(
    (e: React.PointerEvent) => {
      dragState.current = { startX: e.clientX, startWidth: panelWidth };
      const onMove = (ev: PointerEvent) => {
        if (!dragState.current) return;
        const delta = ev.clientX - dragState.current.startX;
        setPanelWidth(
          Math.min(PANEL_MAX, Math.max(PANEL_MIN, dragState.current.startWidth + delta))
        );
      };
      const onUp = () => {
        dragState.current = null;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [panelWidth]
  );

  const rows = useMemo(
    () =>
      destinations && travellers && presence
        ? buildRows(destinations, travellers, presence, expanded)
        : [],
    [destinations, travellers, presence, expanded]
  );

  if (!settings || !destinations || !travellers || !presence || !vibes) {
    return (
      <div className="flex items-center justify-center flex-1 py-24">
        <Loader size="medium" />
      </div>
    );
  }

  const range = buildRange(settings.tripStart, settings.tripEnd, settings.bufferDays);
  const departureWindowStart = destinations.find(
    (d) => d.kind === "transit" && d.isDepartureWindow
  )?.startDate;

  return (
    <section className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center justify-end gap-2 px-4 py-2">
        <ButtonGroup
          size="small"
          value={zoom}
          onSelect={(value) => setZoom(value as ZoomLevel)}
          options={[
            { value: "day", text: "Day" },
            { value: "week", text: "Week" },
            { value: "month", text: "Month" },
          ]}
        />
      </div>

      <div
        className="flex-1 overflow-auto min-h-0 relative"
        style={{
          background: "var(--primary-background-color)",
          borderTop: "var(--border-width) var(--border-style) var(--layout-border-color)",
        }}
      >
        <div className="flex w-max min-w-full items-stretch">
          <LeftPanel
            rows={rows}
            vibes={vibes}
            width={panelWidth}
            onToggleGroup={toggleGroup}
            headerHeight={HEADER_HEIGHT}
          />
          {/* Resize divider. */}
          <div
            className="shrink-0 cursor-col-resize sticky z-5"
            style={{ width: "5px", left: panelWidth, marginLeft: "-5px" }}
            onPointerDown={onDividerPointerDown}
            role="separator"
            aria-orientation="vertical"
          />
          <div className="flex-1 min-w-0">
            <TimelineGrid range={range} zoom={zoom}>
              <TimelineBars
                rows={rows}
                range={range}
                zoom={zoom}
                departureWindowStart={departureWindowStart}
              />
            </TimelineGrid>
          </div>
        </div>
      </div>
    </section>
  );
}
