"use client";

// Vibes board: notes grouped by destination, colour-coded, mood chips,
// pinned notes first. Everyone can add and react; Admin+ can pin/delete any.
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  Avatar,
  Button,
  Chips,
  Dropdown,
  IconButton,
  Loader,
  Text,
  TextArea,
} from "@vibe/core";
import { Delete, Pin, PinFull } from "@vibe/icons";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { MOOD_COLORS } from "@/components/leftpanel/LeftPanel";
import { useElevation } from "@/components/identity/ElevationProvider";
import { useIdentity } from "@/components/identity/IdentityProvider";
import { vibeColorVar } from "@/lib/colors";

const MOODS = ["chill", "party", "nature", "culture", "food", "luxury", "adventure"] as const;
type Mood = (typeof MOODS)[number];
const MOOD_OPTIONS = MOODS.map((m) => ({ value: m, label: m }));
const REACTION_EMOJIS = ["👍", "❤️", "🔥", "😂"];

export default function VibesView() {
  const { traveller: me, sessionToken } = useIdentity();
  const destinations = useQuery(api.trip.listDestinations);
  const travellers = useQuery(api.trip.listTravellers);
  const vibes = useQuery(api.trip.listVibes);

  if (!destinations || !travellers || !vibes || !me || !sessionToken) {
    return (
      <div className="flex items-center justify-center flex-1 py-24">
        <Loader size="medium" />
      </div>
    );
  }

  const places = destinations.filter((d) => d.kind !== "buffer");

  return (
    <div className="flex-1 overflow-auto p-4 md:p-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 max-w-7xl mx-auto items-start">
        {places.map((dest) => (
          <DestinationColumn
            key={dest._id}
            destination={dest}
            vibes={vibes.filter((vb) => vb.destinationId === dest._id)}
            travellers={travellers}
            me={me}
            sessionToken={sessionToken}
          />
        ))}
      </div>
    </div>
  );
}

function DestinationColumn({
  destination,
  vibes,
  travellers,
  me,
  sessionToken,
}: {
  destination: Doc<"destinations">;
  vibes: Doc<"vibes">[];
  travellers: { _id: string; name: string; initials: string; avatarColor: string; avatarUrl?: string }[];
  me: { _id: string; role: string };
  sessionToken: string;
}) {
  return (
    <section
      className="flex flex-col gap-3 p-4"
      style={{
        background: "var(--primary-background-color)",
        border: "var(--border-width) var(--border-style) var(--layout-border-color)",
        borderTop: `4px solid ${vibeColorVar(destination.colorToken)}`,
        borderRadius: "var(--border-radius-medium)",
        boxShadow: "var(--box-shadow-xs)",
      }}
    >
      <div className="flex items-center gap-2">
        <Text type="text1" weight="bold">
          {destination.name}
        </Text>
        <Text type="text3" color="secondary">
          {vibes.length} {vibes.length === 1 ? "note" : "notes"}
        </Text>
      </div>

      {vibes.map((vibe) => (
        <VibeCard
          key={vibe._id}
          vibe={vibe}
          author={travellers.find((t) => t._id === vibe.authorId)}
          me={me}
          sessionToken={sessionToken}
        />
      ))}

      <Composer destinationId={destination._id} sessionToken={sessionToken} />
    </section>
  );
}

function VibeCard({
  vibe,
  author,
  me,
  sessionToken,
}: {
  vibe: Doc<"vibes">;
  author?: { name: string; initials: string; avatarColor: string; avatarUrl?: string };
  me: { _id: string; role: string };
  sessionToken: string;
}) {
  const { ensureElevated } = useElevation();
  const remove = useMutation(api.vibesMutations.remove);
  const setPinned = useMutation(api.vibesMutations.setPinned);
  const react = useMutation(api.vibesMutations.react);

  const isAdmin = me.role !== "contributor"; // pin/unpin
  const isSuperAdmin = me.role === "superAdmin"; // delete anyone's note
  const isMine = vibe.authorId === me._id;
  const reactions = vibe.reactions ?? [];

  return (
    <article
      className="flex flex-col gap-2 p-3"
      style={{
        background: vibe.pinned ? "var(--primary-highlighted-color)" : "var(--allgrey-background-color)",
        borderRadius: "var(--border-radius-small)",
      }}
    >
      <div className="flex items-center gap-2">
        {author && (
          <Avatar
            type={author.avatarUrl ? "img" : "text"}
            src={author.avatarUrl}
            text={author.initials}
            backgroundColor={author.avatarColor as never}
            size="xs"
            aria-label={author.name}
            withoutTooltip
          />
        )}
        <Text type="text3" color="secondary" className="flex-1" ellipsis>
          {author?.name ?? "Unknown"}
        </Text>
        <Chips label={vibe.mood} color={(MOOD_COLORS[vibe.mood] ?? "purple") as never} readOnly />
        {isAdmin && (
          <IconButton
            icon={vibe.pinned ? PinFull : Pin}
            size="xs"
            kind="tertiary"
            aria-label={vibe.pinned ? "Unpin" : "Pin"}
            onClick={async () => {
              if (await ensureElevated()) {
                await setPinned({ sessionToken, vibeId: vibe._id, pinned: !vibe.pinned });
              }
            }}
          />
        )}
        {!isAdmin && vibe.pinned && <IconButton icon={PinFull} size="xs" kind="tertiary" aria-label="Pinned" disabled />}
        {(isMine || isSuperAdmin) && (
          <IconButton
            icon={Delete}
            size="xs"
            kind="tertiary"
            aria-label="Delete note"
            onClick={async () => {
              if (!isMine && !(await ensureElevated())) return;
              await remove({ sessionToken, vibeId: vibe._id });
            }}
          />
        )}
      </div>
      <Text type="text2" style={{ whiteSpace: "pre-wrap" }}>
        {vibe.body}
      </Text>
      <div className="flex items-center gap-1">
        {REACTION_EMOJIS.map((emoji) => {
          const count = reactions.filter((r) => r.emoji === emoji).length;
          const mine = reactions.some((r) => r.emoji === emoji && r.travellerId === me._id);
          return (
            <button
              key={emoji}
              className="cursor-pointer border-none flex items-center gap-1 px-2 py-0.5"
              style={{
                background: mine ? "var(--primary-selected-color)" : "transparent",
                borderRadius: "var(--border-radius-small)",
                font: "var(--font-text3-normal)",
              }}
              onClick={() => void react({ sessionToken, vibeId: vibe._id, emoji })}
            >
              <span>{emoji}</span>
              {count > 0 && <span style={{ color: "var(--secondary-text-color)" }}>{count}</span>}
            </button>
          );
        })}
      </div>
    </article>
  );
}

function Composer({
  destinationId,
  sessionToken,
}: {
  destinationId: Id<"destinations">;
  sessionToken: string;
}) {
  const add = useMutation(api.vibesMutations.add);
  const [body, setBody] = useState("");
  const [mood, setMood] = useState<Mood>("chill");
  const [busy, setBusy] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <TextArea
        placeholder="Drop a vibe — a spot, a plan, a warning…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={2}
        size="small"
        aria-label="New vibe note"
      />
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Dropdown
            size="small"
            clearable={false}
            searchable={false}
            value={MOOD_OPTIONS.find((o) => o.value === mood)}
            options={MOOD_OPTIONS}
            onChange={(option: { value: Mood } | null) => {
              if (option) setMood(option.value);
            }}
          />
        </div>
        <Button
          size="small"
          disabled={!body.trim() || busy}
          onClick={async () => {
            setBusy(true);
            try {
              await add({ sessionToken, destinationId, body, mood });
              setBody("");
            } finally {
              setBusy(false);
            }
          }}
        >
          Add
        </Button>
      </div>
    </div>
  );
}
