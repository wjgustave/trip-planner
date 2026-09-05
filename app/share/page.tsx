"use client";

// Read-only share view — no traveller slot needed, no editing affordances.
import { Heading, Label, Text } from "@vibe/core";
import TimelineView from "@/components/timeline/TimelineView";

export default function SharePage() {
  return (
    <div className="flex flex-col flex-1 min-h-screen">
      <header
        className="flex items-center gap-3 px-4 md:px-6 py-3"
        style={{
          background: "var(--primary-background-color)",
          borderBottom: "var(--border-width) var(--border-style) var(--layout-border-color)",
        }}
      >
        <Heading type="h2">Thailand 2027</Heading>
        <Text type="text2" color="secondary" className="max-md:hidden">
          9 April – 2 May 2027
        </Text>
        <div className="ml-auto">
          <Label text="View only" kind="line" />
        </div>
      </header>
      <main className="flex flex-col flex-1 min-h-0">
        <TimelineView readOnly />
      </main>
    </div>
  );
}
