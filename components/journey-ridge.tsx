export function JourneyRidge({ summit = false }: { summit?: boolean }) {
  return (
    <svg
      className={`journey-ridge${summit ? " journey-ridge--summit" : ""}`}
      aria-hidden="true"
      viewBox="0 0 1440 700"
      preserveAspectRatio="xMidYMax slice"
    >
      <path className="ridge-distance" d="M0 570 115 485 205 530 420 270 537 388 701 215 815 351 940 170 1035 305 1210 115 1440 425V700H0Z" />
      <path className="ridge-near" d="M0 662 186 528 274 585 513 402 641 525 848 312 964 411 1122 240 1231 361 1440 292V700H0Z" />
      <g className="ridge-contours" fill="none">
        <path d="M-70 620C140 410 185 710 420 443S658 650 859 399s249-140 405-238 235 4 275 119" />
        <path d="M-70 650C140 440 185 740 420 473S658 680 859 429s249-140 405-238 235 4 275 119" />
        <path d="M-70 680C140 470 185 770 420 503S658 710 859 459s249-140 405-238 235 4 275 119" />
        <path d="M-70 710C140 500 185 800 420 533S658 740 859 489s249-140 405-238 235 4 275 119" />
      </g>
      <path className="ridge-route" d="M-20 675C190 660 257 537 430 560S600 499 722 528 920 476 1000 396 1070 350 1122 240" fill="none" />
      {summit ? <circle className="ridge-sun" cx="1210" cy="115" r="62" /> : null}
    </svg>
  );
}

export function WaypointTrail({ alternate }: { alternate: boolean }) {
  return (
    <svg className="waypoint-trail" aria-hidden="true" viewBox="0 0 80 1000" preserveAspectRatio="none">
      <path
        d={alternate
          ? "M40 0C40 160 68 230 60 370S12 520 24 670 40 850 40 1000"
          : "M40 0C40 160 12 230 20 370S68 520 56 670 40 850 40 1000"}
        fill="none"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
