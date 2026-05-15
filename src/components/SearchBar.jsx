import React from "react";
import { Search } from "lucide-react";

/**
 * SearchBar
 * ----------------------------------------------------------------------------
 * A pure, controlled input. Filtering itself is done inside Dashboard
 * (memoized via useMemo) so that this component does not need to know
 * anything about the feed — it just reports the current query upward.
 *
 * Keeping this dumb / presentational makes it trivially reusable.
 */
const SearchBar = React.memo(function SearchBar({ value, onChange }) {
  return (
    <div
      className="relative flex items-center w-full"
      data-testid="search-bar"
    >
      <Search
        className="absolute left-0 h-4 w-4 text-slate-500 pointer-events-none"
        aria-hidden="true"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="FILTER BY SOURCE — e.g. fed, bls, treasury"
        aria-label="Filter feed by source"
        data-testid="search-input"
        className="w-full bg-transparent border-b border-slate-700 text-slate-100 placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none focus:ring-0 font-mono text-sm tracking-wider py-2 pl-7 pr-2 uppercase transition-colors"
      />
    </div>
  );
});

export default SearchBar;
