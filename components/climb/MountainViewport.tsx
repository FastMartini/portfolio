"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

import { mountainView, trailLength } from "./mountain/geometry";

export function MountainViewport({ children, trailPosition }: { children: ReactNode; trailPosition: number }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = root.current;
    if (!host) return;
    const svg = host.querySelector<SVGSVGElement>("svg.mtn");
    const distant = host.querySelectorAll<SVGSVGElement>("svg.far");
    const walked = host.querySelector<SVGPathElement>("#a-walked");
    const climber = host.querySelector<SVGGElement>("#a-climber");
    if (!svg || !walked || !climber) return;

    // The large SVG is server-built once. Resizing only changes view attributes.
    const render = () => {
      const view = mountainView(trailPosition, host.clientWidth, host.clientHeight);
      svg.style.transform = `translate(${view.x.toFixed(1)}px,${view.y.toFixed(1)}px) scale(${view.scale.toFixed(4)})`;
      distant.forEach((layer, index) => {
        layer.style.transform = `translateY(${(trailPosition * host.clientHeight * (index === 0 ? 0.45 : 0.75)).toFixed(1)}px)`;
      });
      walked.setAttribute("stroke-dashoffset", (trailLength * (1 - trailPosition)).toFixed(1));
      climber.setAttribute("transform", `translate(${view.point[0].toFixed(1)} ${view.point[1].toFixed(1)})`);
      host.dataset.ready = "true";
    };
    render();
    const observer = new ResizeObserver(render);
    observer.observe(host);
    return () => observer.disconnect();
  }, [trailPosition]);

  return <div className="climb-mountain" ref={root} aria-hidden="true">{children}</div>;
}
