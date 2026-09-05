"use client";

// People view: a card per traveller — avatar, role badge, flight forms,
// destination overlaps, and (on your own card) presence overrides + profile.
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Avatar, Button, Chips, Label, Loader, Text, TextField } from "@vibe/core";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { roleLabel } from "@/components/AppHeader";
import { useElevation } from "@/components/identity/ElevationProvider";
import { useIdentity } from "@/components/identity/IdentityProvider";
import { vibeColorVar } from "@/lib/colors";
import { shortDate } from "@/lib/dates";
import FlightForm from "./FlightForm";

export default function PeopleView() {
  const { traveller: me, sessionToken } = useIdentity();
  const { ensureElevated } = useElevation();
  const travellers = useQuery(api.trip.listTravellers);
  const segments = useQuery(api.trip.listTravelSegments);
  const destinations = useQuery(api.trip.listDestinations);
  const presence = useQuery(api.trip.listPresence);

  if (!travellers || !segments || !destinations || !presence || !me || !sessionToken) {
    return (
      <div className="flex items-center justify-center flex-1 py-24">
        <Loader size="medium" />
      </div>
    );
  }

  const isAdmin = me.role !== "contributor";
  const isSuperAdmin = me.role === "superAdmin";

  return (
    <div className="flex-1 overflow-auto p-4 md:p-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 max-w-7xl mx-auto">
        {travellers.map((t) => {
          const isMe = t._id === me._id;
          // Editing someone else's flights is Super Admin only.
          const canEditFlights = isMe || isSuperAdmin;
          return (
            <TravellerCard
              key={t._id}
              traveller={t}
              isMe={isMe}
              canEditFlights={canEditFlights}
              needsElevation={!isMe && isSuperAdmin}
              canRemove={isSuperAdmin && !isMe && t.role !== "superAdmin"}
              sessionToken={sessionToken}
              segments={segments.filter((s) => s.travellerId === t._id)}
              presence={presence.filter((p) => p.travellerId === t._id)}
              destinations={destinations}
              ensureElevated={ensureElevated}
            />
          );
        })}
        {isSuperAdmin && (
          <AddTravellerCard sessionToken={sessionToken} ensureElevated={ensureElevated} />
        )}
      </div>
    </div>
  );
}

// Super Admin only: add a new traveller slot to the roster.
function AddTravellerCard({
  sessionToken,
  ensureElevated,
}: {
  sessionToken: string;
  ensureElevated: () => Promise<boolean>;
}) {
  const addTraveller = useMutation(api.travellers.addTraveller);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const add = async () => {
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    if (!(await ensureElevated())) return;
    setBusy(true);
    try {
      await addTraveller({ sessionToken, name: trimmed });
      setName("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      className="flex flex-col gap-3 p-4 justify-center"
      style={{
        background: "var(--primary-background-color)",
        border: "var(--border-width) dashed var(--layout-border-color)",
        borderRadius: "var(--border-radius-medium)",
      }}
    >
      <Text type="text1" weight="bold">
        Add a traveller
      </Text>
      <Text type="text3" color="secondary">
        New travellers join as Contributors — promote them from their card later.
      </Text>
      <div className="flex gap-2 items-center">
        <TextField
          size="small"
          placeholder="Name"
          value={name}
          onChange={setName}
          onKeyDown={(e) => {
            if (e.key === "Enter") void add();
          }}
        />
        <Button size="small" disabled={!name.trim() || busy} onClick={() => void add()}>
          Add
        </Button>
      </div>
    </section>
  );
}

interface CardProps {
  traveller: {
    _id: string;
    name: string;
    initials: string;
    avatarColor: string;
    avatarUrl?: string;
    role: string;
  };
  isMe: boolean;
  canEditFlights: boolean;
  needsElevation: boolean;
  canRemove: boolean;
  sessionToken: string;
  segments: ReturnType<typeof Object>[] & object[];
  presence: { destinationId: string; startDate: string; endDate: string; isOverride: boolean }[];
  destinations: { _id: string; name: string; colorToken: string; kind: string }[];
  ensureElevated: () => Promise<boolean>;
}

function TravellerCard({
  traveller,
  isMe,
  canEditFlights,
  needsElevation,
  canRemove,
  sessionToken,
  segments,
  presence,
  destinations,
  ensureElevated,
}: CardProps) {
  const updateProfile = useMutation(api.travellers.updateProfile);
  const removeTraveller = useMutation(api.travellers.removeTraveller);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(traveller.name);

  const remove = async () => {
    if (!window.confirm(`Remove ${traveller.name} from the trip? Their flights and notes go too.`)) {
      return;
    }
    if (!(await ensureElevated())) return;
    await removeTraveller({ sessionToken, travellerId: traveller._id as Id<"travellers"> });
  };

  const inbound = segments.find((s) => (s as { direction: string }).direction === "inbound");
  const outbound = segments.find((s) => (s as { direction: string }).direction === "outbound");

  const places = destinations.filter((d) => d.kind === "place");
  const overlaps = places
    .map((d) => ({ dest: d, p: presence.find((p) => p.destinationId === d._id) }))
    .filter((x) => x.p);

  const saveName = async () => {
    if (name.trim() && name.trim() !== traveller.name) {
      await updateProfile({
        sessionToken,
        travellerId: traveller._id as Id<"travellers">,
        name: name.trim(),
      });
    }
    setEditingName(false);
  };

  return (
    <section
      className="flex flex-col gap-4 p-4"
      style={{
        background: "var(--primary-background-color)",
        border: "var(--border-width) var(--border-style) var(--layout-border-color)",
        borderRadius: "var(--border-radius-medium)",
        boxShadow: "var(--box-shadow-xs)",
      }}
    >
      <div className="flex items-center gap-3">
        <Avatar
          type={traveller.avatarUrl ? "img" : "text"}
          src={traveller.avatarUrl}
          text={traveller.initials}
          backgroundColor={traveller.avatarColor as never}
          size="medium"
          aria-label={traveller.name}
          withoutTooltip
        />
        <div className="flex-1 min-w-0">
          {editingName && isMe ? (
            <div className="flex gap-2 items-center">
              <TextField
                size="small"
                value={name}
                onChange={setName}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") void saveName();
                }}
              />
              <Button size="small" onClick={() => void saveName()}>
                Save
              </Button>
            </div>
          ) : (
            <div
              className={isMe ? "cursor-pointer" : undefined}
              onClick={isMe ? () => setEditingName(true) : undefined}
              title={isMe ? "Tap to rename" : undefined}
            >
              <Text type="text1" weight="bold" ellipsis>
                {traveller.name}
                {isMe ? " (you)" : ""}
              </Text>
            </div>
          )}
        </div>
        <Label
          text={roleLabel(traveller.role)}
          color={traveller.role === "superAdmin" ? "positive" : traveller.role === "admin" ? "primary" : "dark"}
          kind="line"
        />
      </div>

      <FlightForm
        travellerId={traveller._id as Id<"travellers">}
        direction="inbound"
        segment={inbound as never}
        sessionToken={sessionToken}
        canEdit={canEditFlights}
        beforeSave={needsElevation ? ensureElevated : undefined}
      />
      <FlightForm
        travellerId={traveller._id as Id<"travellers">}
        direction="outbound"
        segment={outbound as never}
        sessionToken={sessionToken}
        canEdit={canEditFlights}
        beforeSave={needsElevation ? ensureElevated : undefined}
      />

      <div className="flex flex-col gap-2">
        <Text type="text2" weight="medium">
          Where they overlap
        </Text>
        <div className="flex flex-wrap gap-1">
          {overlaps.length === 0 && (
            <Text type="text3" color="secondary">
              No overlap yet — add flight dates.
            </Text>
          )}
          {overlaps.map(({ dest, p }) => (
            <span key={dest._id} title={`${shortDate(p!.startDate)} – ${shortDate(p!.endDate)}${p!.isOverride ? " (override)" : ""}`}>
              <Chips
                label={`${dest.name} · ${shortDate(p!.startDate)}–${shortDate(p!.endDate)}`}
                readOnly
                color={dest.colorToken as never}
              />
            </span>
          ))}
        </div>
        {isMe && <PresenceOverrideEditor sessionToken={sessionToken} destinations={places} presence={presence} />}
      </div>

      {canRemove && (
        <div className="flex justify-end">
          <Button size="xs" kind="tertiary" color="negative" onClick={() => void remove()}>
            Remove from trip
          </Button>
        </div>
      )}
    </section>
  );
}

// Presence override: pick a destination, adjust your dates there, or reset to
// the derived answer.
function PresenceOverrideEditor({
  sessionToken,
  destinations,
  presence,
}: {
  sessionToken: string;
  destinations: { _id: string; name: string }[];
  presence: { destinationId: string; startDate: string; endDate: string; isOverride: boolean }[];
}) {
  const setOverride = useMutation(api.presenceMutations.setOverride);
  const clearOverride = useMutation(api.presenceMutations.clearOverride);
  const [open, setOpen] = useState<string | null>(null);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  return (
    <div className="flex flex-col gap-2">
      <Text type="text3" color="secondary">
        Your plans differ? Override your dates at a stop:
      </Text>
      <div className="flex flex-wrap gap-1">
        {destinations.map((d) => {
          const p = presence.find((x) => x.destinationId === d._id);
          const active = open === d._id;
          return (
            <Button
              key={d._id}
              size="xs"
              kind={active ? "primary" : "secondary"}
              onClick={() => {
                setOpen(active ? null : d._id);
                setStart(p?.startDate ?? "");
                setEnd(p?.endDate ?? "");
              }}
            >
              {d.name}
              {p?.isOverride ? " *" : ""}
            </Button>
          );
        })}
      </div>
      {open && (
        <div className="flex items-end gap-2 flex-wrap">
          <TextField title="From" type="date" size="small" value={start} onChange={setStart} />
          <TextField title="To" type="date" size="small" value={end} onChange={setEnd} />
          <Button
            size="small"
            disabled={!start || !end || start > end}
            onClick={async () => {
              await setOverride({
                sessionToken,
                destinationId: open as Id<"destinations">,
                startDate: start,
                endDate: end,
              });
              setOpen(null);
            }}
          >
            Save
          </Button>
          {presence.find((x) => x.destinationId === open)?.isOverride && (
            <Button
              size="small"
              kind="tertiary"
              onClick={async () => {
                await clearOverride({ sessionToken, destinationId: open as Id<"destinations"> });
                setOpen(null);
              }}
            >
              Reset to derived
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
