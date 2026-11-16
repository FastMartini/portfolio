"use client";

import { useEffect, useRef } from "react";

export const HERO_READY_EVENT = "portfolio:hero-ready";

export function TrailheadArt() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let animations: Animation[] = [];
    const finish = () => { animations.forEach(animation => animation.cancel()); animations = []; };
    const draw = () => {
      finish();
      if (motion.matches || (process.env.NODE_ENV === "development" && document.documentElement.dataset.revealVariant)) return;
      animations = [...root.current!.querySelectorAll(".trailhead-trail")].map(path =>
        path.animate([{ strokeDasharray: "1", strokeDashoffset: 1 }, { strokeDasharray: "1", strokeDashoffset: 0 }], { duration: 1200, easing: "cubic-bezier(0.3, 0, 0.2, 1)" }));
    };
    document.addEventListener(HERO_READY_EVENT, draw);
    motion.addEventListener("change", finish);
    window.addEventListener("pagehide", finish);
    return () => {
      finish();
      document.removeEventListener(HERO_READY_EVENT, draw);
      motion.removeEventListener("change", finish);
      window.removeEventListener("pagehide", finish);
    };
  }, []);
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
