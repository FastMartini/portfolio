"use client";

import { useContext, useEffect, useRef } from "react";

import { ViewContext } from "./climb/ViewToggle";
import { mountHeroInteraction, type HeroInteraction } from "./hero/strings";

export const HERO_READY_EVENT = "portfolio:hero-ready";

export function TrailheadArt() {
  const root = useRef<HTMLDivElement>(null);
  const listMode = useContext(ViewContext)?.listMode ?? true;
  useEffect(() => {
    if (typeof matchMedia !== "function" || typeof MutationObserver !== "function"
      || typeof ResizeObserver !== "function" || typeof requestAnimationFrame !== "function") return;
    let motion: MediaQueryList;
    try { motion = matchMedia("(prefers-reduced-motion: reduce)"); } catch { return; }
    let interaction: HeroInteraction | null = null;
    let observer: MutationObserver | undefined;
    const finish = () => {
      const current = interaction; interaction = null;
      try { current?.dispose(); } catch { /* Keep the durable List View available. */ }
    };
    const sync = () => {
      try {
        if (!listMode || motion.matches || document.documentElement.dataset.splash === "active"
          || document.querySelector("body > .splash--list, body > .splash--climb")) { finish(); return; }
        if (!interaction) interaction = mountHeroInteraction(document);
      } catch { finish(); }
    };
    const cleanup = () => {
      for (const stop of [
        () => observer?.disconnect(), finish,
        () => document.removeEventListener(HERO_READY_EVENT, sync),
        () => motion.removeEventListener("change", sync),
        () => window.removeEventListener("pagehide", finish),
        () => window.removeEventListener("pageshow", sync),
      ]) { try { stop(); } catch { /* An optional API must not block other releases. */ } }
    };
    try {
      observer = new MutationObserver(sync);
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-splash"] });
      observer.observe(document.body, { childList: true });
      document.addEventListener(HERO_READY_EVENT, sync);
      motion.addEventListener("change", sync);
      window.addEventListener("pagehide", finish);
      window.addEventListener("pageshow", sync);
      sync();
    } catch { cleanup(); }
    return cleanup;
  }, [listMode]);
  return <div className="trailhead-art" ref={root} aria-hidden="true">
    <div className="trailhead-contours" />
    <svg className="trailhead-route trailhead-route--wide" viewBox="0 0 1000 1000" preserveAspectRatio="none">
      <path className="trailhead-trail" pathLength="1" d="M956 214C872 230 910 350 958 408S1004 596 892 646C770 700 884 811 683 867S321 837 114 974" />
    </svg>
    <svg className="trailhead-route trailhead-route--phone" viewBox="0 0 400 200" preserveAspectRatio="none">
      <path className="trailhead-trail" pathLength="1" d="M410 0C410 50 270 120 130 195" />
    </svg>
    <svg className="trailhead-route trailhead-route--compact" viewBox="0 0 1000 100" preserveAspectRatio="none">
      <path className="trailhead-trail" pathLength="1" d="M1010 0C800 30 500 30 180 98" />
    </svg>
  </div>;
}
