// Generates the map-handling keyframes. Every curve is authored as a function
// of absolute time on one 4.4 s timeline, sampled, then simplified so the CSS
// stays small. All lengths are multiples of --w (centre pane width) or --ph
// (row height), so the same keyframes serve every viewport size.


const TOTAL = 4400;
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

// ------------------------------------------------------------------ curves
const T = {
  rigS: track([[0, 0.985], [250, 0.985], [430, 1.045, "out"], [1350, 1.045], [1560, 0.993], [1760, 1]]),
  rigY: track([[0, 0.035], [250, 0.035], [430, -0.012, "out"], [1350, -0.012], [1720, 0]]),
  rigR: track([[0, -5.5], [300, -5.5], [352, -3.5], [410, -6.1], [468, -3.9], [535, -4.9], [620, -4.4], [1300, -1.1], [1720, 0]]),
  rigX: track([[0, 0], [300, 0], [352, 0.008], [410, -0.01], [468, 0.006], [535, -0.002], [620, 0]]),
  mapY: track([[0, -0.5], [470, -0.5], [900, 0]]),                       // × --ph
  ripX: track([[0, 0], [1240, 0], [1380, 1.5], [1520, -0.75], [1660, 0.25], [1790, 0]]),
  ripY: track([[0, 0], [1260, 0], [1400, -1.1], [1540, 0.55], [1680, -0.15], [1800, 0]]),
  top: track([[0, -177], [380, -177], [450, -167, "give"], [535, -161, "linear"], [805, 4, "snap"], [875, -1.6], [945, 0]]),
  doorL: track([[0, 177], [820, 177], [888, 165, "give"], [962, 160, "linear"], [1215, -4, "snap"], [1325, 1.3], [1425, 0]]),
  doorR: track([[0, 177], [905, 177], [962, 168, "give"], [1012, 165, "linear"], [1272, -3.2, "snap"], [1382, 1], [1482, 0]]),
  creaseRow: track([[0, 0], [880, 0], [960, 0.6], [1400, 0.38], [1900, 0.16], [2150, 0]]),
  creaseHinge: track([[0, 0], [1180, 0], [1330, 0.5], [1800, 0.3], [2150, 0]]),
  sheen: track([[0, 0], [1240, 0], [1330, 1], [1650, 1], [1760, 0]]),
  sheenX: track([[0, -1.2], [1240, -1.2], [1760, 2.4, "inout"]]),
  // Hand gestures layered on top of the tracked grip.
  hIn: track([[0, 1.9], [330, 0, "out"]]),
  hFlick: track([[0, 0], [370, 0], [430, -0.032, "out"], [560, 0]]),
  hSmooth: track([[0, 0], [1350, 0], [1560, 1]]),
  hOut: track([[0, 0], [1520, 0], [1960, 1, "leave"]]),
  wFlick: track([[0, 0], [370, 0], [425, -7], [495, 3.5], [570, 0]]),
  wSmooth: track([[0, 0], [1340, 0], [1500, 5], [1580, 4], [1700, -6]]),
  faceGrain: track([[0, 1], [1700, 1], [2150, 0]]),
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
  for (let t = 0; t <= end + 1e-6; t += step) samples.push({ t, v: fn(t) });
  const kept = simplify(samples, tol);
  const pct = (t) => `${(t / TOTAL * 100).toFixed(3).replace(/\.?0+$/, "")}%`;
  const body = kept.map((s) => `${pct(s.t)}{${format(s.v)}}`).join("");
  return `@keyframes ${name}{${body}100%{${format(kept[kept.length - 1].v)}}}\n`;
}
const f3 = (n) => (Math.abs(n) < 5e-5 ? "0" : n.toFixed(4).replace(/\.?0+$/, ""));
const f2 = (n) => (Math.abs(n) < 5e-3 ? "0" : n.toFixed(2).replace(/\.?0+$/, ""));
const wlen = (k) => `calc(var(--w) * ${f3(k)})`;
const plen = (k) => `calc(var(--ph) * ${f3(k)})`;

function build() {
  let css = "/* Generated by src/motion.cjs — do not edit by hand. Times are on one 4400 ms timeline. */\n";

  css += keyframes("splash-rig", (t) => [T.rigX(t), T.rigY(t), T.rigR(t), T.rigS(t)], [0.002, 0.002, 0.08, 0.002],
    ([x, y, r, s]) => `transform:translate(${wlen(x)},${wlen(y)}) rotate(${f2(r)}deg) scale(${f3(s)})`, 1000 / 120, 1800);
  css += keyframes("splash-map", (t) => [T.mapY(t), T.ripX(t), T.ripY(t)], [0.002, 0.05, 0.05],
    ([y, rx, ry]) => `transform:translateY(${plen(y)}) rotateX(${f2(rx)}deg) rotateY(${f2(ry)}deg)`, 1000 / 120, 1850);
  css += keyframes("splash-top", (t) => [T.top(t)], [0.25], ([a]) => `transform:rotateX(${f2(a)}deg)`, 1000 / 240, 1000);
  css += keyframes("splash-door-l", (t) => [T.doorL(t)], [0.25], ([a]) => `transform:rotateY(${f2(a)}deg)`, 1000 / 240, 1500);
  css += keyframes("splash-door-r", (t) => [T.doorR(t)], [0.25], ([a]) => `transform:rotateY(${f2(-a)}deg)`, 1000 / 240, 1550);

  // Face shading follows each face's normal (top row composes its flip).
  const faces = {
    "c-top-front": (t) => shade(rotX([0, 0, 1], T.top(t) * DEG)),
    "c-top-back": (t) => shade(rotX([0, 0, -1], T.top(t) * DEG)),
    "l-bot-front": (t) => shade(rotY([0, 0, 1], T.doorL(t) * DEG)),
    "l-bot-back": (t) => shade(rotY([0, 0, -1], T.doorL(t) * DEG)),
    "r-bot-front": (t) => shade(rotY([0, 0, 1], -T.doorR(t) * DEG)),
    "r-bot-back": (t) => shade(rotY([0, 0, -1], -T.doorR(t) * DEG)),
    "l-top-front": (t) => shade(rotX(rotY([0, 0, 1], T.doorL(t) * DEG), T.top(t) * DEG)),
    "l-top-back": (t) => shade(rotX(rotY([0, 0, -1], T.doorL(t) * DEG), T.top(t) * DEG)),
    "r-top-front": (t) => shade(rotX(rotY([0, 0, 1], -T.doorR(t) * DEG), T.top(t) * DEG)),
    "r-top-back": (t) => shade(rotX(rotY([0, 0, -1], -T.doorR(t) * DEG), T.top(t) * DEG)),
  };
  for (const [name, fn] of Object.entries(faces)) css += keyframes(`splash-shade-${name}`, (t) => [fn(t)], [0.012], ([o]) => `opacity:${f3(o)}`, 1000 / 120, 1600);

  // Cast shadows: the lifting top row onto the bottom row, the left door onto the centre pane.
  css += keyframes("splash-cast-top", (t) => { const a = -T.top(t) * DEG; const k = Math.max(0, Math.sin(a)); return [0.42 * k * (T.top(t) < -172 ? (177 + T.top(t)) / 5 : 1), 0.18 + 0.55 * k]; },
    [0.012, 0.01], ([o, s]) => `opacity:${f3(o)};transform:scaleY(${f3(s)})`, 1000 / 120, 1000);
  css += keyframes("splash-cast-door", (t) => { const a = T.doorL(t); const k = Math.max(0, Math.sin(a * DEG)) * (a > 170 ? (177 - a) / 7 : 1); return [0.4 * k, 0.12 + 0.5 * k]; },
    [0.012, 0.01], ([o, s]) => `opacity:${f3(o)};transform:scaleX(${f3(s)})`, 1000 / 120, 1450);
  css += keyframes("splash-crease-row", (t) => [T.creaseRow(t)], [0.01], ([o]) => `opacity:${f3(o)}`, 1000 / 60, 2200);
  css += keyframes("splash-crease-hinge", (t) => [T.creaseHinge(t)], [0.01], ([o]) => `opacity:${f3(o)}`, 1000 / 60, 2200);
  css += keyframes("splash-sheen", (t) => [T.sheen(t), T.sheenX(t)], [0.01, 0.01], ([o, x]) => `opacity:${f3(o)};transform:translateX(${wlen(x)}) skewX(-18deg)`, 1000 / 60, 1800);

  // The table shadow follows the visible footprint of the sheet.
  const footprint = (t) => {
    const ext = (a) => Math.max(0, Math.cos(a * DEG));
    const left = 0.5 + 0.5 * ext(T.doorL(t)), right = 0.5 + 0.5 * ext(T.doorR(t));
    const topExt = ext(T.top(t));
    return { sx: (left + right) / 2, dx: (right - left) / 2, sy: (1 + topExt) / 2, dy: (1 - topExt) / 2 + T.mapY(t) };
  };
  const lift = (t) => clamp((T.rigS(t) - 0.985) / 0.06, 0, 1);
  for (const [name, soft] of [["splash-shadow-soft", true], ["splash-shadow-contact", false]]) {
    css += keyframes(name, (t) => { const f = footprint(t), l = lift(t); return [f.sx, f.dx + (soft ? 0.035 * l : 0.006), f.sy, f.dy, soft ? 0.2 + 0.3 * l : 0.55 * (1 - l) + 0.08, soft ? 0.06 * l : 0.012]; },
      [0.004, 0.003, 0.004, 0.004, 0.01, 0.003],
      ([sx, dx, sy, dy, o, oy]) => `opacity:${f3(o)};transform:translate(${wlen(dx)},calc(var(--ph) * ${f3(dy * 2)} / 2 + var(--w) * ${f3(oy)})) scale(${f3(sx)},${f3(sy)})`, 1000 / 120, 1800);
  }

  // Hands hold the free edges of the gatefold doors. Their grip points are the
  // perspective projection of a point on each door, so they ride the paper.
  for (const [variant, phw] of [["wide", 0.7], ["tall", 1.25]]) {
    const P = 3.2, d = 0.45, gy = phw - 0.045;
    for (const side of ["l", "r"]) {
      const sign = side === "l" ? -1 : 1;
      const fn = (t) => {
        const th = (side === "l" ? T.doorL(t) : T.doorR(t)) * DEG;
        const x3 = sign * (0.5 + d * Math.cos(th)), z3 = d * Math.sin(th);
        const y3 = gy + T.mapY(t) * phw;
        const k = P / (P - z3);
        let x = x3 * k, y = y3 * k;
        const smooth = T.hSmooth(t), out = T.hOut(t), inn = T.hIn(t);
        x += sign * (0.045 * smooth + 0.42 * out + 0.06 * inn);
        y += 0.012 * smooth + 1.15 * out + 1 * inn + T.hFlick(t);
        // Forearms angle outward as the hands spread apart.
        // Wrist: a flick with the opening toss, a roll as the door lifts toward the camera,
        // a small set before each regrip, outward turn while smoothing, and a drop on release.
        const o = side === "l" ? 0 : 85;
        const wrist = T.wFlick(t) + 9 * Math.sin(th) * (th < 170 * DEG ? 1 : 0) + track([[0, 0], [690 + o, 0], [745 + o, -3.5], [800 + o, 0]])(t) + T.wSmooth(t);
        const rot = sign * (-11 + 30 * clamp(Math.abs(x) - 0.05, 0, 1.1) + 9 * inn + 14 * out + wrist);
        const s = Math.pow(k, 0.85) * (1 - 0.02 * smooth) * (1 + 0.025 * Math.max(0, -T.hFlick(t) / 0.032));
        return [x, y, rot, s];
      };
      css += keyframes(`splash-hand-${side}-${variant}`, fn, [0.0025, 0.0025, 0.25, 0.004],
        ([x, y, r, s]) => `transform:translate(${wlen(x)},${wlen(y)}) rotate(${f2(r)}deg) scale(${f3(s)})`, 1000 / 120, 2000);
    }
  }
  // Paper grain on the map faces fades out while the camera pushes in, so the
  // screen-space paper (fine grain) never meets a 4x-magnified grain.
  css += keyframes("splash-face-grain", (t) => [T.faceGrain(t)], [0.01], ([o]) => `opacity:${f3(o)}`, 1000 / 60, 2200);

  // Articulated hand parts, in SVG user units. Each hand regrips just before its own door.
  for (const side of ["l", "r"]) {
    const o = side === "l" ? 0 : 85;
    const thumbR = track([[0, -16], [260, -16], [330, 4, "out"], [380, 1], [425, 5], [490, 1], [690 + o, 1], [745 + o, -10, "out"], [800 + o, 3], [840 + o, 1],
      [1340, 1], [1500, -6], [1560, -5], [1630, -21, "out"], [1960, -21]]);
    const thumbY = track([[0, -6], [260, -6], [330, 0, "out"], [690 + o, 0], [745 + o, -8, "out"], [800 + o, 1], [840 + o, 0], [1340, 0], [1500, 4], [1630, -9, "out"], [1960, -9]]);
    const thumbX = track([[0, 0], [1340, 0], [1500, -5], [1630, -3], [1960, -3]]);
    const curl = track([[0, 1.05], [260, 1.05], [330, 0.86, "out"], [380, 0.9], [425, 0.84], [490, 0.89], [690 + o, 0.89], [745 + o, 1.02, "out"], [800 + o, 0.84], [840 + o, 0.88],
      [1340, 0.88], [1500, 1.04], [1560, 1.02], [1650, 1.1, "out"], [1960, 1.1]]);
    const spread = track([[0, 0], [1340, 0], [1500, 1], [1600, 0.6], [1960, 0]]);
    const roll = track([[0, 1], [370, 1], [425, 0.93], [520, 1], [820 + o, 1], [1000 + o, 0.94], [1250 + o, 1], [1340, 1], [1500, 1.04], [1650, 0.97], [1960, 1]]);
    const cast = track([[0, 0.12], [330, 0.34, "out"], [745 + o, 0.2], [800 + o, 0.34], [1580, 0.34], [1700, 0.1]]);
    css += keyframes(`splash-thumb-${side}`, (t) => [thumbR(t), thumbX(t), thumbY(t)], [0.2, 0.3, 0.3],
      ([r, x, y]) => `transform:translate(${f2(x)}px,${f2(y)}px) rotate(${f2(r)}deg)`, 1000 / 120, 2000);
    css += keyframes(`splash-palm-${side}`, (t) => [roll(t)], [0.003], ([r]) => `transform:scaleX(${f3(r)})`, 1000 / 60, 2000);
    css += keyframes(`splash-cast-hand-${side}`, (t) => [cast(t)], [0.01], ([c]) => `opacity:${f3(c)}`, 1000 / 60, 2000);
    // Fingers curl together but not in lockstep: each lags its neighbour by 18 ms and spreads by its index.
    for (let f = 1; f <= 4; f++) {
      const lag = (f - 1) * 18, fan = (f - 2.5) * 2.2;
      css += keyframes(`splash-finger-${side}-${f}`, (t) => [curl(t - lag), spread(t - lag) * fan], [0.004, 0.15],
        ([c, a]) => `transform:rotate(${f2(a)}deg) scaleY(${f3(c)})`, 1000 / 120, 2000);
    }
  }
  return css;
}

export { build, T, TOTAL };
