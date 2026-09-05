"use client";

// Split view: left table + horizontally scrolling date grid, Monday-style.
// A single scroll container owns BOTH axes; the left panel is sticky-left and
// the grid headers sticky-top, which gives lock-step scrolling without any
// JS scroll syncing.
//
// Mobile (<768px): the left table collapses into a bottom sheet, and bar
// editing is tap-to-open-a-form instead of drag.
import { useCallback, useMemo, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { AttentionBox, Button, ButtonGroup, Loader } from "@vibe/core";
import { api } from "@/convex/_generated/api";
import LeftPanel from "@/components/leftpanel/LeftPanel";
import { detectClashes } from "@/lib/clashes";
import { useIsMobile } from "@/lib/useIsMobile";
import BarEditModal from "./BarEditModal";
import TimelineGrid, { HEADER_HEIGHT } from "./TimelineGrid";
import TimelineBars from "./TimelineBars";
import { buildRows } from "./rowModel";
import { ZoomLevel, buildRange } from "./timelineMath";

const PANEL_MIN = 240;
const PANEL_MAX = 560;
const PANEL_DEFAULT = 380;

interface TimelineViewProps {
  /** Read-only share mode: no editing affordances at all. */
  readOnly?: boolean;
}

export default function TimelineView({ readOnly = false }: TimelineViewProps) {
  const settings = useQuery(api.trip.getSettings);
  const destinations = useQuery(api.trip.listDestinations);
  const travellers = useQuery(api.trip.listTravellers);
  const presence = useQuery(api.trip.listPresence);
  const vibes = useQuery(api.trip.listVibes);
  const segments = useQuery(api.trip.listTravelSegments);

  const isMobile = useIsMobile();
  const [zoom, setZoom] = useState<ZoomLevel>("day");
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const [panelWidth, setPanelWidth] = useState(PANEL_DEFAULT);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const dragState = useRef<{ startX: number; startWidth: number } | null>(null);

  const toggleGroup = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Panel resize: pointer-drag on the divider (desktop only).
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

  const range = settings
    ? buildRange(settings.tripStart, settings.tripEnd, settings.bufferDays)
    : null;

  const clashes = useMemo(
    () =>
      destinations && travellers && segments && range
        ? detectClashes(destinations, travellers, segments, range)
        : [],
    [destinations, travellers, segments, range]
  );

  if (!settings || !destinations || !travellers || !presence || !vibes || !range) {
    return (
      <div className="flex items-center justify-center flex-1 py-24">
        <Loader size="medium" />
      </div>
    );
  }

  const departureWindowStart = destinations.find(
    (d) => d.kind === "transit" && d.isDepartureWindow
  )?.startDate;
  const editingDest = destinations.find((d) => d._id === editingId) ?? null;

  return (
    <section className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center gap-2 px-4 py-2">
        {isMobile && !readOnly && (
          <Button size="small" kind="secondary" onClick={() => setSheetOpen(true)}>
            List
          </Button>
        )}
        <div className="ml-auto">
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
      </div>

      {clashes.length > 0 && !readOnly && (
        <div className="px-4 pb-2 flex flex-col gap-1">
          {clashes.map((c) => (
            <AttentionBox key={c.id} type="warning" compact text={c.message} />
          ))}
        </div>
      )}

      <div
        className="flex-1 overflow-auto min-h-0 relative"
        style={{
          background: "var(--primary-background-color)",
          borderTop: "var(--border-width) var(--border-style) var(--layout-border-color)",
        }}
      >
        <div className="flex w-max min-w-full items-stretch">
          {!isMobile && (
            <>
              <LeftPanel
                rows={rows}
                vibes={vibes}
                width={panelWidth}
                onToggleGroup={toggleGroup}
                headerHeight={HEADER_HEIGHT}
              />
              <div
                className="shrink-0 cursor-col-resize sticky z-5"
                style={{ width: "5px", left: panelWidth, marginLeft: "-5px" }}
                onPointerDown={onDividerPointerDown}
                role="separator"
                aria-orientation="vertical"
              />
            </>
          )}
          <div className="flex-1 min-w-0">
            <TimelineGrid range={range} zoom={zoom}>
              <TimelineBars
                rows={rows}
                range={range}
                zoom={zoom}
                departureWindowStart={departureWindowStart}
                readOnly={readOnly}
                dragEnabled={!isMobile}
                onBarClick={readOnly ? undefined : (id) => setEditingId(id)}
              />
            </TimelineGrid>
          </div>
        </div>
      </div>

      {/* Mobile bottom sheet with the destination list. */}
      {isMobile && sheetOpen && !readOnly && (
        <div className="fixed inset-0 z-40" onClick={() => setSheetOpen(false)}>
          <div className="absolute inset-0" style={{ background: "var(--backdrop-color)" }} />
          <div
            className="absolute inset-x-0 bottom-0 overflow-y-auto"
            style={{
              maxHeight: "70vh",
              background: "var(--primary-background-color)",
              borderRadius: "var(--border-radius-big) var(--border-radius-big) 0 0",
              boxShadow: "var(--box-shadow-large)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center py-2">
              <div
                style={{
                  width: 36,
                  height: 4,
                  borderRadius: 2,
                  background: "var(--ui-border-color)",
                }}
              />
            </div>
            <LeftPanel
              rows={rows}
              vibes={vibes}
              width={typeof window !== "undefined" ? window.innerWidth : 360}
              onToggleGroup={toggleGroup}
              headerHeight={36}
            />
          </div>
        </div>
      )}

      {!readOnly && <BarEditModal destination={editingDest} onClose={() => setEditingId(null)} />}
    </section>
  );
}
