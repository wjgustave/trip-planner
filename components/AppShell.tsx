"use client";

// Shared chrome: header + view tabs. Gates on identity — signed-out users see
// the avatar picker.
import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Loader, Text } from "@vibe/core";
import AppHeader from "./AppHeader";
import AvatarPicker from "./identity/AvatarPicker";
import { useIdentity } from "./identity/IdentityProvider";

const VIEWS = [
  { href: "/", label: "Timeline" },
  { href: "/people", label: "People" },
  { href: "/vibes", label: "Vibes" },
] as const;

export default function AppShell({ children }: { children: ReactNode }) {
  const { traveller } = useIdentity();
  const pathname = usePathname();

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
      <nav
        className="flex items-center gap-1 px-6"
        style={{
          background: "var(--primary-background-color)",
          borderBottom: "var(--border-width) var(--border-style) var(--layout-border-color)",
        }}
      >
        {VIEWS.map((view) => {
          const active = pathname === view.href;
          return (
            <Link
              key={view.href}
              href={view.href}
              className="px-3 py-2 no-underline"
              style={{
                borderBottom: active
                  ? "2px solid var(--primary-color)"
                  : "2px solid transparent",
              }}
            >
              <Text
                type="text2"
                weight={active ? "medium" : "normal"}
                color={active ? "primary" : "secondary"}
              >
                {view.label}
              </Text>
            </Link>
          );
        })}
      </nav>
      <main className="flex flex-col flex-1 min-h-0">{children}</main>
    </div>
  );
}
