// Generates the map-handling keyframes. Every curve is authored as a function
// of absolute time on one shared timeline, sampled, then simplified so the CSS
// stays small. All lengths are multiples of --w (centre pane width) or --ph
// (row height), so the same keyframes serve every viewport size.


import { readFileSync } from "node:fs";
const OPEN = JSON.parse(readFileSync(new URL("../../components/splash/timing.json", import.meta.url), "utf8"));
const TOTAL = OPEN.end;
const DEG = Math.PI / 180;

function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t) => ((ax * t + bx) * t + cx) * t, sy = (t) => ((ay * t + by) * t + cy) * t;
  const dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => {
    let t = x;
    for (let i = 0; i < 8; i++) { const e = sx(t) - x; if (Math.abs(e) < 1e-6) break; const d = dx(t); if (Math.abs(d) < 1e-6) break; t -= e / d; }
    t = Math.min(1, Math.max(0, t));
    return sy(t);
  };
}
const EASE = {
  linear: (x) => x,
  in: bezier(0.42, 0, 1, 1),
  out: bezier(0.2, 0.7, 0.3, 1),
  inout: bezier(0.45, 0, 0.55, 1),
  snap: bezier(0.38, 0, 0.18, 1),   // release after resistance: quick, then a long soft landing
  give: bezier(0.3, 0.6, 0.5, 1),   // the first small give of a crease
  leave: bezier(0.5, 0, 0.8, 0.45),
};
// A track is [[time, value, ease?], ...]; ease belongs to the segment arriving at that point.
function track(points) {
  return (t) => {
    if (t <= points[0][0]) return points[0][1];
    for (let i = 1; i < points.length; i++) {
      const [t1, v1, e = "inout"] = points[i];
      if (t <= t1) {
        const [t0, v0] = points[i - 1];
        return v0 + (v1 - v0) * EASE[e]((t - t0) / (t1 - t0));
      }
    }
    return points[points.length - 1][1];
  };
}
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// Drift is a parent transform: the original paper and every printed face move
// together. Fold curves begin only after the descent and settled pause.
const foldTime = (t) => OPEN.foldStart + t * (OPEN.unfold - OPEN.foldStart) / 1850;
const foldTrack = (points) => track(points.map(([t, value, ease]) => [foldTime(t), value, ease]));
const landing = track([[0, 0], [OPEN.descent * 0.7, 0], [OPEN.descent, 1]]);

// ------------------------------------------------------------------ curves
const T = {
  arrivalY: track([[0, 1], [OPEN.descent, 0]]),
  arrivalX: track([[0, -0.1], [450, 0.1], [1050, -0.07], [1550, 0.025], [OPEN.descent, 0]]),
  arrivalR: track([[0, -3], [600, 4], [1200, -2], [1650, 0.5], [OPEN.descent, 0]]),
  rigS: foldTrack([[0, 0.985], [250, 0.985], [430, 1.045, "out"], [1350, 1.045], [1560, 0.993], [1760, 1]]),
  rigY: foldTrack([[0, 0], [250, 0], [430, -0.012, "out"], [1350, -0.012], [1720, 0]]),
  rigR: foldTrack([[0, -5.5], [300, -5.5], [352, -3.5], [410, -6.1], [468, -3.9], [535, -4.9], [620, -4.4], [1300, -1.1], [1720, 0]]),
  rigX: foldTrack([[0, 0], [300, 0], [352, 0.008], [410, -0.01], [468, 0.006], [535, -0.002], [620, 0]]),
  mapY: foldTrack([[0, -0.5], [470, -0.5], [900, 0]]),                       // × --ph
  ripX: foldTrack([[0, 0], [1240, 0], [1380, 1.5], [1520, -0.75], [1660, 0.25], [1790, 0]]),
  ripY: foldTrack([[0, 0], [1260, 0], [1400, -1.1], [1540, 0.55], [1680, -0.15], [1800, 0]]),
  top: foldTrack([[0, -177], [380, -177], [450, -167, "give"], [535, -161, "linear"], [805, 4, "snap"], [875, -1.6], [945, 0]]),
  // Fully closed panels lie flat beneath the cover. A 177° resting angle
  // raises their free corners through it, exposing the inside print.
  doorL: foldTrack([[0, 180], [820, 180], [888, 165, "give"], [962, 160, "linear"], [1215, -4, "snap"], [1325, 1.3], [1425, 0]]),
  doorR: foldTrack([[0, 180], [905, 180], [962, 168, "give"], [1012, 165, "linear"], [1272, -3.2, "snap"], [1382, 1], [1482, 0]]),
  creaseRow: track([[0, 0], [foldTime(880), 0], [foldTime(960), 0.6], [foldTime(1400), 0.38], [OPEN.unfold, 0.16], [OPEN.zoom[0], 0.16], [OPEN.paper[0] - 50, 0]]),
  creaseHinge: track([[0, 0], [foldTime(1180), 0], [foldTime(1330), 0.5], [OPEN.unfold, 0.3], [OPEN.zoom[0], 0.3], [OPEN.paper[0] - 50, 0]]),
  sheen: foldTrack([[0, 0], [1240, 0], [1330, 1], [1650, 1], [1760, 0]]),
  sheenX: foldTrack([[0, -1.2], [1240, -1.2], [1760, 2.4, "inout"]]),
  faceGrain: track([[0, 1], [OPEN.zoom[0], 1], [OPEN.paper[0] - 50, 0]]),
};

const LIGHT = (() => { const v = [-0.45, -0.55, 0.7]; const n = Math.hypot(...v); return v.map((c) => c / n); })();
const FLAT = LIGHT[2];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const rotX = (n, a) => [n[0], n[1] * Math.cos(a) - n[2] * Math.sin(a), n[1] * Math.sin(a) + n[2] * Math.cos(a)];
const rotY = (n, a) => [n[0] * Math.cos(a) + n[2] * Math.sin(a), n[1], -n[0] * Math.sin(a) + n[2] * Math.cos(a)];
// Face shade from its normal; faces turned away from the camera are invisible anyway.
function shade(n) {
  if (n[2] <= 0) return 0.6;
  const b = Math.max(0, dot(n, LIGHT)) / FLAT;
  return clamp((1 - b) * 0.62, 0, 0.6);
}

// ------------------------------------------------------- sampling helpers
// Ramer–Douglas–Peucker over time keeps only the keyframes that matter.
function simplify(samples, tol) {
  const keep = new Uint8Array(samples.length); keep[0] = keep[samples.length - 1] = 1;
  const stack = [[0, samples.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let worst = -1, at = -1;
    for (let i = a + 1; i < b; i++) {
      const u = (samples[i].t - samples[a].t) / (samples[b].t - samples[a].t);
      let err = 0;
      samples[i].v.forEach((v, k) => { err = Math.max(err, Math.abs(v - (samples[a].v[k] + (samples[b].v[k] - samples[a].v[k]) * u)) / tol[k]); });
      if (err > worst) { worst = err; at = i; }
    }
    if (worst > 1) { keep[at] = 1; stack.push([a, at], [at, b]); }
  }
  return samples.filter((_, i) => keep[i]);
}
function keyframes(name, fn, tol, format, step = 1000 / 120, end = 2400) {
  const samples = [];
  for (let t = 0; t < end - 1e-6; t += step) samples.push({ t, v: fn(t) });
  samples.push({ t: end, v: fn(end) });
  const kept = simplify(samples, tol);
  const pct = (t) => `${(Math.floor(t / TOTAL * 1e8) / 1e6).toFixed(6).replace(/\.?0+$/, "")}%`;
  const body = kept.map((s) => `${pct(s.t)}{${format(s.v)}}`).join("");
  return `@keyframes ${name}{${body}100%{${format(kept[kept.length - 1].v)}}}\n`;
}
const f3 = (n) => (Math.abs(n) < 5e-5 ? "0" : n.toFixed(4).replace(/\.?0+$/, ""));
const f2 = (n) => (Math.abs(n) < 5e-3 ? "0" : n.toFixed(2).replace(/\.?0+$/, ""));
const wlen = (k) => `calc(var(--w) * ${f3(k)})`;
const plen = (k) => `calc(var(--ph) * ${f3(k)})`;

// Do not rely on GPU back-face culling of nested, coplanar paper surfaces.
// Explicitly remove the away-facing side from paint on the same fold clock.
function facingKeyframes(name, facing) {
  const step = 1000 / 240;
  const visible = (t) => facing(t) > 0;
  // A shown face must still inherit a hidden world during the hero handoff.
  const frame = (t, show) => `${(t / TOTAL * 100).toFixed(6)}%{visibility:${show ? "inherit" : "hidden"};animation-timing-function:step-end}`;
  let previous = visible(0), css = frame(0, previous);
  for (let t = step; t <= OPEN.unfold + step; t += step) {
    const end = Math.min(t, OPEN.unfold), next = visible(end);
    if (next !== previous) {
      let lo = Math.max(0, end - step), hi = end;
      for (let i = 0; i < 20; i++) {
        const mid = (lo + hi) / 2;
        if (visible(mid) === previous) lo = mid; else hi = mid;
      }
      css += frame(hi, next);
      previous = next;
    }
  }
  return `@keyframes ${name}{${css}${frame(TOTAL, previous)}}\n`;
}

function build() {
  let css = `/* Generated by scripts/splash/motion.mjs — do not edit by hand. One ${TOTAL} ms timeline. */\n`;
  const pct = (t) => `${(t / TOTAL * 100).toFixed(4)}%`;
  const zoomEnd = OPEN.zoom[0] + OPEN.zoom[1];
  const paperEnd = OPEN.paper[0] + OPEN.paper[1];
  const fadeEnd = OPEN.paperFade[0] + OPEN.paperFade[1];
  css += `.splash{--splash-duration:${TOTAL}ms}\n`;
  // Once the creases settle, the same artwork paints as a flat sheet. Mode
  // transitions start in this state, so neither hold nor zoom sorts 3D quads.
  css += `@keyframes splash-exit{0%,${pct(OPEN.unfold - 1)}{--map-depth:preserve-3d;visibility:visible}${pct(OPEN.unfold)},99.99%{--map-depth:flat;visibility:visible}100%{--map-depth:flat;visibility:hidden}}\n`;
  css += `@keyframes splash-world-off{0%,${pct(zoomEnd - 1)}{opacity:1;visibility:visible}${pct(zoomEnd)},100%{opacity:0;visibility:hidden}}\n`;
  css += `@keyframes splash-zoom-fallback{0%,${pct(OPEN.zoom[0])}{animation-timing-function:cubic-bezier(.6,0,.16,1);transform:scale(1)}${pct(zoomEnd)},100%{transform:scale(var(--zoom-fallback))}}\n`;
  // One paper effect owns opacity and colour. It is fully opaque before the
  // world disappears, then matches the actual page before revealing its text.
  css += `@keyframes splash-sheet{0%,${pct(OPEN.paper[0])}{opacity:0;background-color:var(--paper)}${pct(paperEnd)}{opacity:1;background-color:var(--splash-page-bg)}${pct(OPEN.paperFade[0])}{opacity:1;background-color:var(--splash-page-bg)}${pct(fadeEnd)},100%{opacity:0;background-color:var(--splash-page-bg)}}\n`;
  css += `@keyframes splash-sheet-grain{0%,${pct(OPEN.paper[0])}{opacity:1}${pct(paperEnd)},100%{opacity:0}}\n`;

  css += keyframes("splash-arrival", (t) => [T.arrivalX(t), T.arrivalY(t), T.arrivalR(t)], [0.001, 0.001, 0.05],
    ([x, y, r]) => `transform:translate(${wlen(x)},calc(var(--entry-y) * ${f3(y)})) rotate(${f2(r)}deg)`, 1000 / 120, OPEN.descent);

  css += keyframes("splash-rig", (t) => [T.rigX(t), T.rigY(t), T.rigR(t), T.rigS(t)], [0.002, 0.002, 0.08, 0.002],
    ([x, y, r, s]) => `transform:translate(${wlen(x)},${wlen(y)}) rotate(${f2(r)}deg) scale(${f3(s)})`, 1000 / 120, OPEN.unfold);
  css += keyframes("splash-map", (t) => [T.mapY(t), T.ripX(t), T.ripY(t)], [0.002, 0.05, 0.05],
    ([y, rx, ry]) => `transform:translateY(${plen(y)}) rotateX(${f2(rx)}deg) rotateY(${f2(ry)}deg)`, 1000 / 120, OPEN.unfold);
  css += keyframes("splash-top", (t) => [T.top(t)], [0.25], ([a]) => `transform:rotateX(${f2(a)}deg)`, 1000 / 240, OPEN.unfold);
  css += keyframes("splash-door-l", (t) => [T.doorL(t)], [0.25], ([a]) => `transform:rotateY(${f2(a)}deg)`, 1000 / 240, OPEN.unfold);
  css += keyframes("splash-door-r", (t) => [T.doorR(t)], [0.25], ([a]) => `transform:rotateY(${f2(-a)}deg)`, 1000 / 240, OPEN.unfold);

  // Face shading follows each face's normal (top row composes its flip).
  const faces = {
    "c-top-front": (t) => rotX([0, 0, 1], T.top(t) * DEG),
    "c-top-back": (t) => rotX([0, 0, -1], T.top(t) * DEG),
    "l-bot-front": (t) => rotY([0, 0, 1], T.doorL(t) * DEG),
    "l-bot-back": (t) => rotY([0, 0, -1], T.doorL(t) * DEG),
    "r-bot-front": (t) => rotY([0, 0, 1], -T.doorR(t) * DEG),
    "r-bot-back": (t) => rotY([0, 0, -1], -T.doorR(t) * DEG),
    "l-top-front": (t) => rotX(rotY([0, 0, 1], T.doorL(t) * DEG), T.top(t) * DEG),
    "l-top-back": (t) => rotX(rotY([0, 0, -1], T.doorL(t) * DEG), T.top(t) * DEG),
    "r-top-front": (t) => rotX(rotY([0, 0, 1], -T.doorR(t) * DEG), T.top(t) * DEG),
    "r-top-back": (t) => rotX(rotY([0, 0, -1], -T.doorR(t) * DEG), T.top(t) * DEG),
  };
  for (const [name, fn] of Object.entries(faces)) {
    css += keyframes(`splash-shade-${name}`, (t) => [shade(fn(t))], [0.012], ([o]) => `opacity:${f3(o)}`, 1000 / 120, OPEN.unfold);
    const [part, row, side] = name.split("-");
    const selector = `.splash-row--${row === "top" ? "top" : "bottom"} > .splash-${part === "c" ? "pane" : `door--${part}`} > .splash-face--${side}`;
    css += `${selector}{animation:splash-facing-${name} var(--splash-duration) linear both}\n`;
    css += `@media(max-aspect-ratio:4/5){${selector}{animation-name:splash-facing-${name}-tall}}\n`;
    for (const [suffix, height] of [["", 0.7], ["-tall", 1.25]]) {
      css += facingKeyframes(`splash-facing-${name}${suffix}`, (t) => {
        // In pane-width units, the perspective eye is (0,0,3.2). Include each
        // hinge's position: normal.z alone would hide an off-centre panel too
        // early while its edge still faces that eye. Phones use taller rows.
        const y = (row === "top" ? -0.5 : 0.5) * height;
        const hinge = part === "l" ? -0.5 : 0.5;
        let point = part === "c" ? [0, y, 0] : rotY([hinge / 2, y, 0], (part === "l" ? T.doorL(t) : -T.doorR(t)) * DEG);
        if (part !== "c") point[0] += hinge;
        if (row === "top") point = rotX(point, T.top(t) * DEG);
        const toMap = (v) => rotX(rotY(v, T.ripY(t) * DEG), T.ripX(t) * DEG);
        point = toMap(point);
        point[1] += T.mapY(t) * height;
        return dot(toMap(fn(t)), [-point[0], -point[1], 3.2 - point[2]]);
      });
    }
  }

  // Cast shadows: the lifting top row onto the bottom row, the left door onto the centre pane.
  css += keyframes("splash-cast-top", (t) => { const a = -T.top(t) * DEG; const k = Math.max(0, Math.sin(a)); return [0.42 * k * (T.top(t) < -172 ? (177 + T.top(t)) / 5 : 1), 0.18 + 0.55 * k]; },
    [0.012, 0.01], ([o, s]) => `opacity:${f3(o)};transform:scaleY(${f3(s)})`, 1000 / 120, OPEN.unfold);
  css += keyframes("splash-cast-door", (t) => { const a = T.doorL(t); const k = Math.max(0, Math.sin(a * DEG)) * (a > 170 ? (180 - a) / 10 : 1); return [0.4 * k, 0.12 + 0.5 * k]; },
    [0.012, 0.01], ([o, s]) => `opacity:${f3(o)};transform:scaleX(${f3(s)})`, 1000 / 120, OPEN.unfold);
  css += keyframes("splash-crease-row", (t) => [T.creaseRow(t)], [0.01], ([o]) => `opacity:${f3(o)}`, 1000 / 60, OPEN.paper[0]);
  css += keyframes("splash-crease-hinge", (t) => [T.creaseHinge(t)], [0.01], ([o]) => `opacity:${f3(o)}`, 1000 / 60, OPEN.paper[0]);
  css += keyframes("splash-sheen", (t) => [T.sheen(t), T.sheenX(t)], [0.01, 0.01], ([o, x]) => `opacity:${f3(o)};transform:translateX(${wlen(x)}) skewX(-18deg)`, 1000 / 60, OPEN.unfold);

  // The table shadow follows the visible footprint of the sheet.
  const footprint = (t) => {
    const ext = (a) => Math.max(0, Math.cos(a * DEG));
    const left = 0.5 + 0.5 * ext(T.doorL(t)), right = 0.5 + 0.5 * ext(T.doorR(t));
    const topExt = ext(T.top(t));
    return { sx: (left + right) / 2, dx: (right - left) / 2, sy: (1 + topExt) / 2, dy: (1 - topExt) / 2 + T.mapY(t) };
  };
  const lift = (t) => clamp((T.rigS(t) - 0.985) / 0.06, 0, 1);
  for (const [name, soft] of [["splash-shadow-soft", true], ["splash-shadow-contact", false]]) {
    css += keyframes(name, (t) => { const f = footprint(t), l = lift(t); return [f.sx, f.dx + (soft ? 0.035 * l : 0.006), f.sy, f.dy, landing(t) * (soft ? 0.2 + 0.3 * l : 0.55 * (1 - l) + 0.08), soft ? 0.06 * l : 0.012]; },
      [0.004, 0.003, 0.004, 0.004, 0.01, 0.003],
      ([sx, dx, sy, dy, o, oy]) => `opacity:${f3(o)};transform:translate(${wlen(dx)},calc(var(--ph) * ${f3(dy * 2)} / 2 + var(--w) * ${f3(oy)})) scale(${f3(sx)},${f3(sy)})`, 1000 / 120, OPEN.unfold);
  }

  // Paper grain on the map faces fades out while the camera pushes in, so the
  // screen-space paper (fine grain) never meets a 4x-magnified grain.
  css += keyframes("splash-face-grain", (t) => [T.faceGrain(t)], [0.01], ([o]) => `opacity:${f3(o)}`, 1000 / 60, OPEN.paper[0]);

  return css;
}

export { build, T, TOTAL };
