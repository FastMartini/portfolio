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
import { ViewContext, ViewToggle } from "./ViewToggle";

import "./climb.css";

function listTarget() {
  try {
    const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    return target?.closest(".climb-list") ? target : null;
  } catch { return null; }
}

export function Climb({ children, mountain, cards, summaries, cases }: {
  children: ReactNode; mountain: ReactNode; cards: ReactNode; summaries: Record<string, ReactNode>; cases: Record<string, ReactNode>;
}) {
  // The complete server-rendered List View is visible until enhancement succeeds.
  const [enhanced, setEnhanced] = useState(false);
  const [listMode, setListMode] = useState(true);
  const [selection, setSelection] = useState<PanelSelection | null>(null);
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const snow = useRef<SnowController>(null);
  const renderers = useRef<{ mountain: (position: number) => void; hud: (frame: ClimbFrame) => void; markers: ReturnType<typeof createMarkerRenderer> } | null>(null);
  const focusList = useRef(false);
  const lastClimbScroll = useRef(0);
  const activeClimb = useRef(false);
  const returnMarker = useRef<HTMLButtonElement | null>(null);
  const pendingFocus = useRef<HTMLButtonElement | null>(null);

  const restorePendingFocus = useCallback(() => {
    if (pendingFocus.current && !pendingFocus.current.hidden && root.current?.dataset.settled === "true") {
      // A marker can briefly re-enter and leave the viewport while the camera
      // and closing scene move in opposite directions. Restore focus only once
      // both are stable, so hiding it again cannot drop focus to the document.
      const scene = stage.current?.querySelector<HTMLElement>(".climb-scene");
      if (scene?.getAnimations().some((animation) => animation.playState !== "finished")) return;
      pendingFocus.current.focus({ preventScroll: true });
      pendingFocus.current = null;
    }
  }, []);

  useEffect(() => {
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
      marker.focus({ preventScroll: true });
      pendingFocus.current = null;
    }
  }, [selection]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setEnhanced(true);
      setListMode(Boolean(listTarget()));
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
    window.addEventListener("hashchange", hashChange);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("hashchange", hashChange); };
  }, []);

  useEffect(() => {
    const element = stage.current;
    const art = element?.querySelector<HTMLElement>(".climb-mountain");
    if (!element || !art) return;
    const markers = createMarkerRenderer(element, restorePendingFocus);
    renderers.current = { mountain: createMountainRenderer(art), hud: createHudRenderer(element), markers };
    return () => { markers.dispose(); renderers.current = null; };
  }, [enhanced, restorePendingFocus]);

  useEffect(() => {
    const art = stage.current?.querySelector<HTMLElement>(".climb-mountain");
    if (art) return observeMountainMotion(art, !listMode);
  }, [enhanced, listMode]);

  useEffect(() => {
    activeClimb.current = enhanced && !listMode;
    if (!enhanced) return;
    const snowController = snow.current;
    const raf = requestAnimationFrame(() => {
      if (listMode) {
        const target = listTarget();
        target?.scrollIntoView();
        if (focusList.current) {
          const focus = target?.matches("a, button, [tabindex]") ? target : document.getElementById("list-view");
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
    const sky = weather(frame.position);
    element.style.setProperty("--sky-top", colorCss(sky.top));
    element.style.setProperty("--sky-bottom", colorCss(sky.bottom));
    element.style.setProperty("--haze", sky.haze.toFixed(3));
    element.style.setProperty("--sun", sky.sun.toFixed(3));
    renderers.current?.mountain(frame.position);
    renderers.current?.hud(frame);
    renderers.current?.markers.render(frame);
    snow.current?.setWeather(sky.snow, frame.reducedMotion);
  }, []);
  useClimbProgress(root, enhanced && !listMode, render);

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
    setSelection({ stop, caseStudy: false });
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
    const index = Number(button.dataset.goto);
    const top = root.current.getBoundingClientRect().top + window.scrollY;
    const range = root.current.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + index / (journeyStops.length - 1) * range, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
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
      <div className="climb-list" hidden={!listMode}>{children}</div>
      {enhanced && <div className="climb-enhancement" hidden={listMode}>
        <a className="skip-link climb-skip" href="#list-view">Skip to full text</a>
        <header className="climb-header">
          <a className="wordmark" href="#climb" aria-label="Diego Martinez, trailhead" onClick={(event) => {
            event.preventDefault();
            window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
          }}><span className="wordmark-mark" aria-hidden="true">DM</span><span>Diego Martinez</span></a>
        </header>
        <main className="climb" id="climb" ref={root} onClick={navigate} onKeyDown={activateLandmark}>
          <div className="climb-stage" ref={stage} data-panel-open={selection !== null}
            onPointerOver={(event) => highlight(event, true)} onPointerOut={(event) => highlight(event, false)}
            onFocus={(event) => highlight(event, true)} onBlur={(event) => highlight(event, false)}>
            <div className="climb-sky" aria-hidden="true" />
            <div className="climb-sun" aria-hidden="true" />
            <div className="climb-scene">
            {mountain}
            <div className="climb-haze" aria-hidden="true" />
            <Snow ref={snow} />
            <Markers openStop={selection?.stop ?? null} />
            </div>
            <div className="climb-navigation" inert={selection !== null}>{cards}<TrailSign /><TrailRail /></div>
            <WaypointPanel selection={selection} summaries={summaries} cases={cases} onClose={closePanel}
              onCase={(caseStudy) => setSelection((previous) => previous ? { ...previous, caseStudy } : null)} />
          </div>
        </main>
      </div>}
      {!listMode && <ViewToggle />}
    </ViewContext.Provider>
  );
}
