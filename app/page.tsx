"use client";

import { Loader } from "@vibe/core";
import AppHeader from "@/components/AppHeader";
import AvatarPicker from "@/components/identity/AvatarPicker";
import { useIdentity } from "@/components/identity/IdentityProvider";
import TimelineView from "@/components/timeline/TimelineView";

export default function Home() {
  const { traveller } = useIdentity();

  if (traveller === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader size="medium" />
      </div>
    );
  }

  if (traveller === null) {
    return <AvatarPicker />;
  }

  return (
    <div className="flex flex-col flex-1 min-h-screen">
      <AppHeader />
      <main className="flex flex-col flex-1 min-h-0">
        <TimelineView />
      </main>
    </div>
  );
}
