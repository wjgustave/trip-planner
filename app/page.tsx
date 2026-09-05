"use client";

import { Heading, Text } from "@vibe/core";
import TimelineView from "@/components/timeline/TimelineView";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 min-h-screen">
      <header
        className="flex items-center gap-4 px-6 py-3"
        style={{
          background: "var(--primary-background-color)",
          borderBottom: "var(--border-width) var(--border-style) var(--layout-border-color)",
        }}
      >
        <Heading type="h2">Thailand 2027</Heading>
        <Text type="text2" color="secondary">
          9 April – 2 May 2027
        </Text>
      </header>
      <main className="flex flex-col flex-1 min-h-0">
        <TimelineView />
      </main>
    </div>
  );
}
