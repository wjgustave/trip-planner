"use client";

// Monday-style left table: destination groups with a coloured left bar,
// collapsible traveller rows, columns for people / dates / vibe mood.
// Rows come from the shared row model so they align 1:1 with timeline rows.
import { Avatar, AvatarGroup, Chips, IconButton, Text } from "@vibe/core";
import { NavigationChevronDown, NavigationChevronRight } from "@vibe/icons";
import { vibeColorVar } from "@/lib/colors";
import { shortDate } from "@/lib/dates";
import { ROW_HEIGHT, Row } from "@/components/timeline/rowModel";

const COL_PEOPLE = 64;
const COL_DATES = 96;
const COL_VIBE = 64;

export const MOOD_COLORS: Record<string, string> = {
  chill: "aquamarine",
  party: "sofia_pink",
  nature: "grass_green",
  culture: "purple",
  food: "working_orange",
  luxury: "berry",
  adventure: "dark-orange",
};

interface VibeNote {
  destinationId: string;
  mood: string;
  pinned: boolean;
}

interface LeftPanelProps {
  rows: Row[];
  vibes: VibeNote[];
  width: number;
  onToggleGroup: (destinationId: string) => void;
  headerHeight: number;
}

export default function LeftPanel({ rows, vibes, width, onToggleGroup, headerHeight }: LeftPanelProps) {
  return (
    <div
      className="shrink-0 sticky left-0 z-5"
      style={{
        width,
        background: "var(--primary-background-color)",
        borderRight: "var(--border-width) var(--border-style) var(--layout-border-color)",
      }}
    >
      {/* Column headings, matching the timeline's two sticky header rows. */}
      <div
        className="flex items-end sticky top-0 z-4 px-3 pb-1"
        style={{
          height: headerHeight,
          background: "var(--primary-background-color)",
          borderBottom: "var(--border-width) var(--border-style) var(--layout-border-color)",
        }}
      >
        <div className="flex w-full gap-2 px-1">
          <div className="flex-1 min-w-0">
            <Text type="text3" color="secondary">Item</Text>
          </div>
          <div className="shrink-0" style={{ width: COL_PEOPLE }}>
            <Text type="text3" color="secondary">People</Text>
          </div>
          <div className="shrink-0" style={{ width: COL_DATES }}>
            <Text type="text3" color="secondary">Dates</Text>
          </div>
          <div className="shrink-0" style={{ width: COL_VIBE }}>
            <Text type="text3" color="secondary">Vibe</Text>
          </div>
        </div>
      </div>

      <div style={{ paddingTop: "var(--space-8)", paddingBottom: "var(--space-8)" }}>
        {rows.map((row) =>
          row.type === "destination" ? (
            <GroupRow
              key={row.destination._id}
              row={row}
              vibes={vibes.filter((v) => v.destinationId === row.destination._id)}
              onToggle={() => onToggleGroup(row.destination._id)}
            />
          ) : (
            <TravellerRow key={`${row.destination._id}:${row.traveller._id}`} row={row} />
          )
        )}
      </div>
    </div>
  );
}

function GroupRow({
  row,
  vibes,
  onToggle,
}: {
  row: Extract<Row, { type: "destination" }>;
  vibes: VibeNote[];
  onToggle: () => void;
}) {
  const dest = row.destination;
  const topVibe = vibes[0];
  return (
    <div
      className="flex items-center gap-1 px-2 cursor-pointer select-none"
      style={{ height: ROW_HEIGHT }}
      onClick={onToggle}
      role="button"
      aria-expanded={row.expanded}
    >
      {/* Coloured group bar, Monday-style. */}
      <div
        className="shrink-0"
        style={{
          width: "var(--space-4)",
          height: "60%",
          borderRadius: "var(--border-radius-small)",
          background: vibeColorVar(dest.colorToken),
        }}
      />
      <IconButton
        icon={row.expanded ? NavigationChevronDown : NavigationChevronRight}
        size="xs"
        kind="tertiary"
        aria-label={row.expanded ? "Collapse group" : "Expand group"}
      />
      <div className="flex-1 min-w-0 flex items-center gap-1">
        <Text type="text2" weight="medium" ellipsis>
          {dest.name}
        </Text>
        <Text type="text3" color="secondary">
          {row.present.length}
        </Text>
      </div>
      <div className="shrink-0 overflow-hidden" style={{ width: COL_PEOPLE }}>
        <AvatarGroup size="xs" max={2}>
          {row.present.map((t) => (
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
      <div className="shrink-0" style={{ width: COL_DATES }}>
        <Text type="text3" color="secondary">
          {shortDate(dest.startDate)} – {shortDate(dest.endDate)}
        </Text>
      </div>
      <div className="shrink-0" style={{ width: COL_VIBE }}>
        {topVibe && (
          <Chips
            label={topVibe.mood}
            color={(MOOD_COLORS[topVibe.mood] ?? "purple") as never}
            readOnly
          />
        )}
      </div>
    </div>
  );
}

function TravellerRow({ row }: { row: Extract<Row, { type: "traveller" }> }) {
  return (
    <div
      className="flex items-center gap-2 px-2"
      style={{
        height: ROW_HEIGHT,
        background: "var(--allgrey-background-color)",
      }}
    >
      <div className="shrink-0" style={{ width: "var(--space-24)" }} />
      <Avatar
        type={row.traveller.avatarUrl ? "img" : "text"}
        src={row.traveller.avatarUrl}
        text={row.traveller.initials}
        backgroundColor={row.traveller.avatarColor as never}
        size="small"
        aria-label={row.traveller.name}
      />
      <div className="flex-1 min-w-0">
        <Text type="text2" ellipsis>
          {row.traveller.name}
        </Text>
      </div>
      <div className="shrink-0" style={{ width: COL_DATES }}>
        <Text type="text3" color="secondary">
          {shortDate(row.startDate)} – {shortDate(row.endDate)}
        </Text>
      </div>
      <div className="shrink-0" style={{ width: COL_VIBE }}>
        {row.isOverride && <Chips label="override" readOnly />}
      </div>
    </div>
  );
}
