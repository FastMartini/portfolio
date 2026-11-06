"use client";

import { useEffect } from "react";
import type { RefObject } from "react";
import { readClimbProgress } from "./progress";
import type { ClimbFrame } from "./progress";
import { sceneCleanup, sceneTask } from "./recovery";
import type { ThemeController } from "../theme/controller";

export function useClimbProgress(root: RefObject<HTMLElement | null>, enabled: boolean, render: (frame: ClimbFrame) => void, onFailure: () => void, theme: ThemeController | null = null) {
  useEffect(() => {
    const element = root.current;
    if (!enabled || !element) return;
    let reduce: MediaQueryList;
    try { reduce = matchMedia("(prefers-reduced-motion: reduce)"); }
    catch { queueMicrotask(onFailure); return; }
    let raf = 0, last = 0, shown = 0, initialized = false, disposed = false, geometryDirty = true;
    let target = readClimbProgress(0);
    const frame = sceneTask(onFailure, (now: number) => {
      if (disposed) return;
      raf = 0;
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0.016;
      last = now;
      const previous = shown;
      shown = reduce.matches || !initialized || Math.abs(target.position - shown) < 0.0004
        ? target.position : shown + (target.position - shown) * (1 - Math.exp(-dt * 7));
      initialized = true;
      element!.dataset.position = shown.toFixed(4);
      element!.dataset.stop = String(target.nearest);
      element!.dataset.settled = String(shown === target.position);
      render({ ...target, position: shown, reducedMotion: reduce.matches || document.hidden, geometryChanged: geometryDirty || previous !== shown });
      geometryDirty = false;
      if (shown !== target.position && !document.hidden) raf = requestAnimationFrame(frame);
      else last = 0;
    });
    const read = sceneTask(onFailure, () => {
      if (disposed) return;
      geometryDirty = true;
      const top = element!.getBoundingClientRect().top + window.scrollY;
      const range = Math.max(1, element!.offsetHeight - window.innerHeight);
      target = readClimbProgress((window.scrollY - top) / range);
      if (!raf) raf = requestAnimationFrame(frame);
    });
    let observer: ResizeObserver | undefined;
    let stopTheme: (() => void) | undefined;
    const cleanup = sceneCleanup(onFailure,
      () => { disposed = true; },
      () => cancelAnimationFrame(raf),
      () => observer?.disconnect(),
      () => stopTheme?.(),
      () => window.removeEventListener("scroll", read),
      () => window.removeEventListener("resize", read),
      () => reduce.removeEventListener("change", read),
      () => document.removeEventListener("visibilitychange", read));
    try {
      observer = new ResizeObserver(read);
      observer.observe(element);
      window.addEventListener("scroll", read, { passive: true });
      window.addEventListener("resize", read);
      reduce.addEventListener("change", read);
      document.addEventListener("visibilitychange", read);
      // The theme clock requests this same frame path. It never writes the
      // environment itself, so scrolling and stationary toggles cannot race.
      stopTheme = theme?.subscribe(() => {
        if (!raf && !document.hidden) raf = requestAnimationFrame(frame);
      });
      read();
    } catch { cleanup(); queueMicrotask(onFailure); }
    return cleanup;
  }, [root, enabled, render, onFailure, theme]);
}
