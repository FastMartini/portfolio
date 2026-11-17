"use client";
import { useContext, useEffect, useRef } from "react";
import { ViewContext } from "../climb/ViewToggle";
import { mountJourneyTrail } from "./trail";

export function JourneyTrail() {
  const ref = useRef<SVGSVGElement>(null), listMode = useContext(ViewContext)?.listMode ?? true;
  useEffect(() => {
    const svg = ref.current, main = svg?.closest("main");
    if (!listMode || !svg || !main || typeof ResizeObserver !== "function" || typeof matchMedia !== "function") return;
    try { return mountJourneyTrail(main, svg); } catch { /* Keep the server-rendered route and content available. */ }
  }, [listMode]);
  return <svg ref={ref} className="journey-trail" aria-hidden="true">
    <path className="journey-trail-line" />
    <g className="journey-braid" />
    <g className="journey-pins">{[0, 1, 2].map(i => <circle className="trail-pin" key={i} r="7" />)}</g>
    <circle className="journey-trail-tip" r="6" opacity="0" />
  </svg>;
}
