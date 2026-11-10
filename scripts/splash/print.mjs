// Deterministic artwork for the map opening: the printed inside of the trail
// map (contours + route kept to the perimeter, blank centre), its cover and
// legend panels, and the two hands. Pure string builders; no DOM.


const PINE = "#173f35", INK = "#1f2621", COPPER = "#b5653b";
const r1 = (n) => Math.round(n * 10) / 10;

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ---------------------------------------------------------------- contours
function field(W, H, blank) {
  const R = rng(11);
  const hills = [
    [0.10, 0.12, 0.17, 1.35], [0.89, 0.08, 0.19, 1.55], [0.06, 0.88, 0.16, 1.15], [0.93, 0.90, 0.17, 1.25],
    [0.50, -0.06, 0.20, 1.05], [0.47, 1.07, 0.21, 0.95], [0.14, 0.50, 0.11, 0.95], [0.86, 0.50, 0.12, 1.05],
    [0.31, 0.01, 0.10, 0.75], [0.69, 0.99, 0.10, 0.75], [0.04, 0.30, 0.08, 0.6], [0.97, 0.70, 0.08, 0.6],
  ].map(([x, y, r, h]) => [x * W, y * H, r * W, h]);
  const ph = Array.from({ length: 4 }, () => R() * 6.28);
  return (x, y) => {
    let v = 0;
    for (const [cx, cy, r, h] of hills) { const d2 = ((x - cx) ** 2 + (y - cy) ** 2) / (r * r); v += h * Math.exp(-d2); }
    v += 0.13 * Math.sin(x * 0.011 + ph[0]) * Math.cos(y * 0.013 + ph[1]) + 0.07 * Math.sin((x + y) * 0.023 + ph[2]) + 0.04 * Math.cos(x * 0.041 - y * 0.017 + ph[3]);
    const dx = (x - blank.cx) / blank.rx, dy = (y - blank.cy) / blank.ry;
    return v * smooth(0.92, 1.42, Math.hypot(dx, dy));
  };
}

function contours(W, H, f, levels, step) {
  const nx = Math.ceil(W / step) + 1, ny = Math.ceil(H / step) + 1;
  const g = new Float64Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) g[j * nx + i] = f(i * step, j * step);
  const out = [];
  for (const level of levels) {
    const segs = [];
    const interp = (x1, y1, v1, x2, y2, v2) => { const t = (level - v1) / (v2 - v1); return [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t]; };
    for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const x = i * step, y = j * step;
      const a = g[j * nx + i], b = g[j * nx + i + 1], c = g[(j + 1) * nx + i + 1], d = g[(j + 1) * nx + i];
      const idx = (a > level ? 8 : 0) | (b > level ? 4 : 0) | (c > level ? 2 : 0) | (d > level ? 1 : 0);
      if (idx === 0 || idx === 15) continue;
      const T = interp(x, y, a, x + step, y, b), Rr = interp(x + step, y, b, x + step, y + step, c);
      const B = interp(x, y + step, d, x + step, y + step, c), L = interp(x, y, a, x, y + step, d);
      const table = { 1: [[L, B]], 2: [[B, Rr]], 3: [[L, Rr]], 4: [[T, Rr]], 5: [[L, T], [B, Rr]], 6: [[T, B]], 7: [[L, T]],
        8: [[L, T]], 9: [[T, B]], 10: [[L, B], [T, Rr]], 11: [[T, Rr]], 12: [[L, Rr]], 13: [[B, Rr]], 14: [[L, B]] };
      for (const s of table[idx]) segs.push(s);
    }
    // Join segments into polylines.
    const key = (p) => `${Math.round(p[0] * 4)},${Math.round(p[1] * 4)}`;
    const ends = new Map();
    segs.forEach((s, k) => { for (const e of [0, 1]) { const kk = key(s[e]); if (!ends.has(kk)) ends.set(kk, []); ends.get(kk).push(k); } });
    const used = new Uint8Array(segs.length);
    for (let k = 0; k < segs.length; k++) {
      if (used[k]) continue;
      used[k] = 1;
      const line = [segs[k][0], segs[k][1]];
      for (const dir of [1, 0]) {
        for (;;) {
          const tip = dir ? line[line.length - 1] : line[0];
          const next = (ends.get(key(tip)) || []).find((n) => !used[n]);
          if (next === undefined) break;
          used[next] = 1;
          const s = segs[next];
          const p = key(s[0]) === key(tip) ? s[1] : s[0];
          if (dir) line.push(p); else line.unshift(p);
        }
      }
      if (line.length > 5) out.push({ level, line });
    }
  }
  return out;
}

function pathFromLine(line) {
  // Quadratic smoothing through segment midpoints.
  const pts = line.filter((p, i) => i === 0 || i === line.length - 1 || i % 2 === 0);
  if (pts.length < 3) return "";
  let d = `M${r1(pts[0][0])} ${r1(pts[0][1])}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const m = [(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2];
    d += `Q${r1(pts[i][0])} ${r1(pts[i][1])} ${r1(m[0])} ${r1(m[1])}`;
  }
  const last = pts[pts.length - 1];
  return d + `L${r1(last[0])} ${r1(last[1])}`;
}

function smoothRoute(points) {
  let d = `M${r1(points[0][0])} ${r1(points[0][1])}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)], p1 = points[i], p2 = points[i + 1], p3 = points[Math.min(points.length - 1, i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${r1(c1[0])} ${r1(c1[1])} ${r1(c2[0])} ${r1(c2[1])} ${r1(p2[0])} ${r1(p2[1])}`;
  }
  return d;
}

const label = (x, y, text, size, extra = "") =>
  `<text x="${r1(x)}" y="${r1(y)}" font-size="${size}" ${extra}>${text}</text>`;

// ------------------------------------------------------------ inside print
// Map units: the unfolded sheet is 1000 wide. Gatefold doors are 0–250 and
// 750–1000; the centre pane is 250–750. Rows split at H/2.
function insidePrint(variant) {
  const W = 1000, H = variant === "tall" ? 1250 : 700;
  const blank = variant === "tall" ? { cx: 500, cy: H / 2, rx: 185, ry: 400 } : { cx: 500, cy: H / 2, rx: 190, ry: 205 };
  const f = field(W, H, blank);
  const levels = Array.from({ length: 12 }, (_, i) => 0.26 + i * 0.12);
  const lines = contours(W, H, f, levels, 7);
  const inset = 16;
  let contoursSvg = "";
  for (const { level, line } of lines) {
    const d = pathFromLine(line);
    if (!d) continue;
    const index = Math.round((level - 0.26) / 0.12) % 4 === 2;
    contoursSvg += `<path d="${d}" class="${index ? "ci" : "c"}"/>`;
  }
  const P = (x, y) => [x * W, y * H];
  const route = [P(0.07, 0.955), P(0.15, 0.84), P(0.085, 0.69), P(0.18, 0.55), P(0.11, 0.38), P(0.2, 0.22), P(0.31, 0.11), P(0.45, 0.075), P(0.6, 0.105), P(0.72, 0.06), P(0.8, 0.17), P(0.87, 0.12), P(0.905, 0.07)];
  const routeD = smoothRoute(route);
  const stops = [route[1], route[3], route[5], route[7], route[9], route[11]];
  const s = variant === "tall" ? 1.25 : 1; // type a touch larger on the phone sheet
  const lake = P(0.115, 0.73);
  const compass = P(0.905, 0.6);
  const ticks = [];
  for (let x = 50; x < W; x += 50) ticks.push(`M${x} ${inset}v${x % 250 === 0 ? 10 : 5}M${x} ${H - inset}v-${x % 250 === 0 ? 10 : 5}`);
  for (let y = 50; y < H; y += 50) ticks.push(`M${inset} ${y}h${y % 250 === 0 ? 10 : 5}M${W - inset} ${y}h-${y % 250 === 0 ? 10 : 5}`);
  const tb = P(0.765, variant === "tall" ? 0.915 : 0.875);
  return `<g id="print-${variant}">
<g clip-path="url(#neat-${variant})">
<ellipse cx="${r1(lake[0])}" cy="${r1(lake[1])}" rx="${r1(52 * s)}" ry="${r1(30 * s)}" class="water" transform="rotate(-14 ${r1(lake[0])} ${r1(lake[1])})"/>
<g class="contours">${contoursSvg}</g>
<path d="${routeD}" class="route-halo"/><path d="${routeD}" class="route"/>
${stops.map(([x, y], i) => `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(5.5 * s)}" class="stop"/><text x="${r1(x + 10 * s)}" y="${r1(y + 4 * s)}" font-size="${r1(10 * s)}" class="stopn">0${i + 1}</text>`).join("")}
<path d="M${r1(route[12][0])} ${r1(route[12][1] - 13 * s)}l${r1(9 * s)} ${r1(15 * s)}h${r1(-18 * s)}Z" class="peak"/>
</g>
<rect x="${inset}" y="${inset}" width="${W - inset * 2}" height="${H - inset * 2}" class="neat"/>
<path d="${ticks.join("")}" class="tick"/>
${label(route[0][0] + 14 * s, route[0][1] - 4 * s, "Trailhead", r1(15 * s), 'class="place"')}
${label(route[4][0] + 14 * s, route[4][1] + 4 * s, "Base camp", r1(13 * s), 'class="place"')}
${label(route[8][0] - 30 * s, route[8][1] + 26 * s, "High pass", r1(13 * s), 'class="place"')}
${label(route[12][0] - 74 * s, route[12][1] + 26 * s, "Summit", r1(15 * s), 'class="place"')}
${label(lake[0] - 28 * s, lake[1] + 4 * s, "Mirror Lake", r1(10 * s), 'class="water-label"')}
<g transform="translate(${r1(compass[0])} ${r1(compass[1])}) scale(${s})" class="compass"><circle r="20"/><path d="M0 -26 L6 0 L0 6 L-6 0Z" class="needle"/><path d="M0 26 L6 0 L-6 0Z"/><text y="-31" font-size="11" text-anchor="middle">N</text></g>
<g transform="translate(${r1(tb[0])} ${r1(tb[1])}) scale(${s})" class="titleblock">
<path d="M0 -14h100M0 -14v-5M25 -14v-3M50 -14v-5M75 -14v-3M100 -14v-5" class="scale"/><text y="-24" font-size="8">0</text><text x="96" y="-24" font-size="8">1 MI</text>
<text y="6" font-size="13" class="tb-title">SUMMIT TRAIL</text><text y="22" font-size="9" class="tb-sub">SHEET 01 · 1:24 000</text></g>
</g>
<clipPath id="neat-${variant}"><rect x="${inset}" y="${inset}" width="${W - inset * 2}" height="${H - inset * 2}"/></clipPath>`;
}

// ------------------------------------------------------- cover and legend
function cover(variant) {
  const W = 500, H = variant === "tall" ? 625 : 350;
  const band = variant === "tall" ? 150 : 104;
  const cy = variant === "tall" ? 350 : 196, k = variant === "tall" ? 1.3 : 0.78;
  return `<g id="cover-${variant}">
<rect width="${W}" height="${band}" fill="#f6efda"/>
<path d="M250 8V${H - 8}M8 ${H / 2}H492" class="cv-fold"/>
<path d="M251.5 8V${H - 8}M8 ${H / 2 + 1.5}H492" class="cv-fold-light"/>
<path d="M28 ${band - 26}h40" stroke="${COPPER}" stroke-width="2"/>
<text x="28" y="${band - 50}" class="cv-kicker" font-size="${r1(13 * k)}">TRAIL MAP · NO. 01</text>
<text x="${W - 28}" y="${band - 50}" class="cv-kicker" font-size="${r1(13 * k)}" text-anchor="end">FOLD HERE ↓</text>
<g transform="translate(${W / 2} ${cy}) scale(${k})" class="cv-art">
<path d="M-150 60 L-72 -20 L-40 10 L12 -64 L58 -6 L84 -30 L150 60" class="cv-ridge"/>
<path d="M-118 60 L-72 12 M-30 60 L12 -24 L40 10 M70 60 L84 26" class="cv-ridge thin"/>
<path d="M-140 58 C-90 40 -70 50 -40 32 S 0 -10 12 -54" class="cv-route"/>
<path d="M12 -76 l7 12 h-14z" fill="${COPPER}"/>
</g>
<text x="${W / 2}" y="${H - (variant === "tall" ? 96 : 52)}" text-anchor="middle" class="cv-title" font-size="${r1(30 * k)}">Trailhead to Summit</text>
<text x="${W / 2}" y="${H - (variant === "tall" ? 62 : 26)}" text-anchor="middle" class="cv-foot" font-size="${r1(10 * k)}">CONTOUR INTERVAL 40 FEET</text>
</g>`;
}

function legend(variant, waypoints) {
  const H = variant === "tall" ? 625 : 350, k = variant === "tall" ? 1.25 : 1;
  const rows = (items, y0) => items.map(([n, name], i) => `<text x="22" y="${r1(y0 + i * 40 * k)}" class="lg-n" font-size="${r1(11 * k)}">${n}</text><text x="52" y="${r1(y0 + i * 40 * k)}" class="lg-t" font-size="${r1(14 * k)}">${name}</text>`).join("");
  const wp = waypoints.map((w) => [String(w[0]).padStart(2, "0"), w[1].replace("Membership Inference Attack Study", "Membership Inference")]);
  return {
    lt: `<g id="lg-lt-${variant}"><text x="22" y="${r1(44 * k)}" class="lg-h" font-size="${r1(12 * k)}">LEGEND</text>
<path d="M22 ${r1(80 * k)}h46" class="route"/><text x="80" y="${r1(84 * k)}" class="lg-t" font-size="${r1(13 * k)}">Summit trail</text>
<path d="M22 ${r1(120 * k)}c12 -8 22 8 46 0" class="ci"/><text x="80" y="${r1(124 * k)}" class="lg-t" font-size="${r1(13 * k)}">Index contour</text>
<circle cx="45" cy="${r1(158 * k)}" r="6" class="stop"/><text x="80" y="${r1(163 * k)}" class="lg-t" font-size="${r1(13 * k)}">Waypoint</text>
<path d="M45 ${r1(188 * k)}l9 15h-18z" class="peak"/><text x="80" y="${r1(202 * k)}" class="lg-t" font-size="${r1(13 * k)}">Summit</text></g>`,
    lb: `<g id="lg-lb-${variant}"><text x="22" y="${r1(44 * k)}" class="lg-h" font-size="${r1(12 * k)}">BEFORE YOU SET OUT</text>
<text x="22" y="${r1(84 * k)}" class="lg-i" font-size="${r1(15 * k)}">Start at the trailhead.</text><text x="22" y="${r1(108 * k)}" class="lg-i" font-size="${r1(15 * k)}">Six waypoints mark</text><text x="22" y="${r1(132 * k)}" class="lg-i" font-size="${r1(15 * k)}">the way up.</text>
<g transform="translate(125 ${r1(H - 70 * k)}) scale(${k})" class="compass"><circle r="18"/><path d="M0 -24 L5 0 L0 5 L-5 0Z" class="needle"/><path d="M0 24 L5 0 L-5 0Z"/></g></g>`,
    rt: `<g id="lg-rt-${variant}"><text x="22" y="${r1(44 * k)}" class="lg-h" font-size="${r1(12 * k)}">WAYPOINTS</text>${rows(wp.slice(0, 3), 84 * k)}</g>`,
    rb: `<g id="lg-rb-${variant}">${rows(wp.slice(3), 50 * k)}<text x="22" y="${r1(H - 34 * k)}" class="lg-n" font-size="${r1(11 * k)}">SUMMIT · CONTACT</text></g>`,
  };
}

// ------------------------------------------------------------------ hands
// Palm-side view, cupped beneath the paper. Keep the grip pad at (70, 34)
// and the existing wrist/sleeve geometry so the authored map motion stays put.
// Four individually articulated fingers remain unclipped; palm creases and
// rounded thumb pads make the upward-facing grip readable at phone sizes.
function hand(mirror) {
  const finger = (n, d, ox, joint) => `<g class="h-f h-f${n}" style="transform-origin:${ox}px 102px"><path class="h-skin" d="${d}"/><path class="h-shade" d="${joint}"/></g>`;
  const body = `
<ellipse cx="112" cy="98" rx="58" ry="20" class="h-cast"/>
<path class="h-skin" d="M100 198 C106 232 120 266 140 304 L196 304 C178 262 166 224 160 188 Z"/>
<path class="h-sleeve" d="M126 292 C150 280 190 276 214 284 L236 372 L146 372 Z"/>
<path class="h-cuff" d="M126 292 C150 280 190 276 214 284 L218 300 C194 293 156 296 131 308 Z"/>
<g class="h-palm">
<path class="h-skin" d="M78 120 C76 98 84 80 102 74 C120 67 150 72 165 85 C183 101 184 125 177 149 C171 172 165 192 157 201 C141 214 112 215 98 201 C84 181 79 150 78 120 Z"/>
${finger(1, "M94 108 L86 55 C83 41 86 30 94 28 C103 25 109 33 111 46 L121 102 Q108 114 94 108 Z", 106, "M90 60 Q99 56 111 59 M94 83 Q104 79 116 82")}
${finger(2, "M119 101 L111 39 C109 21 113 11 123 10 C133 9 138 20 139 35 L143 101 Q132 110 119 101 Z", 130, "M113 46 Q125 42 140 45 M116 72 Q128 68 142 71")}
${finger(3, "M143 104 L138 46 C137 31 141 21 150 21 C160 21 165 31 165 45 L167 108 Q155 116 143 104 Z", 153, "M140 54 Q152 50 165 54 M142 79 Q154 75 166 79")}
${finger(4, "M165 115 L162 67 C162 53 165 45 173 45 C182 45 187 54 186 67 L182 125 Q171 129 165 115 Z", 174, "M163 75 Q173 72 186 76 M165 96 Q174 93 184 97")}
<path class="h-shade2" d="M98 201 C111 211 139 214 157 201 C169 184 176 162 177 145 C165 167 149 188 128 197 C115 202 105 203 98 201 Z"/>
<path class="h-pad" d="M88 121 C98 107 116 115 122 133 C127 149 116 172 103 179 C92 166 85 141 88 121 Z"/>
<path class="h-shade" d="M94 109 C114 122 143 121 166 107 M96 130 C118 146 142 135 161 148 M91 118 C112 130 121 151 107 177 M120 187 Q138 192 152 184"/>
<g class="h-thumb">
<path class="h-skin h-thumb-skin" d="M103 147 C84 144 70 128 65 108 C62 95 60 81 53 67 C47 55 49 42 59 35 C69 27 83 29 89 39 C94 48 88 57 80 64 C75 69 78 80 85 89 C96 102 108 108 115 122 C120 133 115 143 103 147 Z"/>
<path class="h-pad" d="M59 43 C64 35 76 34 82 41 C87 48 79 57 71 60 C63 57 57 50 59 43 Z"/>
<path class="h-shade" d="M63 74 Q72 71 80 76 M74 105 C79 120 90 130 103 132"/>
</g>
</g>`;
  return `<svg viewBox="0 0 240 372" class="splash-hand-art" aria-hidden="true" focusable="false">${mirror ? `<g transform="translate(240 0) scale(-1 1)">${body}</g>` : body}</svg>`;
}

export { insidePrint, cover, legend, hand, PINE, INK, COPPER };
