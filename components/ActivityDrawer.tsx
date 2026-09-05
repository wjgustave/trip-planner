"use client";

// Activity feed in a side drawer — who changed what, when. Prevents the
// "who moved Phuket?" argument.
import { useQuery } from "convex/react";
import { IconButton, Loader, Text } from "@vibe/core";
import { CloseSmall } from "@vibe/icons";
import { api } from "@/convex/_generated/api";

function timeAgo(at: number): string {
  const s = Math.floor((Date.now() - at) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function summariseChange(before: unknown, after: unknown): string | null {
  if (!before && !after) return null;
  const fmt = (x: unknown) =>
    x && typeof x === "object"
      ? Object.entries(x as Record<string, unknown>)
          .filter(([k]) => k !== "name")
          .map(([, v]) => String(v))
          .join(" → ")
      : String(x ?? "");
  const b = fmt(before);
  const a = fmt(after);
  if (b && a) return `${b} ⟶ ${a}`;
  return a || b || null;
}

export default function ActivityDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const activity = useQuery(api.trip.listActivity, open ? {} : "skip");

  if (!open) return null;

  return (
    <aside
      className="fixed inset-y-0 right-0 z-50 flex flex-col w-full max-w-sm"
      style={{
        background: "var(--primary-background-color)",
        borderLeft: "var(--border-width) var(--border-style) var(--layout-border-color)",
        boxShadow: "var(--box-shadow-large)",
      }}
      aria-label="Activity feed"
    >
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "var(--border-width) var(--border-style) var(--layout-border-color)" }}
      >
        <Text type="text1" weight="bold">
          Activity
        </Text>
        <IconButton icon={CloseSmall} size="small" kind="tertiary" aria-label="Close activity feed" onClick={onClose} />
      </div>
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1">
        {!activity && (
          <div className="flex justify-center py-8">
            <Loader size="small" />
          </div>
        )}
        {activity?.length === 0 && (
          <Text type="text2" color="secondary">
            Nothing yet — changes will show up here.
          </Text>
        )}
        {activity?.map((entry) => {
          const change = summariseChange(entry.before, entry.after);
          return (
            <div
              key={entry._id}
              className="flex flex-col gap-0.5 px-2 py-2"
              style={{ borderBottom: "var(--border-width) var(--border-style) var(--layout-border-color)" }}
            >
              <Text type="text2">
                <strong>{entry.actorName}</strong> {entry.action}
              </Text>
              {change && (
                <Text type="text3" color="secondary" ellipsis>
                  {change}
                </Text>
              )}
              <Text type="text3" color="secondary">
                {timeAgo(entry.at)}
              </Text>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
