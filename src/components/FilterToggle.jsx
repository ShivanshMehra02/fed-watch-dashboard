import React from "react";

/**
 * FilterToggle
 * ----------------------------------------------------------------------------
 * Controlled switch used for "Highlight Inflation Spikes" mode.
 *
 * We intentionally keep this presentational. The actual decision of which
 * entries qualify as a spike lives in utils/calculations.js — this component
 * only flips a boolean and tells the parent. That separation makes the
 * business rule trivial to change (e.g. switch threshold from 5% to 7%)
 * without touching any UI code.
 */
const FilterToggle = React.memo(function FilterToggle({
  checked,
  onChange,
  label = "INFLATION SPIKE DETECTION",
}) {
  return (
    <label
      className="flex items-center gap-3 cursor-pointer select-none group"
      data-testid="spike-toggle-label"
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        data-testid="spike-toggle"
        data-state={checked ? "checked" : "unchecked"}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500/60 focus:ring-offset-2 focus:ring-offset-[#0A0A0A] ${
          checked ? "bg-cyan-500" : "bg-slate-700"
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-slate-100 shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-1"
          }`}
        />
      </button>
      <span className="text-xs tracking-[0.2em] uppercase font-bold text-slate-400 group-hover:text-slate-200 transition-colors">
        {label}
      </span>
    </label>
  );
});

export default FilterToggle;
