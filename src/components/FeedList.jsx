import React from "react";
import FeedItem from "./FeedItem.jsx";

/**
 * FeedList
 * ----------------------------------------------------------------------------
 * Renders the feed as a dense terminal table.
 *
 * Why this is also React.memo:
 *   When only ONE row updates we still need React to skip re-rendering all
 *   the surrounding chrome (table header, wrapper). FeedList memoization
 *   bails out cheaply on unrelated parent re-renders (e.g. the "Last
 *   updated" clock ticking).
 *
 * Why stable keys (`entry.id`) matter:
 *   React uses the key to match elements between renders. If keys are not
 *   stable (e.g. using array index), React tears down and rebuilds DOM
 *   nodes on every change — undoing the work React.memo did and causing
 *   the flicker we are trying to avoid.
 */
const FeedList = React.memo(function FeedList({
  entries,
  spikeIds,
  changes,
  newIds,
}) {
  if (entries.length === 0) {
    return (
      <div
        className="border border-slate-800 rounded-md p-10 text-center"
        data-testid="empty-state"
      >
        <p className="text-xs tracking-[0.2em] uppercase font-bold text-slate-500">
          No entries match your filter
        </p>
        <p className="mt-2 font-mono text-xs text-slate-600">
          Try a different source keyword.
        </p>
      </div>
    );
  }

  return (
    <div
      className="w-full overflow-x-auto border border-slate-800 rounded-md bg-[#0d0d0d]"
      data-testid="feed-table-wrapper"
    >
      <table
        className="w-full text-left font-mono text-sm whitespace-nowrap"
        data-testid="feed-table"
      >
        <thead>
          <tr className="bg-[#0f0f0f]">
            <th className="px-4 py-3 border-b border-slate-800 text-slate-500 font-normal uppercase tracking-[0.2em] text-[10px]">
              ID
            </th>
            <th className="px-4 py-3 border-b border-slate-800 text-slate-500 font-normal uppercase tracking-[0.2em] text-[10px]">
              Source
            </th>
            <th className="px-4 py-3 border-b border-slate-800 text-slate-500 font-normal uppercase tracking-[0.2em] text-[10px]">
              Category
            </th>
            <th className="px-4 py-3 border-b border-slate-800 text-slate-500 font-normal uppercase tracking-[0.2em] text-[10px]">
              Value
            </th>
            <th className="px-4 py-3 border-b border-slate-800 text-slate-500 font-normal uppercase tracking-[0.2em] text-[10px]">
              Timestamp
            </th>
            <th className="px-4 py-3 border-b border-slate-800 text-slate-500 font-normal uppercase tracking-[0.2em] text-[10px] text-right">
              Signal
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <FeedItem
              key={entry.id}
              entry={entry}
              highlight={spikeIds.has(entry.id)}
              change={changes.get(entry.id)}
              isNew={newIds.has(entry.id)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
});

export default FeedList;
