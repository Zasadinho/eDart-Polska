// ─── Input validation helpers for edge functions ───

/** Check if value is a valid UUID v4 */
export function isUuid(val: unknown): val is string {
  return typeof val === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}

/** Check if value is a non-negative finite number */
export function isNonNegNum(val: unknown): val is number {
  return typeof val === "number" && Number.isFinite(val) && val >= 0;
}

/** Clamp a numeric value to a safe range, returning defaultVal for non-numbers */
export function clampNum(val: unknown, min: number, max: number, defaultVal = 0): number {
  if (typeof val !== "number" || !Number.isFinite(val)) return defaultVal;
  return Math.max(min, Math.min(max, Math.round(val)));
}

/** Sanitize a stat field: must be a non-negative integer within range */
export function safeStat(val: unknown, max = 999): number {
  return clampNum(val, 0, max, 0);
}

/** Sanitize an average value: non-negative float, max 200 */
export function safeAvg(val: unknown): number | null {
  if (val == null) return null;
  if (typeof val !== "number" || !Number.isFinite(val)) return null;
  return Math.max(0, Math.min(200, Math.round(val * 100) / 100));
}

/** Check if value is a non-empty string (trimmed) with max length */
export function isNonEmptyStr(val: unknown, maxLen = 500): val is string {
  return typeof val === "string" && val.trim().length > 0 && val.length <= maxLen;
}

/** Validate a URL is HTTPS and not internal/private */
export function isSafeUrl(url: unknown): url is string {
  if (typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const hostname = parsed.hostname.toLowerCase();
    // Block internal/private addresses
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname === "[::1]" ||
      hostname.startsWith("10.") ||
      hostname.startsWith("172.") ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("169.254.") ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal")
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/** Validate and sanitize match stats object */
export function sanitizeMatchStats(stats: Record<string, unknown>) {
  return {
    score1: safeStat(stats.score1, 50),
    score2: safeStat(stats.score2, 50),
    avg1: safeAvg(stats.avg1),
    avg2: safeAvg(stats.avg2),
    first_9_avg1: safeAvg(stats.first_9_avg1),
    first_9_avg2: safeAvg(stats.first_9_avg2),
    one_eighties1: safeStat(stats.one_eighties1, 100),
    one_eighties2: safeStat(stats.one_eighties2, 100),
    high_checkout1: safeStat(stats.high_checkout1, 170),
    high_checkout2: safeStat(stats.high_checkout2, 170),
    ton60_1: safeStat(stats.ton60_1, 200),
    ton60_2: safeStat(stats.ton60_2, 200),
    ton80_1: safeStat(stats.ton80_1, 200),
    ton80_2: safeStat(stats.ton80_2, 200),
    ton_plus1: safeStat(stats.ton_plus1, 200),
    ton_plus2: safeStat(stats.ton_plus2, 200),
    ton40_1: safeStat(stats.ton40_1, 200),
    ton40_2: safeStat(stats.ton40_2, 200),
    darts_thrown1: safeStat(stats.darts_thrown1, 9999),
    darts_thrown2: safeStat(stats.darts_thrown2, 9999),
    checkout_attempts1: safeStat(stats.checkout_attempts1, 500),
    checkout_attempts2: safeStat(stats.checkout_attempts2, 500),
    checkout_hits1: safeStat(stats.checkout_hits1, 500),
    checkout_hits2: safeStat(stats.checkout_hits2, 500),
  };
}
