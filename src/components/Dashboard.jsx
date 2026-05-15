import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import {
  Activity,
  Radio,
  AlertTriangle,
  Database,
  Clock,
  Cpu,
} from "lucide-react";

import sampleData from "../data/sample-data.json";
import {
  normalizeFeed,
  normalizeEntry,
  formatTimestamp,
  formatClock,
} from "../utils/normalizeData.js";
import {
  findInflationSpikes,
  inflationChange,
  summarize,
} from "../utils/calculations.js";

import SearchBar from "./SearchBar.jsx";
import FilterToggle from "./FilterToggle.jsx";
import FeedList from "./FeedList.jsx";

// ----------------------------------------------------------------------------
// Dashboard
// ----------------------------------------------------------------------------
// State strategy:
//   - `feed`: array of NORMALIZED entries. We normalize once up front, and
//     every simulated update re-normalizes only the new row, then prepends
//     it. This keeps the data layer purely numeric so rendering is cheap.
//   - `query`, `spikeMode`: trivial UI state.
//   - `lastTick`: timestamp string for the header. Updating this every 2s
//     does NOT cause every row to re-render thanks to React.memo on FeedItem.
//
// Why useMemo here:
//   - `filtered`, `spikeIds`, `changes`, `summary` are derived from `feed`.
//     If we recomputed them inside the render body, every parent re-render
//     (e.g. on each clock tick) would redo all this work. useMemo caches
//     the result keyed on the inputs that actually matter — typically
//     `feed` + `query` + `spikeMode`. The list of inflation entries does
//     not change unless `feed` changes, so the heavy lifting runs only
//     when there is real new data.
// ----------------------------------------------------------------------------

// Live simulator: choose a random category-appropriate value and a timestamp
// strictly after the latest one we already have, so the feed is always
// chronologically consistent.
const CATEGORY_TEMPLATES = [
  { source: "FED", category: "Inflation" },
  { source: "BLS", category: "Employment" },
  { source: "BEA", category: "GDP" },
  { source: "Treasury", category: "Rates" },
];

function makeSimulatedEntry(prev, nextId) {
  const template =
    CATEGORY_TEMPLATES[Math.floor(Math.random() * CATEGORY_TEMPLATES.length)];

  // Find latest same-category entry to step from.
  const latestSame = prev.find(
    (e) => e.category === template.category,
  );

  let value;
  if (template.category === "Inflation") {
    const base = latestSame ? latestSame.normalizedValue : 1.2e9;
    // Random delta in [-3%, +9%] – occasionally crosses the 5% spike line.
    const delta = (Math.random() * 0.12 - 0.03) * base;
    value = `$${((base + delta) / 1e9).toFixed(2)}B`;
  } else if (template.category === "Rates") {
    const base = latestSame ? latestSame.normalizedValue : 5.5;
    value = (base + (Math.random() - 0.4) * 0.3).toFixed(2);
  } else if (template.category === "GDP") {
    const base = latestSame ? latestSame.normalizedValue : 3.0;
    value = `${(base + (Math.random() - 0.5) * 0.6).toFixed(1)}%`;
  } else {
    const base = latestSame ? latestSame.normalizedValue : 400000;
    value = Math.round(base + (Math.random() - 0.5) * 30000);
  }

  // Timestamp = max(now, latest+1s) so feed always advances forward.
  const latestMs = prev.reduce(
    (m, e) => Math.max(m, e.normalizedTimestampMs || 0),
    0,
  );
  const ts = Math.max(Date.now(), latestMs + 1000);

  return normalizeEntry({
    id: nextId,
    source: template.source,
    category: template.category,
    value,
    timestamp: new Date(ts).toISOString(),
  });
}

export default function Dashboard() {
  // One-time normalization of the bundled JSON.
  const initial = useMemo(() => normalizeFeed(sampleData), []);
  const [feed, setFeed] = useState(initial);
  const [query, setQuery] = useState("");
  const [spikeMode, setSpikeMode] = useState(true);
  const [lastTick, setLastTick] = useState(Date.now());
  const [newIds, setNewIds] = useState(() => new Set());
  const nextIdRef = useRef(
    initial.reduce((m, e) => Math.max(m, e.id || 0), 0) + 1,
  );

  // Live update every 2s. We append ONE new entry per tick.
  useEffect(() => {
    const t = setInterval(() => {
      setFeed((prev) => {
        const entry = makeSimulatedEntry(prev, nextIdRef.current++);
        return [entry, ...prev];
      });
      setLastTick(Date.now());
    }, 2000);
    return () => clearInterval(t);
  }, []);

  // Track which row was "just added" so we can flash it briefly.
  useEffect(() => {
    if (!feed.length) return;
    const newestId = feed[0].id;
    setNewIds((s) => {
      const n = new Set(s);
      n.add(newestId);
      return n;
    });
    const handle = setTimeout(() => {
      setNewIds((s) => {
        const n = new Set(s);
        n.delete(newestId);
        return n;
      });
    }, 1400);
    return () => clearTimeout(handle);
  }, [feed]);

  // ---------- Derived (memoized) data ----------

  // Inflation spike set – depends ONLY on `feed`, so recomputed only when
  // the feed actually changes (NOT on every clock tick).
  const spikeIds = useMemo(() => findInflationSpikes(feed, 5), [feed]);

  // Per-entry "change vs previous inflation" map.
  // When spikeMode is OFF we expose an empty map so FeedItem renders no
  // badge AND no rose tint — a single source of truth for highlighting.
  const changes = useMemo(() => {
    if (!spikeMode) return new Map();
    const m = new Map();
    for (const e of feed) {
      if (e.category === "Inflation") {
        m.set(e.id, inflationChange(feed, e));
      }
    }
    return m;
  }, [feed, spikeMode]);

  // Filtering. Memoized so typing in the search box does not re-filter
  // unrelated re-renders, and the clock tick alone never re-runs this work.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return feed;
    return feed.filter((e) => String(e.source).toLowerCase().includes(q));
  }, [feed, query]);

  const summary = useMemo(() => summarize(feed, spikeIds), [feed, spikeIds]);

  // The spike-ids set passed down depends on `spikeMode`: when the user
  // turns highlighting off we pass an empty set so rows render normally.
  const effectiveSpikeIds = useMemo(
    () => (spikeMode ? spikeIds : new Set()),
    [spikeMode, spikeIds],
  );

  const onSearchChange = useCallback((v) => setQuery(v), []);
  const onToggle = useCallback((v) => setSpikeMode(v), []);

  return (
    <div
      className="min-h-screen w-full text-slate-100 relative scanlines"
      data-testid="dashboard"
    >
      <div className="relative z-10 max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8">
        {/* ---------- Header ---------- */}
        <header
          className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between border-b border-slate-800 pb-6"
          data-testid="dashboard-header"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-cyan-400" />
              <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-cyan-400">
                Fed-Watch Terminal
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl tracking-tight font-bold">
              Economic Indicators{" "}
              <span className="text-cyan-400">/ Live</span>
            </h1>
            <p className="font-mono text-xs text-slate-500">
              Normalized feed · FED · BLS · BEA · Treasury
            </p>
          </div>

          <div
            className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6"
            data-testid="header-status"
          >
            <div
              className="flex items-center gap-2 font-mono text-xs"
              data-testid="live-indicator"
            >
              <span className="relative inline-flex">
                <span className="live-dot inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </span>
              <span className="text-emerald-400 font-bold tracking-[0.25em]">
                LIVE
              </span>
            </div>
            <div
              className="flex items-center gap-2 font-mono text-xs text-slate-400"
              data-testid="last-updated"
            >
              <Clock className="h-3.5 w-3.5 text-slate-500" />
              <span className="tracking-wider tabular-nums">
                {formatClock(new Date(lastTick))}
              </span>
            </div>
          </div>
        </header>

        {/* ---------- KPI tiles ---------- */}
        <section
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6"
          data-testid="kpi-grid"
        >
          <KpiTile
            icon={<Database className="h-3.5 w-3.5" />}
            label="Total Entries"
            value={summary.total}
            accent="cyan"
            testId="kpi-total"
          />
          <KpiTile
            icon={<AlertTriangle className="h-3.5 w-3.5" />}
            label="Inflation Spikes"
            value={summary.spikes}
            accent={summary.spikes > 0 ? "rose" : "slate"}
            testId="kpi-spikes"
          />
          <KpiTile
            icon={<Radio className="h-3.5 w-3.5" />}
            label="Sources"
            value={summary.sources}
            accent="emerald"
            testId="kpi-sources"
          />
          <KpiTile
            icon={<Activity className="h-3.5 w-3.5" />}
            label="Latest Tick"
            value={formatTimestamp(new Date(summary.latestMs || lastTick))}
            small
            accent="amber"
            testId="kpi-latest"
          />
        </section>

        {/* ---------- Controls ---------- */}
        <section className="mt-8 grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
          <SearchBar value={query} onChange={onSearchChange} />
          <FilterToggle checked={spikeMode} onChange={onToggle} />
        </section>

        {/* ---------- Feed ---------- */}
        <section
          className="mt-6 relative"
          aria-live="polite"
          data-testid="feed-region"
        >
          <FeedList
            entries={filtered}
            spikeIds={effectiveSpikeIds}
            changes={changes}
            newIds={newIds}
          />
          <div className="mt-3 flex items-center justify-between font-mono text-[11px] text-slate-600">
            <span data-testid="row-count">
              {filtered.length} / {feed.length} ROWS
            </span>
            <span>SIM TICK · 2.0s</span>
          </div>
        </section>

        {/* ---------- Footer ---------- */}
        <footer className="mt-12 border-t border-slate-800 pt-4 font-mono text-[10px] tracking-[0.2em] uppercase text-slate-600">
          <p>
            Fed-Watch Dashboard · simulated feed · no investment advice
          </p>
        </footer>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* KpiTile – tiny presentational component. Kept local because it is  */
/* not reused elsewhere. Splitting it out only adds noise.            */
/* ------------------------------------------------------------------ */
function KpiTile({ icon, label, value, accent = "cyan", small, testId }) {
  const accentMap = {
    cyan: "text-cyan-400",
    emerald: "text-emerald-400",
    rose: "text-rose-400",
    amber: "text-amber-400",
    slate: "text-slate-300",
  };
  return (
    <div
      data-testid={testId}
      className="bg-[#111111] border border-slate-800 rounded-md p-4 flex flex-col gap-2 relative overflow-hidden hover:border-slate-700 transition-colors"
    >
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <span className="text-[10px] tracking-[0.25em] uppercase font-bold">
          {label}
        </span>
      </div>
      <div
        className={`font-mono ${small ? "text-sm sm:text-base" : "text-2xl"} font-semibold tabular-nums ${accentMap[accent]}`}
      >
        {value}
      </div>
    </div>
  );
}

/* ============================================================================
   ARCHITECTURE EXPLANATION
   ----------------------------------------------------------------------------
   File layout:

     src/
       App.jsx                       Thin shell; mounts <Dashboard />.
       main.jsx                      Vite entry point.
       index.css                     Theme tokens + global terminal styles.
       data/sample-data.json         Bundled raw feed (messy on purpose).
       utils/
         normalizeData.js            Parsing + formatting helpers (pure).
         calculations.js             Spike detection + summaries (pure).
       components/
         Dashboard.jsx               Smart container: state, effects, memos.
         FeedList.jsx                Memoized table chrome + row mapper.
         FeedItem.jsx                Memoized single row.
         SearchBar.jsx               Controlled input.
         FilterToggle.jsx            Controlled switch.

   Why utilities are separated from components:
     - Utilities are pure JS, easy to unit-test in isolation (no React).
     - Components stay readable: they describe WHAT is on screen, not HOW
       to parse a "$1.2B" string. Swap normalizeData.js for a server-side
       version later and the UI does not change.

   Why components are split into smaller reusable parts:
     - Each piece has ONE reason to change. SearchBar only knows about
       input; FeedItem only knows about one row; Dashboard owns the
       composition. That keeps blast radius small when something evolves.
     - React.memo only pays off if components are small enough that
       "did my props change?" is a cheap question.

   Data flow:
     sample-data.json
        → normalizeFeed() (once, on mount)
        → useState(feed)
        → setInterval prepends a new normalized entry every 2s
        → useMemo computes: spikeIds, per-row change %, filtered list, KPI
        → FeedList receives filtered + spikeIds + changes + newIds
        → FeedItem renders, but memo compares props and skips work when
          nothing relevant changed.

   State management:
     - Local useState is enough for this scope. There is no cross-page
       sharing, no server cache to coordinate, and no auth. Reaching for
       Redux / Zustand here would be over-engineering. If we later add
       multiple terminals / persistence / collaboration, a store can wrap
       Dashboard without touching the pure utils or row component.

   Rendering optimization:
     - React.memo on FeedItem & FeedList prevents unrelated re-renders
       (e.g. the header clock ticking does not repaint 50 rows).
     - Stable keys (entry.id) let React reconcile the table efficiently
       and lets CSS keep hover state during updates.
     - useMemo caches derived data so we only recompute when inputs change.
     - useCallback on event handlers keeps prop identity stable so memoized
       children see "same function, no re-render needed".

   Why this is scalable:
     - Pure utils → easy to move to a backend later without code rewrites.
     - Memoized component tree → adding 10x more rows is still cheap.
     - Single source of truth for normalization → no drift between table,
       charts, exports, etc.

   ============================================================================
   SCALABILITY IN PRODUCTION
   ----------------------------------------------------------------------------
   1. Live source: replace the local setInterval with a WebSocket (or
      SSE) feed. Dashboard's reducer would simply prepend incoming
      normalized entries; nothing else changes.

   2. Pagination / virtualization: at thousands of rows we would swap
      FeedList for a virtualized renderer (react-window / @tanstack/
      virtual) so only on-screen rows actually render. The memo boundary
      on FeedItem already pays for this transition.

   3. Server-side normalization: if the raw feed becomes huge or
      browser-CPU sensitive, move normalizeData.js to the backend and
      have the API return clean records. The UI keeps the same shape.

   4. Server state library: introduce React Query / SWR for caching,
      retries, deduping and background revalidation. Dashboard becomes
      a thin consumer of `useFeedQuery()`.

   5. Real-time infra: Redis Streams / Kafka feeding a WebSocket gateway
      gives us fan-out to many clients. Per-symbol Redis pub-sub topics
      let clients subscribe only to what they render.

   6. Splitting into memoized sections: as the dashboard grows (charts,
      news, alerts), each panel becomes its own memoized component fed
      by its own slice of derived state.

   7. List virtualization: combined with windowing + intersection
      observers, even 100k rows render at 60fps.
   ============================================================================ */
