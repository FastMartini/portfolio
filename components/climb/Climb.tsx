"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent, ReactNode, PointerEvent, FocusEvent, KeyboardEvent } from "react";
import { journeyStops } from "../../content/journey";
import { createHudRenderer } from "./hud";
import { createMountainRenderer } from "./mountain/render";
import { observeMountainMotion } from "./mountain/motion";
import { Snow } from "./Snow";
import type { SnowController } from "./Snow";
import { TrailRail } from "./TrailRail";
import { TrailSign } from "./TrailSign";
import type { ClimbFrame } from "./progress";
import { useClimbProgress } from "./useClimbProgress";
import { colorCss, weather } from "./weather";
import { Markers } from "./Markers";
import { createMarkerRenderer, setLandmarkHot } from "./marker-render";
import { WaypointPanel } from "./WaypointPanel";
import type { PanelSelection } from "./WaypointPanel";
import { ViewContext } from "./ViewToggle";
import { canEnhanceClimb, observeClimbQuality, watchClimbPerformance } from "./quality";
import type { ClimbQuality } from "./quality";
import { SceneRecovery } from "./SceneRecovery";
import { sceneCleanup, sceneTask } from "./recovery";

import "./climb.css";

function listTarget() {
  try {
    const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    return target?.closest(".climb-list") ? target : null;
  } catch { return null; }
}

export function Climb({ children, header, mountain, cards, summaries, cases }: {
  children: ReactNode; header: ReactNode; mountain: ReactNode; cards: ReactNode; summaries: Record<string, ReactNode>; cases: Record<string, ReactNode>;
}) {
  // The complete server-rendered List View is visible until enhancement succeeds.
  const [enhanced, setEnhanced] = useState(false);
  const [listMode, setListMode] = useState(true);
  const [selection, setSelection] = useState<PanelSelection | null>(null);
  const [quality, setQuality] = useState<ClimbQuality>("full");
  const currentQuality = useRef<ClimbQuality>("full");
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const navigation = useRef<HTMLDivElement>(null);
  const snow = useRef<SnowController>(null);
  const renderers = useRef<{ mountain: (position: number) => void; hud: (frame: ClimbFrame) => void; markers: ReturnType<typeof createMarkerRenderer> } | null>(null);
  const focusList = useRef<boolean | string>(false);
  const reading = useRef<PanelSelection | null>(null);
  // Recovery outlives the enhancement subtree: its DOM refs can already be
  // cleared by a child effect/teardown error before SceneRecovery notifies us.
  const lastRenderedStop = useRef(0);
  const lastClimbScroll = useRef(0);
  const activeClimb = useRef(false);
  const returnMarker = useRef<HTMLButtonElement | null>(null);
  const pendingFocus = useRef<HTMLButtonElement | null>(null);

  const revealList = useCallback(() => {
    if (!activeClimb.current) return;
    lastClimbScroll.current = window.scrollY;
    const selected = reading.current;
    const stop = selected?.stop ?? lastRenderedStop.current;
    const id = journeyStops[stop]?.id ?? "list-view";
    const target = listTarget()?.id ?? (selected?.caseStudy ? `case-${id}` : id);
    // Native hash navigation activates CSS :target Case Studies; replaceState
    // changes the URL but does not update :target in Chromium.
    activeClimb.current = false;
    location.replace(`#${target}`);
    focusList.current = target;
    pendingFocus.current = null;
    setSelection(null);
    setListMode(true);
  }, []);

  const failScene = useCallback(() => {
    revealList();
    setListMode(true);
    setEnhanced(false);
  }, [revealList]);

  const lighten = useCallback(() => {
    currentQuality.current = "light";
    setQuality("light");
  }, []);

  useEffect(() => {
    if (!enhanced || listMode) return;
    return watchClimbPerformance(() => {
      if (currentQuality.current === "full") lighten();
      else failScene();
    });
  }, [enhanced, listMode, lighten, failScene]);

  const restorePendingFocus = useCallback(() => {
    try {
      if (pendingFocus.current && !pendingFocus.current.hidden && root.current?.dataset.settled === "true") {
        // A marker can briefly re-enter and leave the viewport while the camera
        // and closing scene move in opposite directions. Restore focus only once
        // both are stable, so hiding it again cannot drop focus to the document.
        const scene = stage.current?.querySelector<HTMLElement>(".climb-scene");
        if (scene?.getAnimations().some((animation) => animation.playState !== "finished")) return;
        pendingFocus.current.focus({ preventScroll: true });
        pendingFocus.current = null;
      }
    } catch { queueMicrotask(failScene); }
  }, [failScene]);

  const finishDismissal = useCallback(() => { reading.current = null; }, []);

  useEffect(() => {
    sceneTask(failScene, () => {
      // Keep the reading destination until the child confirms native dismissal.
      // A failing close() unmounts the scene before recovery can inspect it.
      if (selection) reading.current = selection;
      stage.current?.querySelectorAll(".lm[data-stop]").forEach((landmark) =>
        landmark.setAttribute("aria-expanded", String(Number(landmark.getAttribute("data-stop")) === selection?.stop)));
      if (selection || !pendingFocus.current) return;
      const marker = pendingFocus.current;
      if (marker.hidden && root.current) {
        const element = root.current;
        const top = element.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: top + Number(marker.dataset.marker) / (journeyStops.length - 1) * (element.offsetHeight - innerHeight), behavior: "instant" });
        // The frame renderer returns focus once the projected marker is visible,
        // including when normal-motion camera interpolation takes several frames.
      } else {
        restorePendingFocus();
      }
    })();
  }, [selection, restorePendingFocus, failScene]);

  useEffect(() => {
    if (!canEnhanceClimb()) return;
    let preference: MediaQueryList;
    try {
      preference = matchMedia("(prefers-reduced-motion: reduce)");
      if (typeof preference.matches !== "boolean" || typeof preference.addEventListener !== "function"
        || typeof preference.removeEventListener !== "function") return;
    }
    catch { return; } // The durable List View is already visible at startup.
    let stopQuality: (() => void) | undefined;
    let raf = 0;
    const motionChange = sceneTask(failScene, () => {
      if (preference.matches) revealList();
    });
    function hashChange() {
      if (!listTarget()) return;
      if (activeClimb.current) {
        lastClimbScroll.current = window.scrollY;
        focusList.current = true;
      }
      setListMode(true);
      setSelection(null);
      pendingFocus.current = null;
    }
    const cleanup = sceneCleanup(failScene,
      () => cancelAnimationFrame(raf),
      () => window.removeEventListener("hashchange", hashChange),
      () => preference.removeEventListener("change", motionChange),
      () => stopQuality?.());
    try {
      raf = requestAnimationFrame(() => {
        try {
          stopQuality = observeClimbQuality(lighten);
          setListMode(Boolean(listTarget()) || preference.matches);
          setEnhanced(true);
        } catch { failScene(); }
      });
      window.addEventListener("hashchange", hashChange);
      preference.addEventListener("change", motionChange);
    } catch { cleanup(); return; }
    return cleanup;
  }, [revealList, lighten, failScene]);

  useEffect(() => {
    const element = stage.current;
    const art = element?.querySelector<HTMLElement>(".climb-mountain");
    if (!element || !art) return;
    try {
      const markers = createMarkerRenderer(element, restorePendingFocus, failScene);
      renderers.current = { mountain: createMountainRenderer(art), hud: createHudRenderer(element, navigation.current), markers };
      return () => { markers.dispose(); renderers.current = null; };
    } catch {
      const raf = requestAnimationFrame(failScene);
      return () => cancelAnimationFrame(raf);
    }
  }, [enhanced, restorePendingFocus, failScene]);

  useEffect(() => {
    const art = stage.current?.querySelector<HTMLElement>(".climb-mountain");
    try {
      if (art) return observeMountainMotion(art, !listMode && quality === "full", failScene);
    } catch {
      const raf = requestAnimationFrame(failScene);
      return () => cancelAnimationFrame(raf);
    }
  }, [enhanced, listMode, quality, failScene]);

  useEffect(() => {
    activeClimb.current = enhanced && !listMode;
    if (!enhanced && !focusList.current) return;
    const snowController = snow.current;
    const raf = requestAnimationFrame(() => {
      if (listMode) {
        const target = listTarget();
        target?.scrollIntoView();
        if (focusList.current) {
          const focus = typeof focusList.current === "string" ? document.getElementById(focusList.current)
            : target?.matches("a, button, [tabindex]") ? target : document.getElementById("list-view");
          if (focus && !focus.matches("a, button, [tabindex]")) focus.tabIndex = -1;
          focus?.focus({ preventScroll: true });
          focusList.current = false;
        }
      } else {
        window.scrollTo({ top: lastClimbScroll.current, behavior: "instant" });
      }
    });
    return () => { cancelAnimationFrame(raf); snowController?.setWeather(0, true); };
  }, [enhanced, listMode]);

  const render = useCallback((frame: ClimbFrame) => {
    const element = stage.current;
    if (!element) return;
    lastRenderedStop.current = frame.nearest;
    try {
      const sky = weather(frame.position);
      element.style.setProperty("--sky-top", colorCss(sky.top));
      element.style.setProperty("--sky-bottom", colorCss(sky.bottom));
      element.style.setProperty("--haze", sky.haze.toFixed(3));
      element.style.setProperty("--sun", sky.sun.toFixed(3));
      renderers.current?.mountain(frame.position);
      renderers.current?.hud(frame);
      renderers.current?.markers.render(frame);
      snow.current?.setWeather(sky.snow, frame.reducedMotion);
    } catch { failScene(); }
  }, [failScene]);
  useClimbProgress(root, enhanced && !listMode, render, failScene);

  function toggleView() {
    pendingFocus.current = null;
    setSelection(null);
    if (listMode) {
      history.replaceState(null, "", location.pathname + location.search);
      setListMode(false);
    } else {
      lastClimbScroll.current = window.scrollY;
      focusList.current = true;
      history.replaceState(null, "", "#list-view");
      setListMode(true);
    }
  }

  function openWaypoint(stop: number) {
    if (!Number.isInteger(stop) || stop < 2 || stop > 7 || !stage.current) return;
    pendingFocus.current = null;
    returnMarker.current = stage.current.querySelector<HTMLButtonElement>(`[data-marker="${stop}"]`);
    reading.current = { stop, caseStudy: false };
    setSelection(reading.current);
  }

  function activateLandmark(event: KeyboardEvent<HTMLElement>) {
    const landmark = (event.target as Element).closest<SVGGElement>(".lm[data-stop]");
    if (!landmark || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    if (!event.repeat) openWaypoint(Number(landmark.dataset.stop));
  }

  function navigate(event: MouseEvent<HTMLElement>) {
    const target = (event.target as Element).closest<HTMLElement>("[data-marker], .lm[data-stop], [data-open-stop]");
    if (target && stage.current) {
      const stop = Number(target.dataset.marker ?? target.dataset.stop ?? target.dataset.openStop);
      openWaypoint(stop);
      return;
    }
    const button = (event.target as Element).closest<HTMLButtonElement>("button[data-goto]");
    if (!button || !root.current) return;
    goToStop(Number(button.dataset.goto));
  }

  function goToStop(index: number) {
    if (!root.current) return;
    const top = root.current.getBoundingClientRect().top + window.scrollY;
    const range = root.current.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + index / (journeyStops.length - 1) * range, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }

  function navigateHeader(event: MouseEvent<HTMLDivElement>) {
    if (listMode || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = (event.target as Element).closest<HTMLAnchorElement>("a[href^='#']");
    if (!link) return;
    const id = link.hash.slice(1);
    const index = journeyStops.findIndex((stop) => stop.id === id || stop.navigation === id);
    if (index < 0) return; // The skip link still opens the durable full text.
    event.preventDefault();
    pendingFocus.current = null;
    setSelection(null);
    goToStop(index);
  }

  function highlight(event: PointerEvent<HTMLDivElement> | FocusEvent<HTMLDivElement>, hot: boolean) {
    const target = (event.target as Element).closest<HTMLElement>("[data-marker], .lm[data-stop]");
    if (!target || !stage.current) return;
    const related = event.relatedTarget;
    if (related instanceof Node && target.contains(related)) return;
    const stop = Number(target.dataset.marker ?? target.dataset.stop);
    const marker = stage.current.querySelector<HTMLButtonElement>(`[data-marker="${stop}"]`);
    const landmark = stage.current.querySelector(`.lm[data-stop="${stop}"]`);
    // Pointer exit must not clear either control while it owns keyboard focus.
    setLandmarkHot(stage.current, stop, hot || marker === document.activeElement || landmark === document.activeElement);
  }

  function closePanel() {
    pendingFocus.current = returnMarker.current;
    setSelection(null);
  }

  return (
    <ViewContext.Provider value={{ enhanced, listMode, toggleView }}>
      {/* Keep navigation outside both reading modes and scene recovery. */}
      <div className="portfolio-navigation" ref={navigation}
        onClickCapture={(event) => sceneTask(failScene, navigateHeader)(event)}>
        <a className="skip-link climb-skip" href={listMode ? "#main-content" : "#list-view"}>
          {listMode ? "Skip to content" : "Skip to full text"}
        </a>
        {header}
      </div>
      <div className="climb-list" hidden={!listMode}>{children}</div>
      {enhanced && <SceneRecovery onFailure={failScene}><div className="climb-enhancement" hidden={listMode} data-quality={quality}>
        <main className="climb" id="climb" ref={root}
          onClick={(event) => sceneTask(failScene, navigate)(event)}
          onKeyDown={(event) => sceneTask(failScene, activateLandmark)(event)}>
          <div className="climb-stage" ref={stage} data-panel-open={selection !== null}
            onPointerOver={(event) => sceneTask(failScene, () => highlight(event, true))()}
            onPointerOut={(event) => sceneTask(failScene, () => highlight(event, false))()}
            onFocus={(event) => sceneTask(failScene, () => highlight(event, true))()}
            onBlur={(event) => sceneTask(failScene, () => highlight(event, false))()}>
            <div className="climb-sky" aria-hidden="true" />
            <div className="climb-sun" aria-hidden="true" />
            <div className="climb-scene">
            {mountain}
            <div className="climb-haze" aria-hidden="true" />
            {quality === "full" && <Snow ref={snow} />}
            <Markers openStop={selection?.stop ?? null} />
            </div>
            <div className="climb-navigation" inert={selection !== null}>{cards}<TrailSign /><TrailRail /></div>
            <WaypointPanel selection={selection} summaries={summaries} cases={cases} onClose={closePanel}
              onDismissed={finishDismissal}
              onCase={(caseStudy) => {
                if (!reading.current) return;
                reading.current = { ...reading.current, caseStudy };
                setSelection(reading.current);
              }} />
          </div>
        </main>
      </div></SceneRecovery>}
    </ViewContext.Provider>
  );
}
