// ============================================================================
// normalizeData.js
// ----------------------------------------------------------------------------
// Why this file exists (and why it lives in /utils, not inside a component):
//
//   The raw feed is messy:
//     - timestamps come as Unix seconds, ISO strings, and irregular date
//       strings like "2026/05/01 09:15:00" or "May 1 2026 10:00 AM".
//     - values come as numbers, numeric strings ("950000"), percentage
//       strings ("2.4%"), or magnitude-suffixed strings ("$1.2B", "950M").
//
//   If components had to handle this directly, every render would mix
//   parsing logic with JSX. That is fragile and hard to test.
//
//   We normalize ONCE, up front (before rendering), so that:
//     1. Components stay focused on presentation.
//     2. Sorting / filtering / spike detection can rely on stable numeric
//        fields (normalizedValue, normalizedTimestamp) instead of string
//        parsing inside hot render paths.
//     3. The original raw values are preserved (`value`, `timestamp`) so we
//        can still show "as reported by the source" in the UI.
//     4. Swapping the data source later (REST, WebSocket, gRPC) only
//        requires reusing this single utility — UI code does not change.
// ============================================================================

/**
 * Parse any of the supported timestamp formats into a Date.
 * Returns null when the value cannot be parsed.
 */
export function parseTimestamp(raw) {
  if (raw === null || raw === undefined) return null;

  // Numeric (or numeric string) → assume Unix seconds (small) or ms (large).
  if (typeof raw === "number" || (typeof raw === "string" && /^\d+$/.test(raw))) {
    const n = Number(raw);
    // 10-digit → seconds, 13-digit → ms
    const ms = n < 1e12 ? n * 1000 : n;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }

  if (typeof raw !== "string") return null;

  // Try native Date first — handles ISO 8601, RFC 2822 ("Sat, 03 May 2026 ..."),
  // and "May 1 2026 10:00 AM".
  let d = new Date(raw);
  if (!isNaN(d.getTime())) return d;

  // Fall back to a few common "irregular" patterns.
  // "2026/05/01 09:15:00" or "2026/05/04 09:00 AM"
  let m = raw.match(
    /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})[ T]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i,
  );
  if (m) {
    let [, y, mo, da, h, mi, s, ap] = m;
    let hour = parseInt(h, 10);
    if (ap) {
      if (/pm/i.test(ap) && hour < 12) hour += 12;
      if (/am/i.test(ap) && hour === 12) hour = 0;
    }
    d = new Date(Date.UTC(+y, +mo - 1, +da, hour, +mi, s ? +s : 0));
    if (!isNaN(d.getTime())) return d;
  }

  // "05/02/2026 10:00:00" or "05-06-2026 10:00:00"  (MM/DD/YYYY)
  m = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (m) {
    const [, mo, da, y, h, mi, s] = m;
    d = new Date(Date.UTC(+y, +mo - 1, +da, +h, +mi, s ? +s : 0));
    if (!isNaN(d.getTime())) return d;
  }

  return null;
}

/**
 * Format a Date for display in the terminal table.
 * Keeps a consistent monospace-friendly shape: "2026-05-01 08:30 UTC".
 */
export function formatTimestamp(date) {
  if (!date) return "—";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(
    date.getUTCDate(),
  )} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} UTC`;
}

/**
 * Same as formatTimestamp but includes seconds — used for the header
 * clock so users see it visibly tick on every 2s update.
 */
export function formatClock(date) {
  if (!date) return "—";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(
    date.getUTCDate(),
  )} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(
    date.getUTCSeconds(),
  )} UTC`;
}

/**
 * Convert any of the supported value formats into a plain number.
 *
 *   "$1.2B"   → 1_200_000_000
 *   "950M"    → 950_000_000
 *   "2.4%"    → 2.4
 *   "5.5"     → 5.5
 *   420000    → 420000
 */
export function parseValue(raw) {
  if (raw === null || raw === undefined) return NaN;
  if (typeof raw === "number") return raw;
  if (typeof raw !== "string") return NaN;

  const s = raw.trim().replace(/[$,\s]/g, "");

  // Magnitude suffix (B / M / K), case-insensitive.
  const mag = s.match(/^(-?\d+(?:\.\d+)?)([bmk])$/i);
  if (mag) {
    const n = parseFloat(mag[1]);
    const mult = { b: 1e9, m: 1e6, k: 1e3 }[mag[2].toLowerCase()];
    return n * mult;
  }

  // Percentage → keep as the percent number (2.4% → 2.4).
  if (s.endsWith("%")) {
    const n = parseFloat(s.slice(0, -1));
    return isNaN(n) ? NaN : n;
  }

  const n = parseFloat(s);
  return isNaN(n) ? NaN : n;
}

/**
 * Human-friendly display for a numeric value, picking a sensible unit
 * based on the entry's category. Keeps the original (raw) value visible
 * elsewhere; this is just a formatted "main" value.
 */
export function formatValue(num, category) {
  if (num === null || num === undefined || isNaN(num)) return "—";

  if (category === "Inflation") {
    // Currency-style with magnitude suffix.
    if (Math.abs(num) >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (Math.abs(num) >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (Math.abs(num) >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  }
  if (category === "Rates" || category === "GDP") {
    return `${num.toFixed(2)}%`;
  }
  if (category === "Employment") {
    return new Intl.NumberFormat("en-US").format(Math.round(num));
  }
  return new Intl.NumberFormat("en-US").format(num);
}

/**
 * Take one raw feed entry and return a new object that includes the
 * original fields plus normalized helpers. We never mutate the input.
 */
export function normalizeEntry(raw) {
  const ts = parseTimestamp(raw.timestamp);
  const num = parseValue(raw.value);
  return {
    ...raw,
    source: typeof raw.source === "string" ? raw.source.toUpperCase() : raw.source,
    normalizedTimestamp: ts ? ts.toISOString() : null,
    normalizedTimestampMs: ts ? ts.getTime() : null,
    normalizedValue: num,
  };
}

/**
 * Normalize a whole feed in one pass, then sort newest-first so the UI
 * always renders the most recent entry on top.
 */
export function normalizeFeed(rawList) {
  return rawList
    .map(normalizeEntry)
    .sort(
      (a, b) =>
        (b.normalizedTimestampMs || 0) - (a.normalizedTimestampMs || 0),
    );
}
