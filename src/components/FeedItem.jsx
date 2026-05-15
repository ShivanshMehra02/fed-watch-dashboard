import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatTimestamp, formatValue } from "../utils/normalizeData.js";

/**
 * FeedItem
 * ----------------------------------------------------------------------------
 * Wrapped in React.memo so a row re-renders ONLY when its own data changes.
 *
 * Why React.memo matters here:
 *   The feed updates every 2 seconds. Without memoization, every parent
 *   render would re-render every row, which (a) wastes CPU, (b) makes the
 *   table flicker for users, (c) interrupts CSS hover transitions.
 *   With memo + stable keys + a derived `highlight` boolean passed from the
 *   parent, only the rows that actually changed will repaint.
 *
 * Why we accept `highlight` / `change` as props instead of recomputing here:
 *   Computing the spike set requires the full feed (we need the previous
 *   inflation entry). Doing that inside every row would be O(n²). The
 *   parent computes the spike set once with useMemo and passes the
 *   per-row result down — a classic "lift the heavy work up" pattern.
 */
const FeedItem = React.memo(
  function FeedItem({ entry, highlight, change, isNew }) {
    const isSpike = Boolean(highlight);
    const isInflation = entry.category === "Inflation";

    // Decide which badge to show next to the value.
    let badge = null;
    if (isInflation && typeof change === "number") {
      if (change > 5) {
        badge = (
          <span
            data-testid="bad-news-badge"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-widest bg-rose-500/10 text-rose-400 border border-rose-500/30 uppercase"
          >
            <TrendingUp className="h-3 w-3" />
            Bad News {change.toFixed(1)}%
          </span>
        );
      } else if (change < 0) {
        badge = (
          <span
            data-testid="good-news-badge"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase"
          >
            <TrendingDown className="h-3 w-3" />
            Good News {change.toFixed(1)}%
          </span>
        );
      } else {
        badge = (
          <span
            data-testid="neutral-badge"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-widest bg-slate-700/40 text-slate-300 border border-slate-600/50 uppercase"
          >
            <Minus className="h-3 w-3" />
            Neutral
          </span>
        );
      }
    }

    return (
      <tr
        data-testid="feed-row"
        data-entry-id={entry.id}
        className={`border-b border-slate-800/60 transition-colors duration-150 ease-in-out hover:bg-[#1a1a1a] ${
          isSpike
            ? "bg-rose-500/5 hover:bg-rose-500/10"
            : ""
        } ${isNew ? "row-flash" : ""}`}
      >
        <td className="px-4 py-3 font-mono text-xs text-slate-500 tabular-nums">
          #{String(entry.id).padStart(3, "0")}
        </td>
        <td className="px-4 py-3">
          <span className="font-mono text-xs font-bold tracking-widest text-cyan-300">
            {entry.source}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className="text-sm text-slate-200">{entry.category}</span>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <span
              className={`font-mono text-sm font-medium tabular-nums ${
                isSpike ? "text-rose-300" : "text-slate-100"
              }`}
            >
              {formatValue(entry.normalizedValue, entry.category)}
            </span>
            <span className="font-mono text-[11px] text-slate-600">
              raw: {String(entry.value)}
            </span>
          </div>
        </td>
        <td className="px-4 py-3">
          <span className="font-mono text-xs text-slate-400 tabular-nums">
            {formatTimestamp(
              entry.normalizedTimestampMs
                ? new Date(entry.normalizedTimestampMs)
                : null,
            )}
          </span>
        </td>
        <td className="px-4 py-3 text-right">{badge}</td>
      </tr>
    );
  },
  // Custom comparator: skip re-render unless something this row cares about
  // actually changed. Stable keys + this check = minimal repaints.
  (prev, next) =>
    prev.entry.id === next.entry.id &&
    prev.entry.normalizedValue === next.entry.normalizedValue &&
    prev.entry.normalizedTimestampMs === next.entry.normalizedTimestampMs &&
    prev.highlight === next.highlight &&
    prev.change === next.change &&
    prev.isNew === next.isNew,
);

export default FeedItem;
