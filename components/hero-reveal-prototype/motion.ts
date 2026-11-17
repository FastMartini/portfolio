import { BRAND, brandGreeting } from "./brand";

// THROWAWAY: greeting motions on the existing List View; layout stays fixed.
// shift: extra ms added to every handoff clock after the greeting (wipe, swap, overlay end).
// lead: when intro + actions begin rising, relative to greeting start.
export const revealVariants = [
  { id: "letterpress", name: "Letterpress", duration: 1080, lead: 1080, shift: 0, detail: "Ripple → first-line beat → faster second line → period." },
  { id: "trail-drawn", name: "Trail-drawn reveal", duration: 1100, lead: 1100, shift: 0, detail: "Copper cue → nearby letters → onward along the route." },
  { id: "paper-fold", name: "Paper-fold reveal", duration: 1040, lead: 1040, shift: 0, detail: "Upper fold → lower fold; the lettering stays anchored." },
  { id: "trail-sign", name: "Trail sign", duration: 960, lead: 960, shift: 0, detail: "Howdy settles as one piece → tighter letter rise." },
  { id: "branding-iron", name: "Branding iron", duration: BRAND.settle, lead: BRAND.lead, shift: BRAND.shift, detail: "Howdy, pressed white-hot → full beat → I'm Diego. pressed → both cool to ink. Stays debossed. Contour lines are bluesy guitar strings." },
] as const;
export type RevealVariant = typeof revealVariants[number]["id"];
export function activeReveal() {
  if (process.env.NODE_ENV !== "development" || typeof document === "undefined") return null;
  return revealVariants.find(variant => variant.id === document.documentElement.dataset.revealVariant) ?? null;
}
type Add = (target: Element | null, frames: Keyframe[], timing: KeyframeAnimationOptions) => Animation | null;

function letters(copy: HTMLElement) {
  for (const word of copy.querySelectorAll<HTMLElement>(".splash-word")) {
    const text = word.firstChild!, box = word.getBoundingClientRect();
    const positions = [...(text.textContent ?? "")].map((character, i) => {
      const range = document.createRange(); range.setStart(text, i); range.setEnd(text, i + 1);
      return { character, left: range.getBoundingClientRect().left - box.left };
    });
    const size = document.createElement("span"); size.textContent = text.textContent; size.style.visibility = "hidden";
    word.replaceChildren(size);
    for (const { character, left } of positions) {
      const span = document.createElement("span"); span.className = "prototype-reveal-letter";
      span.textContent = character;
      Object.assign(span.style, { position: "absolute", left: `${left}px`, top: "0", display: "inline-block" });
      word.append(span);
    }
  }
}

export function prototypeReveal(paper: HTMLElement, page: HTMLElement, add: Add) {
  const variant = activeReveal()!;
  const start = 4420, end = start + variant.duration;
  add(paper, [{ opacity: 0 }, { opacity: 1 }], { delay: start, duration: 1, fill: "both" });
  letters(paper);
  page.replaceChildren(...[...paper.childNodes].map(node => node.cloneNode(true)));
  const copies = [paper, page];
  const rise = (target: Element, delay: number, duration: number, distance: number, press = false) => add(target,
    press
      ? [{ opacity: 0, transform: `translateY(${-distance}px)` }, { opacity: 1, transform: "translateY(1px)", offset: 0.72 }, { opacity: 1, transform: "translateY(0)" }]
      : [{ opacity: 0, transform: `translateY(${distance}px)` }, { opacity: 1, transform: "translateY(0)" }],
    { delay: start + delay, duration, fill: "both", easing: "cubic-bezier(0.2, 0.7, 0.3, 1)" });

  for (const copy of copies) {
    const lines = [...copy.querySelectorAll<HTMLElement>(".trailhead-title-line")];
    const first = [...lines[0].querySelectorAll<HTMLElement>(".prototype-reveal-letter")];
    const second = [...lines[1].querySelectorAll<HTMLElement>(".prototype-reveal-letter")];
    if (variant.id === "branding-iron") {
      brandGreeting(copy, start, add, copy === paper);
    } else if (variant.id === "letterpress") {
      first.forEach((letter, i) => rise(letter, i * 42, 200, 3, true));
      second.forEach((letter, i) => rise(letter, i === second.length - 1 ? 1000 : 530 + i * 38, i === second.length - 1 ? 80 : 160, 2, true));
    } else if (variant.id === "trail-drawn") {
      first.forEach((letter, i) => rise(letter, 50 + i * 60, 170, 4));
      second.forEach((letter, i) => rise(letter, i === second.length - 1 ? 1020 : 500 + i * 45, i === second.length - 1 ? 80 : 180, 4));
    } else if (variant.id === "trail-sign") {
      add(lines[0], [{ opacity: 0, transform: "translateY(-6px) rotate(-1.6deg)" }, { opacity: 1, transform: "translateY(1px) rotate(0.25deg)", offset: 0.75 }, { opacity: 1, transform: "translateY(0) rotate(0deg)" }], { delay: start, duration: 420, fill: "both", easing: "cubic-bezier(0.2, 0.7, 0.3, 1)" });
      second.forEach((letter, i) => rise(letter, i === second.length - 1 ? 880 : 360 + i * 44, i === second.length - 1 ? 80 : 220, 6));
    } else {
      lines.forEach((line, i) => {
        const delay = start + i * 480, duration = i === 0 ? 440 : 480;
        add(line, [{ clipPath: "inset(-12% 0 112% 0)" }, { clipPath: "inset(-12% 0 -12% 0)" }], { delay, duration, fill: "both", easing: "cubic-bezier(0.35, 0, 0.2, 1)" });
        const fold = document.createElement("span"); fold.className = "prototype-paper-fold";
        const rect = line.getBoundingClientRect(), parent = copy.getBoundingClientRect();
        Object.assign(fold.style, { left: `${rect.left - parent.left}px`, top: `${rect.top - parent.top - 2}px`, width: `${rect.width}px`, height: `${rect.height + 4}px`, backgroundColor: copy === paper || document.documentElement.dataset.theme === "light" ? "#f3eedd" : "#1a211d" });
        copy.append(fold);
        add(fold, [{ transform: "perspective(800px) rotateX(0deg)", opacity: 1 }, { transform: "perspective(800px) rotateX(-92deg)", opacity: 0 }], { delay, duration, fill: "both", easing: "cubic-bezier(0.35, 0, 0.2, 1)" });
      });
    }
  }

  if (variant.id === "trail-drawn") {
    // A temporary leading segment meets the actual route's start. The latter
    // keeps its existing geometry in all four variants and after the cue fades.
    for (const copy of copies) {
      const bounds = copy.getBoundingClientRect();
      const lines = [...copy.querySelectorAll<HTMLElement>(".trailhead-title-line")].map(line => line.getBoundingClientRect());
      const ns = "http://www.w3.org/2000/svg", svg = document.createElementNS(ns, "svg"), path = document.createElementNS(ns, "path");
      svg.classList.add("prototype-trail-cue"); svg.setAttribute("viewBox", `0 0 ${bounds.width + 100} ${bounds.height + 40}`);
      const y1 = lines[0].height * 0.9, y2 = lines[1].bottom - bounds.top - 3;
      const x1 = copy.querySelector<HTMLElement>(".splash-word")!.getBoundingClientRect().right - bounds.left, x2 = bounds.width;
      const route = [...document.querySelectorAll<SVGSVGElement>(".trailhead-route")].find(svg => getComputedStyle(svg).display !== "none")!.querySelector<SVGPathElement>("path")!;
      const origin = route.getPointAtLength(0).matrixTransform(route.getScreenCTM()!);
      const join = { x: origin.x - bounds.left, y: origin.y - bounds.top };
      const pieces = [
        `M0 ${y1}H${x1}`,
        `L-18 ${y1}Q-24 ${y1} -24 ${y1 + 6}V${y2 - 8}Q-24 ${y2} 0 ${y2}`,
        `H${x2}`,
        `C${join.x + 20} ${y2} ${join.x + 20} ${join.y} ${join.x} ${join.y}`,
      ];
      svg.append(path); copy.prepend(svg);
      let d = "";
      const lengths = pieces.map(piece => { d += piece; path.setAttribute("d", d); return path.getTotalLength(); });
      path.setAttribute("pathLength", "1"); path.setAttribute("fill", "none"); path.setAttribute("stroke", "#b5653b"); path.setAttribute("stroke-width", "1.5");
      add(path, [
        { strokeDasharray: "1", strokeDashoffset: 1, offset: 0 },
        ...[0.4, 0.45, 0.94, 1].map((offset, i) => ({ strokeDasharray: "1", strokeDashoffset: 1 - lengths[i] / lengths[3], offset })),
      ], { delay: start, duration: variant.duration, fill: "both", easing: "linear" });
      add(svg, [{ opacity: 0.75 }, { opacity: 0 }], { delay: end, duration: 180, fill: "forwards" });
    }
  }
  document.querySelectorAll(".trailhead-trail").forEach(trail => add(trail,
    [{ strokeDasharray: "1", strokeDashoffset: 1 }, { strokeDasharray: "1", strokeDashoffset: 0 }],
    { delay: end, duration: 750, fill: "both", easing: "cubic-bezier(0.3, 0, 0.2, 1)" }));
  for (const target of document.querySelectorAll(".trailhead-lead, .trailhead-actions")) rise(target, variant.lead, 320, 5);
  return variant;
}
