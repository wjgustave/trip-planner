"use client";

// PIN elevation UI. Any privileged UI action calls ensureElevated(); if the
// session isn't elevated a PIN dialog opens, the PIN is verified server-side
// (auth.elevate) and the promise resolves true/false. Elevation lasts 30
// minutes; the header shows an "Elevated" chip while active.
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { useMutation } from "convex/react";
import { Modal, ModalBasicLayout, ModalContent, ModalFooter, ModalHeader, TextField, Text } from "@vibe/core";
import { api } from "@/convex/_generated/api";
import { useIdentity } from "./IdentityProvider";

interface ElevationContextValue {
  /** Resolve true when elevated (already or via PIN entry), false if cancelled. */
  ensureElevated: () => Promise<boolean>;
}

const ElevationContext = createContext<ElevationContextValue | null>(null);

export function useElevation(): ElevationContextValue {
  const ctx = useContext(ElevationContext);
  if (!ctx) throw new Error("useElevation must be used inside ElevationProvider");
  return ctx;
}

export default function ElevationProvider({ children }: { children: ReactNode }) {
  const { sessionToken, isElevated, traveller } = useIdentity();
  const elevate = useMutation(api.auth.elevate);

  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const ensureElevated = useCallback(async () => {
    if (isElevated) return true;
    if (!traveller || traveller.role === "contributor" || !sessionToken) return false;
    setPin("");
    setError(null);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, [isElevated, traveller, sessionToken]);

  const finish = useCallback((ok: boolean) => {
    setOpen(false);
    resolver.current?.(ok);
    resolver.current = null;
  }, []);

  const submit = useCallback(async () => {
    if (!sessionToken || pin.length < 4) return;
    setBusy(true);
    setError(null);
    try {
      await elevate({ token: sessionToken, pin });
      finish(true);
    } catch (e) {
      setError(e instanceof Error && e.message.includes("Wrong PIN") ? "Wrong PIN — try again" : "Could not verify PIN");
      setPin("");
    } finally {
      setBusy(false);
    }
  }, [sessionToken, pin, elevate, finish]);

  return (
    <ElevationContext.Provider value={{ ensureElevated }}>
      {children}
      {open && (
      <Modal id="pin-elevation" show={open} size="small" onClose={() => finish(false)}>
        <ModalBasicLayout>
          <ModalHeader title="Enter your PIN" />
          <ModalContent>
            <div className="flex flex-col gap-3 pb-2">
              <Text type="text2" color="secondary">
                Admin actions need your 4-digit PIN. It unlocks editing for 30 minutes.
              </Text>
              <TextField
                type="password"
                placeholder="••••"
                value={pin}
                onChange={(value) => setPin(value.replace(/\D/g, "").slice(0, 4))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && pin.length === 4) void submit();
                }}
                validation={error ? { status: "error", text: error } : undefined}
                autoFocus
                maxLength={4}
              />
            </div>
          </ModalContent>
        </ModalBasicLayout>
        <ModalFooter
          primaryButton={{
            text: busy ? "Checking…" : "Unlock",
            onClick: () => void submit(),
            disabled: pin.length !== 4 || busy,
          }}
          secondaryButton={{ text: "Cancel", onClick: () => finish(false) }}
        />
      </Modal>
      )}
    </ElevationContext.Provider>
  );
}
