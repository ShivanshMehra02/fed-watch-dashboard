import React from "react";
import Dashboard from "./components/Dashboard.jsx";

/**
 * App
 * ----------------------------------------------------------------------------
 * The shell stays intentionally tiny. A real product would add routing /
 * error boundaries here, but for a single-page terminal the Dashboard
 * component is the whole experience. Keeping App.jsx empty-ish is a
 * deliberate choice: smaller surface = fewer reasons to touch this file.
 */
export default function App() {
  return <Dashboard />;
}
