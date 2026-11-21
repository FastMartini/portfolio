// "Branding iron" greeting. Two presses — "Howdy," then "I'm Diego." —
// each lands white-hot, sinks into the paper, throws sparks and a smoke wisp,
// then cools to ink and stays debossed. Heat, sparks, smoke and scorch fade
// before the settle; the deboss is kept, and the real <h1> carries the same
// --brand-deboss shadow, so the swap has no jump.
type Add = (target: Element | null, frames: Keyframe[], timing: KeyframeAnimationOptions) => Animation | null;

export const BRAND = {
  presses: [120, 900], // ms after greeting start, one per line — a full beat between them
  cool: 720,           // hot → ink, per letter
  stagger: 26,         // cooling sweeps left → right
  settle: 2150,        // every glow, spark and halo is gone; only the deboss remains
};

const HOT = ["#ffe3a0", "#ffb24d", "#e8661f", "#9a3412", "#5a2312"];
// A tight orange rim keeps the white-hot first frame legible on cream paper.
// Heat halos as [blur em, r, g, b, alpha]. Always three, always centred, so
// hot → warm → cold only changes blur and alpha, never the cut edges.
type Halo = [blur: number, r: number, g: number, b: number, a: number];
const GLOW: Halo[] = [[0.015, 235, 110, 30, 0.95], [0.12, 255, 140, 40, 0.7], [0.4, 255, 90, 20, 0.38]];
const WARM: Halo[] = [[0.03, 255, 170, 80, 0.35], [0.12, 230, 90, 30, 0.22], [0.3, 200, 60, 20, 0.08]];
const COLD: Halo[] = WARM.map(([blur, r, g, b]) => [blur, r, g, b, 0]);
// Fallback only: hero.css defines --brand-deboss per surface (paper, light page, dark page).
const DEBOSS = "0 -0.012em 0 rgba(40,15,5,0.42), 0 0.016em 0 rgba(255,250,235,0.7), 0 0 0 transparent";
// The iron's stroke, in ms after contact: the cut deepens with the sink in the
// scale track below, bottoms out slightly past final depth, then the paper
// relaxes onto exactly --brand-deboss while the letters are still hot.
const PRESS = { bottom: 144, relax: 320, overpress: 1.3 };

type Edge = { lengths: { value: number; unit: string }[]; color: string };
const splitShadows = (value: string) => value.split(/,(?![^()]*\))/).map(part => part.trim()).filter(Boolean);
function parseDeboss(value: string): Edge[] | null {
  const edges = splitShadows(value).map(shadow => {
    const color = shadow.match(/rgba?\([^)]*\)|hsla?\([^)]*\)|#[0-9a-f]{3,8}\b|transparent/i)?.[0];
    const lengths = shadow.replace(color ?? "", " ").trim().split(/\s+/).filter(Boolean).map(token => {
      const match = token.match(/^(-?[\d.]+)([a-z%]*)$/i);
      return match ? { value: parseFloat(match[1]), unit: match[2] } : null;
    });
    return color && lengths.length >= 2 && lengths.length <= 3 && lengths.every(Boolean)
      ? { lengths: lengths as Edge["lengths"], color } : null;
  });
  return edges.length && edges.every(Boolean) ? edges as Edge[] : null;
}
// depth 0: edges hidden directly under the glyph. depth 1: the settled deboss.
const cut = (edges: Edge[], depth: number) => edges.map(({ lengths, color }) =>
  `${lengths.map(({ value, unit }) => `${+(value * depth).toFixed(5)}${unit || (value ? "px" : "")}`).join(" ")} ${color}`);
const halos = (list: Halo[]) => list.map(([blur, r, g, b, a]) => `0 0 ${+blur.toFixed(5)}em rgba(${r},${g},${b},${+a.toFixed(4)})`);
const mixHalos = (from: Halo[], to: Halo[], t: number): Halo[] =>
  from.map((halo, i) => halo.map((v, k) => v + (to[i][k] - v) * t) as Halo);

// Same sparks and smoke on every replay, so the two map entries render consistently.
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function piece(line: HTMLElement, className: string, box: { left: number; top: number; width: number; height: number }) {
  const el = line.ownerDocument.createElement("span");
  el.className = className;
  el.setAttribute("aria-hidden", "true");
  Object.assign(el.style, { left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px`, height: `${box.height}px` });
  line.append(el);
  return el;
}

/**
 * copy: a greeting copy already split into `.hero-reveal-letter` spans
 * inside `.trailhead-title-line`s. decorate: add heat, scorch, sparks and smoke
 * (only the visible paper copy needs them).
 */
export function brandGreeting(copy: HTMLElement, start: number, add: Add, decorate: boolean) {
  const style = getComputedStyle(copy), ink = style.color;
  const edges = parseDeboss(style.getPropertyValue("--brand-deboss").trim()) ?? parseDeboss(DEBOSS)!;
  const end = start + BRAND.settle;
  const lines = [...copy.querySelectorAll<HTMLElement>(".trailhead-title-line")];
  lines.forEach((line, index) => {
    const press = start + BRAND.presses[index];
    const letters = [...line.querySelectorAll<HTMLElement>(".hero-reveal-letter")];
    const sink = index === 0 ? 0.985 : 0.98;
    letters.forEach((letter, i) => {
      letter.style.transformOrigin = "50% 80%";
      const cooled = BRAND.cool + i * BRAND.stagger, total = end - press;
      add(letter, [{ opacity: 0 }, { opacity: 1 }], { delay: press, duration: 40, fill: "both" });
      add(letter, [{ transform: "scale(1.035)" }, { transform: `scale(${sink})`, offset: 0.45 }, { transform: "scale(1)" }],
        { delay: press, duration: 320, easing: "cubic-bezier(0.3, 0, 0.2, 1)", fill: "both" });
      add(letter, [
        { color: HOT[0] }, { color: HOT[1], offset: 0.12 }, { color: HOT[2], offset: 0.32 },
        { color: HOT[3], offset: 0.55 }, { color: HOT[4], offset: 0.75 }, { color: ink },
      ], { delay: press + i * BRAND.stagger, duration: BRAND.cool, easing: "linear", fill: "both" });
      // One shadow list per frame — cut edges first, heat halos after — with the
      // same count and order throughout, so each shadow interpolates in place.
      // Linear overall; offsets are real milliseconds after contact.
      const warm = cooled * 0.45;
      const heatAt = (ms: number) => ms <= warm
        ? mixHalos(GLOW, WARM, ms / warm)
        : mixHalos(WARM, COLD, Math.min(1, (ms - warm) / (cooled - warm)));
      const frame = (ms: number, depth: number, easing = "linear"): Keyframe => ({
        offset: Math.min(1, ms / total), easing, textShadow: [...cut(edges, depth), ...halos(heatAt(ms))].join(", "),
      });
      add(letter, [
        frame(0, 0, "cubic-bezier(0.3, 0, 0.2, 1)"),
        frame(PRESS.bottom, PRESS.overpress, "ease-out"),
        frame(PRESS.relax, 1),
        ...(warm > PRESS.relax ? [frame(warm, 1, "ease-out")] : []),
        frame(Math.max(cooled, PRESS.relax + 1), 1),
        { offset: 1, textShadow: [...cut(edges, 1), ...halos(COLD)].join(", ") },
      ], { delay: press, duration: total, easing: "linear", fill: "both" });
    });
    if (!decorate || !letters.length) return;

    // Layout units (offset*), not client rects: the paper copy sits under the zoomed camera.
    line.style.position = "relative";
    const h = line.offsetHeight;
    const spots = letters.map(letter => {
      const word = letter.offsetParent as HTMLElement | null;
      const x = (word && word !== line ? word.offsetLeft : 0) + letter.offsetLeft;
      return { x, w: letter.offsetWidth };
    });
    const minX = Math.min(...spots.map(s => s.x)), maxX = Math.max(...spots.map(s => s.x + s.w));
    const width = maxX - minX;

    const heat = piece(line, "hero-brand-heat", { left: minX - h * 0.3, top: -h * 0.15, width: width + h * 0.6, height: h * 1.3 });
    add(heat, [{ opacity: 0 }, { opacity: 1, offset: 120 / 380 }, { opacity: 0 }], { delay: press - 120, duration: 380, easing: "ease-out", fill: "both" });

    const scorch = piece(line, "hero-brand-scorch", { left: minX - h * 0.2, top: -h * 0.05, width: width + h * 0.4, height: h * 1.1 });
    const life = end - press;
    add(scorch, [
      { opacity: 0, transform: "scale(0.92)" }, { opacity: 1, transform: "scale(1)", offset: 220 / life },
      { opacity: 0.85, transform: "scale(1)", offset: 0.55 }, { opacity: 0, transform: "scale(1.02)" },
    ], { delay: press, duration: life, easing: "ease-out", fill: "both" });

    const random = seeded(17 + index * 101);
    // Sparks: a dense burst on contact plus a few slower, longer-flying embers.
    for (let k = 0; k < 34; k++) {
      const spot = spots[Math.floor(random() * spots.length)];
      const big = k % 6 === 0, size = big ? 3.5 + random() * 2 : 1.5 + random() * 2.4;
      const spark = piece(line, "hero-brand-spark", {
        left: spot.x + spot.w * (0.1 + random() * 0.8), top: h * (0.25 + random() * 0.6), width: size, height: size,
      });
      const reach = big ? 1.6 : 1.1, dx = (random() - 0.5) * h * reach, dy = -h * (0.15 + random() * (big ? 0.7 : 0.45));
      add(spark, [
        { opacity: 1, transform: "translate(0, 0) scale(1)" },
        { opacity: 1, transform: `translate(${dx * 0.6}px, ${dy}px) scale(0.85)`, offset: 0.5 },
        { opacity: 0, transform: `translate(${dx}px, ${dy + h * 0.35}px) scale(0.4)` },
      ], { delay: press + random() * 60, duration: (big ? 620 : 360) + random() * 260, easing: "cubic-bezier(0.2, 0.6, 0.4, 1)", fill: "forwards" });
    }
    for (let k = 0; k < 9; k++) {
      const size = h * (0.75 + random() * 0.5);
      const smoke = piece(line, "hero-brand-smoke", {
        left: minX + width * (0.05 + k * 0.11) - size / 2 + (random() - 0.5) * h * 0.25, top: -h * (0.1 + random() * 0.2), width: size, height: size * 1.4,
      });
      const drift = (random() - 0.3) * h * 0.35;
      const delay = press + 140 + random() * 260;
      const duration = Math.min(1100 + random() * 500, end - delay);
      add(smoke, [
        { opacity: 0, transform: "translate(0, 0) scale(0.5)" },
        { opacity: 1, transform: `translate(${drift * 0.3}px, ${-h * 0.25}px) scale(0.9)`, offset: 0.25 },
        { opacity: 0, transform: `translate(${drift}px, ${-h * 0.9}px) scale(1.7)` },
      ], { delay, duration, easing: "cubic-bezier(0.2, 0.5, 0.3, 1)", fill: "both" });
    }
  });
}
