# Fed-Watch Dashboard

A live economic indicators terminal built with React — simulates a real-time data feed, normalizes mixed-format inputs, and surfaces key metrics in a Bloomberg-style UI.

> **Disclaimer:** All figures are simulated for demonstration purposes only. Not investment or policy advice.

---

## What it does

- Ingests a messy data feed (mixed timestamps, currencies, percentages) and normalizes everything into clean numeric fields
- Simulates live data by prepending a new row every 2 seconds
- Shows KPI tiles: total entries, inflation spike count, distinct sources, latest tick
- Lets you filter by source and toggle spike highlighting
- Uses `React.memo` + `useMemo` so only changed rows re-render when the clock ticks

---

## Tech Stack

React 19 · Vite · Tailwind CSS · Recharts · Lucide Icons

---

## Getting Started

```bash
cd fed-monitor-dashboard/frontend
npm install
npm start
```

App runs at **http://localhost:3000**

---

## Project Structure

```
src/
├── data/sample-data.json       # Seed data (mixed formats)
├── utils/
│   ├── normalizeData.js        # Parsing logic — timestamps, values, sources
│   └── calculations.js        # Spike detection, deltas, KPI summary
└── components/
    ├── Dashboard.jsx           # State, intervals, memoized derived data
    ├── FeedList.jsx / FeedItem.jsx
    └── SearchBar.jsx / FilterToggle.jsx
```

---

## Key Design Decisions

**Centralized normalization** — Raw inputs are cleaned once in `normalizeData.js`. Everything downstream (UI, analytics) works from a single source of truth.

**Memoized rendering** — Derived data and row components are memoized so a clock update doesn't repaint the whole table.

**Swappable data layer** — The `setInterval` can be replaced with a WebSocket/SSE stream, and `sample-data.json` with a real API, without touching UI code.

---

## Scripts

| Command | Purpose |
|---------|---------|
| `npm start` | Dev server on port 3000 |
| `npm run build` | Production bundle → `dist/` |
| `npm run preview` | Preview the production build |
