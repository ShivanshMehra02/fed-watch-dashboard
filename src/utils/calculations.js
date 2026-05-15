// ============================================================================
// calculations.js
// ----------------------------------------------------------------------------
// Pure functions that derive insights from normalized data.
//
// Why this lives separately from components / hooks:
//   - Business logic (what counts as an "inflation spike", how to compute
//     percentage change) is the kind of code that is easy to unit-test and
//     easy to evolve. Keeping it out of JSX makes both sides clearer:
//     components stay declarative, calculations stay deterministic.
//   - Components can call these helpers from `useMemo` without dragging in
//     React-specific machinery here.
// ============================================================================

/**
 * Given a normalized feed (newest-first), find every "Inflation" entry whose
 * value increased by more than `thresholdPct` (default 5%) compared to the
 * PREVIOUS Inflation entry in chronological order. Returns a Set of entry ids
 * so the UI can do an O(1) lookup per row.
 *
 * Note: "previous" here means the chronologically previous inflation reading,
 * not the previous item in the array — the array is sorted newest-first but
 * we walk it oldest-first for the comparison.
 */
export function findInflationSpikes(feed, thresholdPct = 5) {
  const inflation = feed
    .filter(
      (e) =>
        e.category === "Inflation" &&
        typeof e.normalizedValue === "number" &&
        !isNaN(e.normalizedValue),
    )
    .sort(
      (a, b) =>
        (a.normalizedTimestampMs || 0) - (b.normalizedTimestampMs || 0),
    );

  const spikes = new Set();
  for (let i = 1; i < inflation.length; i++) {
    const prev = inflation[i - 1].normalizedValue;
    const cur = inflation[i].normalizedValue;
    if (prev > 0) {
      const changePct = ((cur - prev) / prev) * 100;
      if (changePct > thresholdPct) spikes.add(inflation[i].id);
    }
  }
  return spikes;
}

/**
 * Percentage change of a single Inflation entry vs the previous one.
 * Used to label "BAD NEWS" (>5% up), "GOOD NEWS" (down) or neutral.
 * Returns null if there is no previous entry to compare with.
 */
export function inflationChange(feed, entry) {
  if (entry.category !== "Inflation") return null;
  const inflation = feed
    .filter(
      (e) =>
        e.category === "Inflation" &&
        typeof e.normalizedValue === "number" &&
        !isNaN(e.normalizedValue),
    )
    .sort(
      (a, b) =>
        (a.normalizedTimestampMs || 0) - (b.normalizedTimestampMs || 0),
    );
  const idx = inflation.findIndex((e) => e.id === entry.id);
  if (idx <= 0) return null;
  const prev = inflation[idx - 1].normalizedValue;
  const cur = inflation[idx].normalizedValue;
  if (!prev) return null;
  return ((cur - prev) / prev) * 100;
}

/**
 * Roll-up tiles shown at the top of the dashboard.
 */
export function summarize(feed, spikeIds) {
  const sources = new Set(feed.map((e) => e.source));
  const latestMs = feed.reduce(
    (max, e) => Math.max(max, e.normalizedTimestampMs || 0),
    0,
  );
  return {
    total: feed.length,
    sources: sources.size,
    spikes: spikeIds.size,
    latestMs,
  };
}
