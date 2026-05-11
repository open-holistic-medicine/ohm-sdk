/** Tiny formatter helpers shared across screens. No external deps. */

export function formatDuration(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

export function formatBytes(n?: number): string {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function formatRelative(iso?: string): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return iso;
  const diff = Date.now() - t;
  const sec = Math.floor(diff / 1000);
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

/**
 * SHA-1-ish patient hash (collision-safe ENOUGH for a demo audit-search
 * UI — DO NOT use in production; use SHA-256 from `expo-crypto`).
 * Demonstrates the shape — opaque base16 string, 20+ chars.
 */
export function demoPatientHash(seed: string): string {
  let h = 0n;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31n + BigInt(seed.charCodeAt(i))) & 0xffffffffffffffffn;
  }
  return h.toString(16).padStart(16, "0").repeat(2);
}
