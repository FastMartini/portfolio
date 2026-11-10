"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { startSplash } from "./controller";
import { splashMarkup, splashStyle } from "./map/markup";

const markup = splashMarkup("opening");

// Server-rendered artwork: the prepaint gate opts in, and CSS alone exits.
// The controller measures the real heading and handles input/cleanup.
export function Splash() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const controller = startSplash(ref.current);
    return () => controller?.skip();
  }, []);
  return <div className="splash" aria-hidden="true" ref={ref}
    style={splashStyle as CSSProperties} dangerouslySetInnerHTML={{ __html: markup }} />;
}
