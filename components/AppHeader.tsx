"use client";

// App header: title, trip dates, activity feed, share link, export menu
// (Super Admin), current traveller with a "not you?" switcher, and the
// "Elevated" indicator while a PIN elevation is active.
import { useState } from "react";
import { useQuery } from "convex/react";
import {
  Avatar,
  AvatarGroup,
  Heading,
  IconButton,
  Label,
  Text,
  Toast,
} from "@vibe/core";
import { Activity, Download, Link as LinkIcon, Menu as MenuIcon, Person, Print } from "@vibe/icons";
import { api } from "@/convex/_generated/api";
import { buildIcs, downloadIcs } from "@/lib/ics";
import ActivityDrawer from "./ActivityDrawer";
import HeaderPopover from "./HeaderPopover";
import { useIdentity } from "./identity/IdentityProvider";

export default function AppHeader() {
  const { traveller, isElevated, signOut } = useIdentity();
  const [activityOpen, setActivityOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const destinations = useQuery(api.trip.listDestinations);
  const travellers = useQuery(api.trip.listTravellers);
  const segments = useQuery(api.trip.listTravelSegments);

  const shareLink = () => {
    const url = `${window.location.origin}/share`;
    void navigator.clipboard.writeText(url).then(() => {
      setToast("Read-only link copied — anyone with it can view the trip");
      setTimeout(() => setToast(null), 4000);
    });
  };

  const exportIcs = () => {
    if (!destinations || !travellers || !segments) return;
    const nameById = new Map(travellers.map((t) => [t._id, t.name]));
    const ics = buildIcs(
      destinations.filter((d) => d.kind !== "buffer"),
      segments.map((s) => ({
        travellerName: nameById.get(s.travellerId) ?? "Traveller",
        direction: s.direction,
        flightDate: s.flightDate,
        airport: s.airport,
        flightNumber: s.flightNumber,
      }))
    );
    downloadIcs(ics);
  };

  return (
    <header
      className="flex items-center gap-3 px-4 md:px-6 py-3"
      style={{
        background: "var(--primary-background-color)",
        borderBottom: "var(--border-width) var(--border-style) var(--layout-border-color)",
      }}
    >
      <Heading type="h2" className="max-sm:hidden">
        Thailand 2027
      </Heading>
      <Heading type="h3" className="sm:hidden">
        Thailand 2027
      </Heading>
      <Text type="text2" color="secondary" className="max-md:hidden">
        9 April – 2 May 2027
      </Text>
      <div className="ml-auto flex items-center gap-2">
        <OnlineNow selfId={traveller?._id} />
        {isElevated && <Label text="Elevated" color="positive" kind="line" />}
        <IconButton
          icon={LinkIcon}
          size="small"
          kind="tertiary"
          aria-label="Copy read-only share link"
          tooltipContent="Copy share link"
          onClick={shareLink}
        />
        <IconButton
          icon={Activity}
          size="small"
          kind="tertiary"
          aria-label="Activity feed"
          tooltipContent="Activity"
          onClick={() => setActivityOpen(true)}
        />
        {traveller?.role === "superAdmin" && (
          <HeaderPopover
            caption="Export"
            actions={[
              { icon: Download, label: "Download .ics calendar", onClick: exportIcs },
              { icon: Print, label: "Printable summary", onClick: () => window.open("/print", "_blank") },
            ]}
            trigger={(toggle) => (
              <IconButton
                icon={MenuIcon}
                size="small"
                kind="tertiary"
                aria-label="Export"
                onClick={toggle}
              />
            )}
          />
        )}
        {traveller && (
          <HeaderPopover
            caption={`${traveller.name} · ${roleLabel(traveller.role)}`}
            actions={[
              { icon: Person, label: "Not you? Switch traveller", onClick: () => void signOut() },
            ]}
            trigger={(toggle) => (
              <button
                className="cursor-pointer border-none bg-transparent p-0 flex"
                aria-label="Account menu"
                onClick={toggle}
              >
                <Avatar
                  type={traveller.avatarUrl ? "img" : "text"}
                  src={traveller.avatarUrl}
                  text={traveller.initials}
                  backgroundColor={traveller.avatarColor as never}
                  size="small"
                  aria-label={`Signed in as ${traveller.name}`}
                  withoutTooltip
                />
              </button>
            )}
          />
        )}
      </div>
      <ActivityDrawer open={activityOpen} onClose={() => setActivityOpen(false)} />
      {toast && (
        <Toast open autoHideDuration={4000} onClose={() => setToast(null)} type="positive">
          {toast}
        </Toast>
      )}
    </header>
  );
}

/**
 * Word-style presence: avatars of everyone else with a live session
 * (heartbeat in the last 2 minutes), updating in realtime.
 */
function OnlineNow({ selfId }: { selfId?: string }) {
  const online = useQuery(api.auth.whosOnline);
  const others = (online ?? []).filter((t) => t._id !== selfId);
  if (others.length === 0) return null;

  return (
    <div className="flex items-center gap-1" aria-label={`${others.length} online`}>
      <AvatarGroup size="small" max={4}>
        {others.map((t) => (
          <Avatar
            key={t._id}
            type={t.avatarUrl ? "img" : "text"}
            src={t.avatarUrl}
            text={t.initials}
            backgroundColor={t.avatarColor as never}
            aria-label={`${t.name} is online`}
            tooltipProps={{ content: `${t.name} — online now` }}
          />
        ))}
      </AvatarGroup>
    </div>
  );
}

export function roleLabel(role: string): string {
  if (role === "superAdmin") return "Super Admin";
  if (role === "admin") return "Admin";
  return "Contributor";
}
