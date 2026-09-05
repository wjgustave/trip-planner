"use client";

// Client identity context. The session token lives in a cookie; the traveller
// and elevation state are fetched reactively from Convex, so a role change or
// elevation made elsewhere updates every open tab instantly.
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

const COOKIE = "trip_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 90; // 90 days

function readCookie(): string | undefined {
  if (typeof document === "undefined") return undefined;
  return document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${COOKIE}=`))
    ?.split("=")[1];
}

export interface SessionTraveller {
  _id: Id<"travellers">;
  name: string;
  initials: string;
  avatarColor: string;
  avatarUrl?: string;
  role: "contributor" | "admin" | "superAdmin";
  order: number;
  hasPin: boolean;
}

interface IdentityContextValue {
  /** undefined = still loading, null = signed out. */
  traveller: SessionTraveller | null | undefined;
  sessionToken: string | undefined;
  isElevated: boolean;
  elevatedUntil: number | null;
  signIn: (travellerId: Id<"travellers">) => Promise<void>;
  signOut: () => Promise<void>;
}

const IdentityContext = createContext<IdentityContextValue | null>(null);

export function useIdentity(): IdentityContextValue {
  const ctx = useContext(IdentityContext);
  if (!ctx) throw new Error("useIdentity must be used inside IdentityProvider");
  return ctx;
}

export default function IdentityProvider({ children }: { children: ReactNode }) {
  // Cookie is only readable client-side; start undefined to avoid hydration
  // mismatch, then resolve after mount.
  const [token, setToken] = useState<string | undefined>(undefined);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setToken(readCookie());
    setMounted(true);
  }, []);

  const session = useQuery(api.auth.getSession, mounted ? { token } : "skip");
  const createSession = useMutation(api.auth.createSession);
  const endSession = useMutation(api.auth.endSession);

  const signIn = useCallback(
    async (travellerId: Id<"travellers">) => {
      const newToken = await createSession({ travellerId });
      document.cookie = `${COOKIE}=${newToken}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
      setToken(newToken);
    },
    [createSession]
  );

  const signOut = useCallback(async () => {
    if (token) await endSession({ token });
    document.cookie = `${COOKIE}=; path=/; max-age=0`;
    setToken(undefined);
  }, [token, endSession]);

  const loading = !mounted || (token !== undefined && session === undefined);

  return (
    <IdentityContext.Provider
      value={{
        traveller: loading ? undefined : session?.traveller ?? null,
        sessionToken: token,
        isElevated: session?.isElevated ?? false,
        elevatedUntil: session?.elevatedUntil ?? null,
        signIn,
        signOut,
      }}
    >
      {children}
    </IdentityContext.Provider>
  );
}
