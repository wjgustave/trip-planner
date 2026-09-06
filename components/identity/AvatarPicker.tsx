"use client";

// Landing screen: a tight mosaic of illustrated portraits — a 3x2 rectangle
// on desktop, a square on mobile (see avatar-grid.css). Tiles are greyscale
// until hovered (colour fills bottom-up) and ripple from the pointer when
// selected; picking a tile opens the 4-digit PIN card.
import { CSSProperties, MouseEvent, useState } from "react";
import { useQuery } from "convex/react";
import { Avatar, Button, Heading, Loader, Text, TextField } from "@vibe/core";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { vibeColorVar } from "@/lib/colors";
import { useIdentity } from "./IdentityProvider";
import "./avatar-grid.css";

// Six tiles of deliberately different shapes packed into a 3-col x 4-row
// grid with unequal tracks (see avatar-grid.css), so no two tiles match:
// big square, small portrait, tall narrow, tall, small square, wide strip.
// grid-area: rowStart / colStart / rowEnd / colEnd.
const TILES: Record<string, { src: string; area: string }> = {
  wayne: { src: "/avatars/wayne.png", area: "1 / 1 / 3 / 3" },
  abdi: { src: "/avatars/abdi.png", area: "1 / 3 / 2 / 4" },
  john: { src: "/avatars/john.png", area: "2 / 3 / 4 / 4" },
  emmanuel: { src: "/avatars/emmanuel.png", area: "3 / 1 / 5 / 2" },
  ali: { src: "/avatars/ali.png", area: "3 / 2 / 4 / 3" },
  ameen: { src: "/avatars/ameen.png", area: "4 / 2 / 5 / 4" },
};

interface Ripple {
  id: number;
  travellerId: string;
  x: number;
  y: number;
  size: number;
}

let rippleSeq = 0;

export default function AvatarPicker() {
  const travellers = useQuery(api.trip.listTravellers);
  const { signIn } = useIdentity();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!travellers) {
    return (
      <div className="flex items-center justify-center flex-1 py-24">
        <Loader size="medium" />
      </div>
    );
  }

  const tiled = travellers.filter((t) => TILES[t.name.toLowerCase()]);
  const untiled = travellers.filter((t) => !TILES[t.name.toLowerCase()]);
  const selected = travellers.find((t) => t._id === selectedId);

  const selectTile = (travellerId: string, e: MouseEvent<HTMLButtonElement>) => {
    // Ripple anchored to the pointer: large enough to reach the far corner.
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const size =
      2 *
      Math.max(
        Math.hypot(x, y),
        Math.hypot(rect.width - x, y),
        Math.hypot(x, rect.height - y),
        Math.hypot(rect.width - x, rect.height - y)
      );
    const id = ++rippleSeq;
    setRipples((prev) => [...prev, { id, travellerId, x, y, size }]);
    setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 600);

    setSelectedId(travellerId);
    setPin("");
    setError(null);
  };

  const submit = async () => {
    if (!selected || pin.length !== 4) return;
    setBusy(true);
    setError(null);
    try {
      await signIn(selected._id as Id<"travellers">, pin);
    } catch (e) {
      setError(
        e instanceof Error && /Wrong PIN/i.test(e.message)
          ? "Wrong PIN — try again"
          : "Couldn't sign in — ask the Super Admin if you don't have a PIN yet"
      );
      setPin("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center flex-1 gap-6 p-6 min-h-screen">
      <div className="flex flex-col items-center gap-2 text-center">
        <span
          style={{
            font: "var(--font-h2)",
            fontWeight: 700,
            color: "var(--disabled-text-color)",
          }}
        >
          Demones Planner
        </span>
        <Heading type="h1">Thailand 2027</Heading>
        <Text type="text1" color="secondary">
          9 April – 2 May 2027 · Who are you?
        </Text>
      </div>

      <div className="avatar-mosaic" role="group" aria-label="Pick your traveller">
        {tiled.map((t) => {
          const tile = TILES[t.name.toLowerCase()];
          const isSelected = selectedId === t._id;
          return (
            <button
              key={t._id}
              className={`avatar-tile${isSelected ? " selected" : ""}`}
              // Tile shape from the mosaic map; hover/selected accent is
              // that traveller's colour.
              style={
                {
                  gridArea: tile.area,
                  "--tile-color": vibeColorVar(t.avatarColor),
                } as CSSProperties
              }
              disabled={busy}
              aria-label={`Continue as ${t.name}`}
              aria-pressed={isSelected}
              onClick={(e) => selectTile(t._id, e)}
            >
              <img className="avatar-tile-grey" src={tile.src} alt="" />
              <img className="avatar-tile-color" src={tile.src} alt="" />
              <span className="avatar-tile-name">{t.name}</span>
              {ripples
                .filter((r) => r.travellerId === t._id)
                .map((r) => (
                  <span
                    key={r.id}
                    className="avatar-ripple"
                    style={{
                      width: r.size,
                      height: r.size,
                      left: r.x - r.size / 2,
                      top: r.y - r.size / 2,
                    }}
                  />
                ))}
            </button>
          );
        })}
      </div>

      {/* Travellers added later without a portrait still get a way in. */}
      {untiled.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-4">
          {untiled.map((t) => (
            <button
              key={t._id}
              className="flex flex-col items-center gap-1 cursor-pointer bg-transparent border-none"
              disabled={busy}
              onClick={() => {
                setSelectedId(t._id);
                setPin("");
                setError(null);
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
              <Text type="text2" weight={selectedId === t._id ? "bold" : "normal"}>
                {t.name}
              </Text>
            </button>
          ))}
        </div>
      )}

      {selected ? (
        <div
          className="flex flex-col items-center gap-3 p-5"
          style={{
            background: "var(--primary-background-color)",
            border: "var(--border-width) var(--border-style) var(--layout-border-color)",
            borderRadius: "var(--border-radius-medium)",
            boxShadow: "var(--box-shadow-xs)",
            width: 280,
          }}
        >
          <Text type="text2">
            Hi <strong>{selected.name}</strong> — enter your PIN
          </Text>
          <TextField
            type="password"
            placeholder="••••"
            value={pin}
            onChange={(value) => setPin(value.replace(/\D/g, "").slice(0, 4))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && pin.length === 4 && !busy) void submit();
            }}
            validation={error ? { status: "error", text: error } : undefined}
            autoFocus
            maxLength={4}
            aria-label="4-digit PIN"
          />
          <Button
            disabled={pin.length !== 4 || busy}
            loading={busy}
            onClick={() => void submit()}
            className="w-full"
          >
            Sign in
          </Button>
        </div>
      ) : (
        <Text type="text3" color="secondary">
          Tap your portrait to sign in with your 4-digit PIN.
        </Text>
      )}
    </main>
  );
}
