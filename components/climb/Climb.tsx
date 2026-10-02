"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import { journeyStops } from "../../content/journey";
import { createHudRenderer } from "./hud";
import { createMountainRenderer } from "./mountain/render";
import { Snow } from "./Snow";
import type { SnowController } from "./Snow";
import { TrailRail } from "./TrailRail";
import { TrailSign } from "./TrailSign";
import type { ClimbFrame } from "./progress";
import { useClimbProgress } from "./useClimbProgress";
import { colorCss, weather } from "./weather";

import "./climb.css";

function listTarget() {
  try {
    const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    return target?.closest(".climb-list") ? target : null;
  } catch { return null; }
}

export function Climb({ children, mountain, cards }: { children: ReactNode; mountain: ReactNode; cards: ReactNode }) {
  // The complete server-rendered List View is visible until enhancement succeeds.
  const [enhanced, setEnhanced] = useState(false);
  const [listMode, setListMode] = useState(true);
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const snow = useRef<SnowController>(null);
  const renderers = useRef<{ mountain: (position: number) => void; hud: (frame: ClimbFrame) => void } | null>(null);
  const focusList = useRef(false);
  const lastClimbScroll = useRef(0);
  const activeClimb = useRef(false);

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
    }
    window.addEventListener("hashchange", hashChange);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("hashchange", hashChange); };
  }, []);

  useEffect(() => {
    const element = stage.current;
    const art = element?.querySelector<HTMLElement>(".climb-mountain");
    if (!element || !art) return;
    renderers.current = { mountain: createMountainRenderer(art), hud: createHudRenderer(element) };
    return () => { renderers.current = null; };
  }, [enhanced]);

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
    snow.current?.setWeather(sky.snow, frame.reducedMotion);
  }, []);
  useClimbProgress(root, enhanced && !listMode, render);

  function toggleView() {
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

  function navigate(event: MouseEvent<HTMLElement>) {
    const button = (event.target as Element).closest<HTMLButtonElement>("button[data-goto]");
    if (!button || !root.current) return;
    const index = Number(button.dataset.goto);
    const top = root.current.getBoundingClientRect().top + window.scrollY;
    const range = root.current.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + index / (journeyStops.length - 1) * range, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }

  return (
    <>
      <div className="climb-list" hidden={!listMode}>{children}</div>
      {enhanced && <div className="climb-enhancement" hidden={listMode}>
        <a className="skip-link climb-skip" href="#list-view">Skip to full text</a>
        <header className="climb-header">
          <a className="wordmark" href="#climb" aria-label="Diego Martinez, trailhead" onClick={(event) => {
            event.preventDefault();
            window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
          }}><span className="wordmark-mark" aria-hidden="true">dm</span><span>Diego Martinez</span></a>
        </header>
        <main className="climb" id="climb" ref={root} onClick={navigate}>
          <div className="climb-stage" ref={stage}>
            <div className="climb-sky" aria-hidden="true" />
            <div className="climb-sun" aria-hidden="true" />
            {mountain}
            <div className="climb-haze" aria-hidden="true" />
            <Snow ref={snow} />
            {cards}
            <TrailSign />
            <TrailRail />
          </div>
        </main>
      </div>}
      <button type="button" className="climb-view-toggle" data-list-mode={listMode} hidden={!enhanced} onClick={toggleView}
        aria-controls={listMode ? "climb" : "list-view"}>{listMode ? "Climb view" : "List view"}</button>
    </>
  );
}
