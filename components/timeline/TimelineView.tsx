"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { Button, ButtonGroup, Loader } from "@vibe/core";
import { api } from "@/convex/_generated/api";
import TimelineGrid from "./TimelineGrid";
import { ZoomLevel, buildRange } from "./timelineMath";

export default function TimelineView() {
  const settings = useQuery(api.trip.getSettings);
  const [zoom, setZoom] = useState<ZoomLevel>("day");

  if (settings === undefined) {
    return (
      <div className="flex items-center justify-center flex-1 py-24">
        <Loader size="medium" />
      </div>
    );
  }
  if (settings === null) {
    return <div className="p-8">No trip configured yet — run the seed.</div>;
  }

  const range = buildRange(settings.tripStart, settings.tripEnd, settings.bufferDays);

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
        className="flex-1 overflow-auto min-h-0"
        style={{
          background: "var(--primary-background-color)",
          borderTop: "var(--border-width) var(--border-style) var(--layout-border-color)",
        }}
      >
        <TimelineGrid range={range} zoom={zoom} />
      </div>
    </section>
  );
}
