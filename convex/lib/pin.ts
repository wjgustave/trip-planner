// PIN hashing via Web Crypto (available in the Convex runtime).
// Format: "salt:sha256hex". This is deliberately lightweight — it protects a
// 4-digit PIN shared among seven friends, not bank credentials.

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashPin(pin: string, salt?: string): Promise<string> {
  const actualSalt =
    salt ?? toHex(crypto.getRandomValues(new Uint8Array(16)).buffer as ArrayBuffer);
  const data = new TextEncoder().encode(`${actualSalt}:${pin}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return `${actualSalt}:${toHex(digest)}`;
}

export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  const [salt] = stored.split(":");
  const candidate = await hashPin(pin, salt);
  return candidate === stored;
}
