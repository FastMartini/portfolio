"use client";

import { createContext, useContext } from "react";

export const ViewContext = createContext<{
  enhanced: boolean;
  listMode: boolean;
  toggleView: () => void;
} | null>(null);

export function ViewToggle() {
  const view = useContext(ViewContext);
  if (!view) return null;

  return (
    <button type="button" className="climb-view-toggle" data-list-mode={view.listMode}
      hidden={!view.enhanced} onClick={view.toggleView}
      aria-controls={view.listMode ? "climb" : "list-view"}>
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        {view.listMode ? <><path d="m3 19 7-13 4 7 2-3 5 9Z" /><path d="m8 10 2 2 2-2" /></>
          : <><path d="M9 6h12M9 12h12M9 18h12" /><path d="M3 6h1M3 12h1M3 18h1" /></>}
      </svg>
      {view.listMode ? "Climb view" : "List view"}
    </button>
  );
}
