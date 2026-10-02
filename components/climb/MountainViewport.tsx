"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

import { createMountainRenderer } from "./mountain/render";

export function MountainViewport({ children, trailPosition }: { children: ReactNode; trailPosition: number }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = root.current;
    if (!host) return;
    // The large SVG is server-built once. Resizing only changes view attributes.
    const draw = createMountainRenderer(host);
    const render = () => draw(trailPosition);
    render();
    const observer = new ResizeObserver(render);
    observer.observe(host);
    return () => observer.disconnect();
  }, [trailPosition]);

  return <div className="climb-mountain" ref={root} aria-hidden="true">{children}</div>;
}
