"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { revealVariants } from "./motion";
import { mountHeroInteraction } from "./strum";
import type { RevealVariant } from "./motion";
import { startSplash } from "../splash/controller";
import type { SplashElement } from "../splash/controller";
import { mapAssetStyles, mapOverlayMarkup } from "../splash/map/markup";
import { listTrailheadIntro } from "../../content/trailhead";
import "./prototype.css";

// THROWAWAY comparison on the real homepage, opt-in via ?variant=letterpress
// (or trail-drawn / paper-fold / trail-sign / branding-iron). No winning default is selected.
export function HeroRevealPreview() {
  const [variant, setVariant] = useState<RevealVariant | null>(null);
  const [entry, setEntry] = useState<"opening" | "climb">("opening");
  const [expanded, setExpanded] = useState(true);
  const [stage, setStage] = useState("Ready");
  const [canClimb, setCanClimb] = useState(false);
  const replayToken = useRef(0);
  const entryRef = useRef(entry);

  useEffect(() => {
    const selected = revealVariants.find(value => value.id === new URLSearchParams(location.search).get("variant"));
    if (!selected) return;
    document.documentElement.dataset.revealVariant = selected.id;
    let collapsedInitial = false;
    const update = () => {
      setCanClimb(Boolean(document.querySelector(".climb-view-toggle:not([hidden])")));
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) { setStage("Reduced motion · completed layout"); return; }
      const overlay = [...document.querySelectorAll<SplashElement>("body > .splash")].find(el => el.splashController && !el.classList.contains("splash--climb"));
      const clock = overlay?.getAnimations().find(a => a instanceof CSSAnimation && a.animationName === "splash-exit");
      const time = typeof clock?.currentTime === "number" ? clock.currentTime : 0;
      const current = revealVariants.find(value => value.id === document.documentElement.dataset.revealVariant)!;
      setStage(overlay ? time < 3420 ? "Opening map" : time < 4420 ? "Map zoom" : time < 4420 + current.duration ? "Greeting" : "Intro + actions" : document.querySelector('.climb-view-toggle[data-list-mode="false"]') ? "Climb view" : "Finished · no default chosen");
      if (overlay && time > 3420 && !collapsedInitial) { setExpanded(false); collapsedInitial = true; }
    };
    const frame = requestAnimationFrame(() => { setVariant(selected.id); update(); });
    const timer = setInterval(update, 100);
    return () => { clearInterval(timer); cancelAnimationFrame(frame); };
  }, []);

  async function replay(next: RevealVariant, source = entryRef.current) {
    document.documentElement.dataset.revealVariant = next;
    const token = ++replayToken.current;
    setExpanded(false);
    document.querySelectorAll<SplashElement>("body > .splash").forEach(el => el.splashController?.skip());
    const toggle = () => document.querySelector<HTMLButtonElement>(".climb-view-toggle:not([hidden])");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      if (toggle()?.dataset.listMode === "false") toggle()!.click();
      window.scrollTo({ top: 0, behavior: "instant" });
      return;
    }
    await document.fonts.ready;
    if (token !== replayToken.current) return;
    if (source === "climb" && toggle()) {
      if (toggle()!.dataset.listMode === "true") {
        toggle()!.click();
        document.querySelector<SplashElement>(".splash--climb")?.splashController?.skip();
        await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      }
      if (token === replayToken.current) toggle()?.click();
      return;
    }
    if (toggle()?.dataset.listMode === "false") {
      toggle()!.click();
      document.querySelector<SplashElement>(".splash--list")?.splashController?.skip();
    }
    window.scrollTo({ top: 0, behavior: "instant" });
    const overlay = document.createElement("div");
    overlay.className = "splash splash--prototype"; overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = mapOverlayMarkup(listTrailheadIntro.heading, "prototype-opening");
    for (const [key, value] of Object.entries(mapAssetStyles)) overlay.style.setProperty(key, value);
    document.body.prepend(overlay);
    const controller = startSplash(overlay, { allowSeen: true, remember: false, onDone: () => overlay.remove() });
    controller?.seek(3420);
    const start = Number(document.timeline.currentTime) - 3420;
    for (const animation of new Set([...overlay.getAnimations({ subtree: true }), ...(controller?.animations ?? [])])) {
      if (animation.playState === "idle") continue;
      animation.play(); animation.startTime = start;
    }
  }

  function choose(next: RevealVariant) {
    document.documentElement.dataset.revealVariant = next;
    const url = new URL(location.href); url.searchParams.set("variant", next);
    history.replaceState(null, "", url);
    setVariant(next); void replay(next);
  }
  const chosen = revealVariants.find(value => value.id === variant);
  const chooseRef = useRef(choose);
  useLayoutEffect(() => { chooseRef.current = choose; });
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!document.documentElement.dataset.revealVariant || (event.target instanceof Element && event.target.closest("input, textarea, select, [contenteditable]"))) return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      const index = revealVariants.findIndex(value => value.id === document.documentElement.dataset.revealVariant);
      chooseRef.current(revealVariants[(index + (event.key === "ArrowRight" ? 1 : revealVariants.length - 1)) % revealVariants.length].id);
    };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, []);
  // The strummable contour strings belong to the Branding iron direction only.
  // Their sound is switched from the nav icon (HeroSoundToggle).
  useEffect(() => {
    if (variant !== "branding-iron") return;
    const mounted = mountHeroInteraction(document);
    return () => mounted.dispose();
  }, [variant]);
  if (!chosen || !variant) return null;
  const index = revealVariants.findIndex(value => value.id === variant);
  return <aside className={`hero-reveal-controls ${expanded ? "is-expanded" : ""}`} data-hero-reveal-controls data-theme-root aria-label="Temporary greeting reveal comparison">
    <div className="prototype-control-row">
      <button type="button" aria-label="Previous reveal" onClick={() => choose(revealVariants[(index + revealVariants.length - 1) % revealVariants.length].id)}>←</button>
      <button type="button" className="prototype-current" aria-expanded={expanded} aria-controls="reveal-options" onClick={() => setExpanded(value => !value)}>{index + 1}/{revealVariants.length} · {chosen.name} <span>{expanded ? "▾" : "Controls ▴"}</span></button>
      <button type="button" aria-label="Next reveal" onClick={() => choose(revealVariants[(index + 1) % revealVariants.length].id)}>→</button>
      <button type="button" aria-label="Replay map handoff" onClick={() => void replay(variant)}>↻</button>
    </div>
    {expanded && <div id="reveal-options" className="prototype-options">
      <div className="prototype-pickers">
        <label>Reveal <select aria-label="Reveal variant" value={variant} onChange={event => choose(event.target.value as RevealVariant)}>{revealVariants.map(value => <option key={value.id} value={value.id}>{value.name}</option>)}</select></label>
        <label>Replay from <select aria-label="Replay from" value={entry} onChange={event => { const value = event.target.value as typeof entry; entryRef.current = value; setEntry(value); }}><option value="opening">Opening map handoff</option><option value="climb" disabled={!canClimb}>Climb → List</option></select></label>
        <button type="button" className="prototype-replay" onClick={() => void replay(variant)}>Replay ↻</button>
      </div>
      <p>{chosen.detail}</p>
    </div>}
    <p className="prototype-status" aria-live="polite">Prototype · {(chosen.duration / 1000).toFixed(2)}s · {stage}</p>
  </aside>;
}
