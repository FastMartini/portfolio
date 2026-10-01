"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useScroll } from "motion/react";
import type { MotionValue } from "motion/react";

import type { JourneySection } from "../content/journey";

const AscentProgressContext = createContext<MotionValue<number> | null>(null);

// Future atmospheric consumers share this signal without rerendering on each frame.
export function useAscentProgress() {
  return useContext(AscentProgressContext);
}

export function Ascent({
  children,
  sections,
}: {
  children: ReactNode;
  sections: readonly JourneySection[];
}) {
  const root = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ trackContentSize: true });
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const activeIndex = useRef(-1);
  const current = sections[currentIndex ?? 0];

  useEffect(() => {
    const element = root.current;
    if (!element) return;

    let positions: number[] = [];
    let scrollRange = 0;
    let readingOffset = 180;
    let resizeFrame = 0;

    const updateLocation = (scrollPosition: number) => {
      const readingLine = scrollPosition + readingOffset;
      let nextIndex = 0;
      for (let index = 0; index < positions.length; index++) {
        if (positions[index] <= readingLine) nextIndex = index;
      }
      if (scrollRange > 0 && scrollPosition >= scrollRange - 2) {
        nextIndex = sections.length - 1;
      }
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

    // Motion owns scrolling; this subscriber only reads it and updates section boundaries.
    const unsubscribe = scrollYProgress.on("change", (progress) => {
      updateLocation(progress * scrollRange);
    });
    const resizeObserver = new ResizeObserver(scheduleMeasure);
    resizeObserver.observe(element);
    window.addEventListener("resize", scheduleMeasure);
    scheduleMeasure();

    return () => {
      unsubscribe();
      resizeObserver.disconnect();
      window.removeEventListener("resize", scheduleMeasure);
      cancelAnimationFrame(resizeFrame);
    };
  }, [scrollYProgress, sections]);

  useEffect(() => {
    const markers = root.current?.querySelectorAll<HTMLAnchorElement>("[data-waypoint-marker]");
    markers?.forEach((marker) => {
      if (marker.hash === `#${current.id}`) marker.setAttribute("aria-current", "location");
      else marker.removeAttribute("aria-current");
    });

    const navigation = document.querySelectorAll<HTMLAnchorElement>(
      ".site-header:not(.site-header--case-study) nav a",
    );
    navigation.forEach((link) => {
      if (link.hash === `#${current.navigation}`) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  }, [current]);

  return (
    <AscentProgressContext.Provider value={scrollYProgress}>
      <div className="mountain-journey" ref={root} data-enhanced={currentIndex !== null ? true : undefined}>
        {children}
        <aside className="route-indicator" aria-label="Mountain Journey location">
          <p className="route-caption">Along the Ascent</p>
          <nav aria-label="Route Indicator">
            <ol>
              {sections.map((section, index) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    aria-label={`Go to ${section.label}`}
                    aria-current={index === currentIndex ? "location" : undefined}
                    title={section.label}
                  >
                    <span className="route-dot" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <p className="route-location">
            <span className="route-section">{current.label}</span>
            <span className="route-elevation"><span>Elevation</span>{current.elevation}</span>
          </p>
        </aside>
      </div>
    </AscentProgressContext.Provider>
  );
}
