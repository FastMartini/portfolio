"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { listTrailheadIntro } from "../../content/trailhead";
import { startSplash } from "./controller";
import type { SplashElement } from "./controller";
import { mapAssetStyles, mapOverlayMarkup } from "./map/markup";

const markup = mapOverlayMarkup(listTrailheadIntro.heading, "splash-opening");

export function Splash() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    try {
      const controller = startSplash(ref.current);
      return () => controller?.dispose();
    } catch {
      (ref.current as SplashElement).splashController?.skip();
      ref.current.classList.add("splash--skipped");
      document.documentElement.dataset.splash = "seen";
    }
  }, []);
  return <div className="splash" aria-hidden="true" ref={ref}
    style={mapAssetStyles as CSSProperties} dangerouslySetInnerHTML={{ __html: markup }} />;
}
