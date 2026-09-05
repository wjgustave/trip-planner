"use client";

// App header: title, trip dates, activity feed, share link, export menu
// (Super Admin), current traveller with a "not you?" switcher, and the
// "Elevated" indicator while a PIN elevation is active.
import { useState } from "react";
import { useQuery } from "convex/react";
import {
  Avatar,
  Heading,
  IconButton,
  Label,
  Menu,
  MenuButton,
  MenuItem,
  MenuTitle,
  Text,
  Toast,
} from "@vibe/core";
import { Activity, Download, Link as LinkIcon, Person, Print } from "@vibe/icons";
import { api } from "@/convex/_generated/api";
import { buildIcs, downloadIcs } from "@/lib/ics";
import ActivityDrawer from "./ActivityDrawer";
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
          <MenuButton size="small" aria-label="Export" dialogPosition="bottom-end">
            <Menu>
              <MenuTitle caption="Export" />
              <MenuItem icon={Download} title="Download .ics calendar" onClick={exportIcs} />
              <MenuItem
                icon={Print}
                title="Printable summary"
                onClick={() => window.open("/print", "_blank")}
              />
            </Menu>
          </MenuButton>
        )}
        {traveller && (
          <MenuButton
            component={() => (
              <Avatar
                type={traveller.avatarUrl ? "img" : "text"}
                src={traveller.avatarUrl}
                text={traveller.initials}
                backgroundColor={traveller.avatarColor as never}
                size="small"
                aria-label={`Signed in as ${traveller.name}`}
                withoutTooltip
              />
            )}
            aria-label="Account menu"
            dialogPosition="bottom-end"
          >
            <Menu>
              <MenuTitle caption={`${traveller.name} · ${roleLabel(traveller.role)}`} />
              <MenuItem icon={Person} title="Not you? Switch traveller" onClick={() => void signOut()} />
            </Menu>
          </MenuButton>
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

export function roleLabel(role: string): string {
  if (role === "superAdmin") return "Super Admin";
  if (role === "admin") return "Admin";
  return "Contributor";
}
