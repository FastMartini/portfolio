"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";

/**
 * Splash intro for Diego Martinez's portfolio.
 *
 * Design rules this component must keep:
 *  - Page content is in the DOM and usable the whole time. The overlay is
 *    aria-hidden, not focusable, and has pointer-events: none (see splash.css).
 *  - CSS alone removes it. The effect below only adds conveniences
 *    (skip on interaction, failsafe, remember-per-session).
 */

const ROUTE =
  "M -20 860 C 160 830 280 740 430 735 C 600 730 680 690 820 650 C 960 610 1040 560 1120 520 C 1190 485 1220 460 1260 430";

function Word({ text }: { text: string }) {
  return (
    <span className="splash-name-line">
      {Array.from(text).map((char, i) => (
        <span
          className="splash-char"
          data-c={char}
          key={`${char}-${i}`}
          style={{ "--i": i } as CSSProperties}
        >
          <span className="splash-glyph">{char}</span>
        </span>
      ))}
    </span>
  );
}

export function Splash() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || document.documentElement.dataset.splash === "seen") return;

    let active = true;
    const remember = () => {
      try {
        sessionStorage.setItem("splash-seen", "1");
      } catch {}
    };
    const finish = () => {
      active = false;
      window.clearTimeout(failsafe);
      remember();
    };
    const skip = () => {
      if (!active) return;
      finish();
      el.classList.add("splash--skipped");
    };

    // Failsafe: even if animations never fire, the splash goes away.
    const failsafe = window.setTimeout(skip, 5000);

    const events = ["pointerdown", "keydown", "wheel", "touchstart"] as const;
    events.forEach((evt) => window.addEventListener(evt, skip, { passive: true }));
    const onEnd = (e: AnimationEvent) => {
      if (e.target === el) finish();
    };
    el.addEventListener("animationend", onEnd);

    return () => {
      window.clearTimeout(failsafe);
      events.forEach((evt) => window.removeEventListener(evt, skip));
      el.removeEventListener("animationend", onEnd);
    };
  }, []);

  return (
    <div className="splash" aria-hidden="true" ref={ref}>
      <svg
        className="splash-art"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMax slice"
        focusable="false"
      >
        <defs>
          <mask
            id="splash-route-reveal"
            maskUnits="userSpaceOnUse"
            x="0"
            y="0"
            width="1440"
            height="900"
          >
            <path className="splash-route-mask" pathLength={1} d={ROUTE} />
          </mask>
          <path
            id="splash-ridge-line"
            d="M0 700 L180 610 L320 690 L520 560 L700 660 L900 520 L1080 620 L1260 430 L1440 560"
          />
        </defs>
        <path
          className="splash-ridge-far"
          d="M0 900 L0 700 L180 610 L320 690 L520 560 L700 660 L900 520 L1080 620 L1260 430 L1440 560 L1440 900 Z"
        />
        <path
          className="splash-ridge-near"
          d="M0 900 L0 790 L220 720 L400 780 L640 690 L860 760 L1060 660 L1260 750 L1440 690 L1440 900 Z"
        />
        <use href="#splash-ridge-line" className="splash-ridge-contour" transform="translate(0 34)" />
        <use href="#splash-ridge-line" className="splash-ridge-contour" transform="translate(0 68)" />
        <use href="#splash-ridge-line" className="splash-ridge-contour" transform="translate(0 102)" />

        <path className="splash-route" mask="url(#splash-route-reveal)" d={ROUTE} />
        <circle className="splash-climber" r={5.5} />

        <g transform="translate(1260 430)">
          <g className="splash-summit">
            <circle className="splash-summit-ring" r={15} />
            <circle className="splash-summit-dot" r={4.5} />
          </g>
          <line className="splash-flag-pole" x1={0} y1={0} x2={0} y2={-96} />
          <g className="splash-flag-flutter">
            <path
              className="splash-flag-cloth"
              d="M1.2 -94 C 20 -101 40 -88 64 -94 L 53 -78 L 64 -62 C 40 -68 20 -56 1.2 -62 Z"
            />
          </g>
        </g>
      </svg>

      <div className="splash-name">
        <div>
          <Word text="Diego" />
          <Word text="Martinez" />
        </div>
        <p className="splash-role">Software engineer</p>
      </div>
    </div>
  );
}
