"use client";

// App header: title, trip dates, current traveller with a "not you?" switcher.
// The elevation indicator appears here once a PIN has been entered (step 7).
import { Avatar, Heading, Label, Menu, MenuButton, MenuItem, MenuTitle, Text } from "@vibe/core";
import { Person } from "@vibe/icons";
import { useIdentity } from "./identity/IdentityProvider";

export default function AppHeader() {
  const { traveller, isElevated, signOut } = useIdentity();

  return (
    <header
      className="flex items-center gap-4 px-6 py-3"
      style={{
        background: "var(--primary-background-color)",
        borderBottom: "var(--border-width) var(--border-style) var(--layout-border-color)",
      }}
    >
      <Heading type="h2">Thailand 2027</Heading>
      <Text type="text2" color="secondary">
        9 April – 2 May 2027
      </Text>
      <div className="ml-auto flex items-center gap-3">
        {isElevated && <Label text="Elevated" color="positive" kind="line" />}
        {traveller && (
          <>
            <Text type="text2" color="secondary" className="max-sm:hidden">
              {traveller.name}
            </Text>
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
                <MenuItem
                  icon={Person}
                  title="Not you? Switch traveller"
                  onClick={() => void signOut()}
                />
              </Menu>
            </MenuButton>
          </>
        )}
      </div>
    </header>
  );
}

export function roleLabel(role: string): string {
  if (role === "superAdmin") return "Super Admin";
  if (role === "admin") return "Admin";
  return "Contributor";
}
