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
      {view.listMode ? "Climb view" : "List view"}
    </button>
  );
}
