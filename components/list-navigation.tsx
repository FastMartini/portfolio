"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import type { JourneySection } from "../content/journey";

export function ListNavigation({
  children,
  sections,
}: {
  children: ReactNode;
  sections: readonly JourneySection[];
}) {
  const root = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const activeIndex = useRef(-1);
  const current = sections[currentIndex ?? 0];

  useEffect(() => {
    const element = root.current;
    if (!element || typeof requestAnimationFrame !== "function" || typeof cancelAnimationFrame !== "function") return;
    const navigation = document.querySelectorAll<HTMLAnchorElement>(".site-header:not(.site-header--case-study) nav a");

    let positions: number[] = [];
    let scrollRange = 0;
    let readingOffset = 180;
    let resizeFrame = 0;

    const updateLocation = (scrollPosition: number) => {
      if (!element.getClientRects().length) return;
      const readingLine = scrollPosition + readingOffset;
      let nextIndex = 0;
      for (let index = 0; index < positions.length; index++) {
        if (positions[index] <= readingLine) nextIndex = index;
      }
      if (scrollRange > 0 && scrollPosition >= scrollRange - 2) {
        nextIndex = sections.length - 1;
      }
      // Reclaim the shared header when returning from Climb, even if this
      // reading position is the same as the last List View position.
      navigation.forEach((link) => {
        if (link.hash === `#${sections[nextIndex].navigation}`) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
      if (nextIndex === activeIndex.current) return;

      activeIndex.current = nextIndex;
      setCurrentIndex(nextIndex);
    };

    const measure = () => {
      positions = sections.map((section) => {
        const target = document.getElementById(section.id);
        return target ? target.getBoundingClientRect().top + window.scrollY : Infinity;
      });
      scrollRange = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const firstSection = document.getElementById(sections[0].id);
      const anchorMargin = firstSection ? parseFloat(getComputedStyle(firstSection).scrollMarginTop) : 0;
      readingOffset = Math.max(Math.min(window.innerHeight * 0.25, 180), anchorMargin + 12);
      updateLocation(window.scrollY);
    };

    const scheduleMeasure = () => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(measure);
    };

    const readScroll = () => updateLocation(window.scrollY);
    // Section orientation is optional: durable content must also hydrate when
    // the browser cannot supply the Climb's required observer.
    let resizeObserver: ResizeObserver | undefined;
    try {
      if (typeof ResizeObserver === "function") {
        resizeObserver = new ResizeObserver(scheduleMeasure);
        resizeObserver.observe(element);
      }
    } catch { resizeObserver?.disconnect(); resizeObserver = undefined; }
    window.addEventListener("resize", scheduleMeasure);
    window.addEventListener("scroll", readScroll, { passive: true });
    scheduleMeasure();

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", scheduleMeasure);
      window.removeEventListener("scroll", readScroll);
      cancelAnimationFrame(resizeFrame);
    };
  }, [sections]);

  useEffect(() => {
    const markers = root.current?.querySelectorAll<HTMLAnchorElement>("[data-waypoint-marker]");
    markers?.forEach((marker) => {
      if (marker.hash === `#${current.id}`) marker.setAttribute("aria-current", "location");
      else marker.removeAttribute("aria-current");
    });
  }, [current]);

  return (
    <div className="mountain-journey" ref={root} data-enhanced={currentIndex !== null ? true : undefined}>
      {children}
    </div>
  );
}
