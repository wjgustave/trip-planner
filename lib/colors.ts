// Destination and avatar colours reference Vibe content-colour tokens.
// A Super Admin recolouring a destination picks from this named palette —
// never a free colour picker — so everything stays on the Vibe palette.

/** Vibe content colour name -> CSS custom property. */
export function vibeColorVar(token: string): string {
  return `var(--color-${token})`;
}

/** Hover variant of a Vibe content colour. */
export function vibeColorHoverVar(token: string): string {
  return `var(--color-${token}-hover)`;
}

/** Selected (light) variant of a Vibe content colour. */
export function vibeColorSelectedVar(token: string): string {
  return `var(--color-${token}-selected)`;
}

/**
 * The palette offered when recolouring destinations or avatars.
 * Subset of Vibe's contentColors chosen for contrast with white labels.
 */
export const PALETTE_TOKENS = [
  "bright-blue",
  "purple",
  "done-green",
  "working_orange",
  "sunset",
  "explosive",
  "royal",
  "aquamarine",
  "berry",
  "dark-blue",
  "grass_green",
  "dark-orange",
  "stuck-red",
  "sofia_pink",
  "indigo",
  "navy",
  "teal",
  "lavender",
] as const;

/**
 * DESTINATION_COLORS: seeded destination name -> Vibe token (reference only;
 * the live token is stored on each destination row as `colorToken`).
 */
export const DESTINATION_COLORS: Record<string, string> = {
  "Outbound flights": "bright-blue", // --dest-transit
  Bangkok: "purple", // --dest-bangkok
  "Koh Samui": "done-green", // --dest-samui
  "Koh Phangan": "working_orange", // --dest-phangan
  Phuket: "sunset", // --dest-phuket
  "Return flights": "explosive", // --dest-transit-out
};
