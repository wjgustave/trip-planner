"use client";

// Minimal popover menu for the header. Replaces Vibe's MenuButton/Menu,
// whose item onClick handlers are broken under React 19 (element.ref
// cloning), styled with Vibe tokens to match.
import { ComponentType, ReactNode, SVGProps, useEffect, useRef, useState } from "react";
import { Text } from "@vibe/core";

export interface PopoverAction {
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  onClick: () => void;
}

interface HeaderPopoverProps {
  /** Render the trigger; `open` for styling, `toggle` to wire onClick. */
  trigger: (toggle: () => void, open: boolean) => ReactNode;
  caption?: string;
  actions: PopoverAction[];
}

export default function HeaderPopover({ trigger, caption, actions }: HeaderPopoverProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      {trigger(() => setOpen((v) => !v), open)}
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 flex flex-col py-1"
          style={{
            top: "calc(100% + var(--space-4))",
            minWidth: 220,
            background: "var(--primary-background-color)",
            border: "var(--border-width) var(--border-style) var(--layout-border-color)",
            borderRadius: "var(--border-radius-medium)",
            boxShadow: "var(--box-shadow-medium)",
          }}
        >
          {caption && (
            <div className="px-3 py-1.5">
              <Text type="text3" color="secondary">
                {caption}
              </Text>
            </div>
          )}
          {actions.map((action) => (
            <button
              key={action.label}
              role="menuitem"
              className="flex items-center gap-2 px-3 py-2 text-left cursor-pointer border-none bg-transparent hover:bg-[var(--primary-background-hover-color)]"
              style={{ font: "var(--font-text2-normal)", color: "var(--primary-text-color)" }}
              onClick={() => {
                setOpen(false);
                action.onClick();
              }}
            >
              {action.icon && <action.icon width={16} height={16} aria-hidden />}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
