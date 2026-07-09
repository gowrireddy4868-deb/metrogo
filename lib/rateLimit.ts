/**
 * Simple in-memory sliding-window rate limiter.
 * Works fine for a single-process dev server or a single Vercel serverless
 * instance. For multi-region production, swap the Map for Upstash Redis
 * (free tier, same API shape) — but this is sufficient for most real
 * deployments and requires zero infrastructure.
 */

interface WindowEntry {
  timestamps: number[];
}

const store = new Map<string, WindowEntry>();

// Clean up old keys every 5 minutes so the Map doesn't grow forever
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    const fresh = entry.timestamps.filter((t) => now - t < 60_000);
    if (fresh.length === 0) store.delete(key);
    else entry.timestamps = fresh;
  }
}, 5 * 60 * 1000);

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInMs: number;
}

/**
 * @param key       Unique identifier — typically IP + route, e.g. "1.2.3.4:/api/auth/login"
 * @param limit     Max requests allowed within the window
 * @param windowMs  Window size in milliseconds
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key) || { timestamps: [] };

  // Slide the window: drop timestamps older than windowMs
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

  if (entry.timestamps.length >= limit) {
    const oldest = entry.timestamps[0];
    const resetInMs = windowMs - (now - oldest);
    store.set(key, entry);
    return { allowed: false, remaining: 0, resetInMs };
  }

  entry.timestamps.push(now);
  store.set(key, entry);
  return { allowed: true, remaining: limit - entry.timestamps.length, resetInMs: 0 };
}

/**
 * Convenience helper: extract the real client IP from a Next.js request,
 * falling back through common proxy headers before using a placeholder.
 */
export function getClientIp(req: Request): string {
  const headers = req.headers as Headers;
  return (
    headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}
