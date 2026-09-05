"use client";

// Landing screen: one avatar per traveller. Tap yours, then enter your
// 4-digit PIN — verified server-side before a session is created.
import { useState } from "react";
import { useQuery } from "convex/react";
import { Avatar, Button, Heading, Loader, Text, TextField } from "@vibe/core";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useIdentity } from "./IdentityProvider";

export default function AvatarPicker() {
  const travellers = useQuery(api.trip.listTravellers);
  const { signIn } = useIdentity();
  const [selectedId, setSelectedId] = useState<string | null>(null);
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

  const selected = travellers.find((t) => t._id === selectedId);

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
            style={{ opacity: selectedId && selectedId !== t._id ? 0.4 : 1 }}
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
          Tap your avatar to sign in with your 4-digit PIN.
        </Text>
      )}
    </main>
  );
}
