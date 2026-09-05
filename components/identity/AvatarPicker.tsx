"use client";

// Landing screen: seven avatars, tap yours.
import { useState } from "react";
import { useQuery } from "convex/react";
import { Avatar, Heading, Loader, Text } from "@vibe/core";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useIdentity } from "./IdentityProvider";

export default function AvatarPicker() {
  const travellers = useQuery(api.trip.listTravellers);
  const { signIn } = useIdentity();
  const [busy, setBusy] = useState<string | null>(null);

  if (!travellers) {
    return (
      <div className="flex items-center justify-center flex-1 py-24">
        <Loader size="medium" />
      </div>
    );
  }

  return (
    <main className="flex flex-col items-center justify-center flex-1 gap-8 p-8 min-h-screen">
      <div className="flex flex-col items-center gap-2 text-center">
        <Heading type="h1">Thailand 2027</Heading>
        <Text type="text1" color="secondary">
          9 April – 2 May 2027 · Who are you?
        </Text>
      </div>
      <div className="flex flex-wrap items-start justify-center gap-6 max-w-xl">
        {travellers.map((t) => (
          <button
            key={t._id}
            className="flex flex-col items-center gap-2 cursor-pointer bg-transparent border-none"
            style={{ opacity: busy && busy !== t._id ? 0.5 : 1 }}
            disabled={busy !== null}
            onClick={async () => {
              setBusy(t._id);
              try {
                await signIn(t._id as Id<"travellers">);
              } finally {
                setBusy(null);
              }
            }}
          >
            <Avatar
              type={t.avatarUrl ? "img" : "text"}
              src={t.avatarUrl}
              text={t.initials}
              backgroundColor={t.avatarColor as never}
              size="large"
              aria-label={`Continue as ${t.name}`}
              withoutTooltip
            />
            <Text type="text2" weight={busy === t._id ? "bold" : "normal"}>
              {t.name}
            </Text>
          </button>
        ))}
      </div>
      <Text type="text3" color="secondary">
        Tap your avatar to start planning. You can switch later from the header.
      </Text>
    </main>
  );
}
