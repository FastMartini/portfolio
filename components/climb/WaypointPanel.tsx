"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { waypoints } from "../../content/waypoints";
import { journeyStops } from "../../content/journey";

export type PanelSelection = { stop: number; caseStudy: boolean };

export function WaypointPanel({ selection, summaries, cases, onClose, onCase }: {
  selection: PanelSelection | null; summaries: ReactNode[]; cases: ReactNode[];
  onClose: () => void; onCase: (caseStudy: boolean) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const open = selection !== null;
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);
  useEffect(() => {
    if (!selection) return;
    const element = body.current;
    if (element) { element.scrollTop = 0; element.focus({ preventScroll: true }); }
  }, [selection]);
  const index = selection ? selection.stop - 2 : 0, waypoint = waypoints[index];
  return <dialog className="climb-panel" id="waypoint-panel" ref={dialog} aria-labelledby="panel-title"
    onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => {
      if ((event.target as Element).closest("[data-read-case]")) { event.preventDefault(); onCase(true); }
    }}>
    {selection && <>
      <div className="climb-panel-head">
        <p>Waypoint {String(waypoint.order).padStart(2, "0")}, {journeyStops[selection.stop].elevation}</p>
        <div className="climb-panel-tools">
          {selection.caseStudy && <button type="button" onClick={() => onCase(false)}>← Summary</button>}
          <button type="button" onClick={onClose} aria-label="Close panel">Close</button>
        </div>
      </div>
      <div className="climb-panel-body" ref={body} tabIndex={-1}>
        <h2 className="climb-panel-title" id="panel-title">{waypoint.name}{selection.caseStudy ? " · Case Study" : ""}</h2>
        {selection.caseStudy ? cases[index] : summaries[index]}
      </div>
    </>}
  </dialog>;
}
