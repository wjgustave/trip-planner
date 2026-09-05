"use client";

// Step 1 smoke test: prove @vibe/core renders cleanly in Next 16 App Router.
import { Avatar, AvatarGroup, Button, Heading, Text } from "@vibe/core";

export default function SmokeTest() {
  return (
    <main className="flex flex-col gap-8 items-center justify-center min-h-screen p-8">
      <Heading type="h1">Thailand 2027</Heading>
      <Text type="text1">Vibe smoke test — Button + AvatarGroup</Text>
      <div className="flex gap-4 items-center">
        <Button>Primary action</Button>
        <Button kind="secondary">Secondary</Button>
        <Button kind="tertiary">Tertiary</Button>
      </div>
      <AvatarGroup size="large" max={4}>
        <Avatar type="text" text="WG" backgroundColor="done-green" />
        <Avatar type="text" text="T2" backgroundColor="purple" />
        <Avatar type="text" text="T3" backgroundColor="working_orange" />
        <Avatar type="text" text="T4" backgroundColor="sunset" />
        <Avatar type="text" text="T5" backgroundColor="bright-blue" />
        <Avatar type="text" text="T6" backgroundColor="berry" />
        <Avatar type="text" text="T7" backgroundColor="navy" />
      </AvatarGroup>
    </main>
  );
}
