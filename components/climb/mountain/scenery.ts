import { campSite, landmarkSites, leftX, rightX, polygon, silhouette, shade, WORLD_WIDTH } from "./geometry";
import type { Point } from "./geometry";

export type DepthItem = { groundY: number; markup: string };
type TreeKind = "forest" | "edge" | "hill";

export function seededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function topAt(points: readonly Point[], x: number) {
  for (let index = 0; index < points.length - 1; index++) {
    const a = points[index], b = points[index + 1];
    if (a[0] !== b[0] && x >= Math.min(a[0], b[0]) && x <= Math.max(a[0], b[0]) && a[1] < 3255 && b[1] < 3255) {
      return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]);
    }
  }
  return Infinity;
}

function hills(y: number, amplitude: number, seed: number) {
  const random = seededRandom(seed);
  const points: Point[] = [[-3200, 3260]];
  for (let x = -3200; x <= 4600; x += 90 + random() * 120) {
    points.push([x, y - random() * amplitude - Math.sin(x * 0.002) * amplitude * 0.5]);
  }
  points.push([4600, 3260]);
  return points;
}

function far(base: number, amplitude: number, seed: number, fill: string) {
  const random = seededRandom(seed);
  const points: Point[] = [[-50, 600]];
  for (let x = -50; x <= 1650; x += 70 + random() * 90) points.push([x, base - random() * amplitude]);
  points.push([1650, 600]);
  return `<svg class="far" aria-hidden="true" viewBox="0 0 1600 600" preserveAspectRatio="xMidYMax slice"><polygon points="${polygon(points)}" fill="${fill}" opacity="0.55"/></svg>`;
}

// `pad` widens the clearing by the tree's crown half-width, so crowns (not just trunks) stay clear.
function inClearing(x: number, y: number, pad = 0) {
  return [...landmarkSites, campSite].some((site) =>
    Math.abs(x - site.x) < site.width * 1.05 + 14 + pad &&
    y > site.y + site.top * 1.05 * 0.8 && y < site.y + 18,
  );
}

/* ---------- Trees ----------
   Spruce shapes are drawn once into <defs> at a reference size (TS = 20, base at 0,0) and placed with
   <use>; each instance carries only position, scale and fill. The lit (left) half is a fixed translucent
   overlay inside the shape, so no currentColor or CSS variables are needed. */
const TS = 20;
const TRUNK = "#3a3027";
const LIT = 'fill="#e3ecd6" fill-opacity="0.15"';
const SPRUCE_VARIANTS = 12, SNOW_VARIANTS = 6;
const HAZE = 0.22, GLADE = -0.8, GLADE_P = 0.65;

const hexRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
function mixHex(a: string, b: string, t: number) {
  const A = hexRgb(a), B = hexRgb(b);
  return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("");
}
const pt = (x: number, y: number) => `${x.toFixed(1)} ${y.toFixed(1)}`;
const ln = (p: Point) => ` L${pt(p[0], p[1])}`;

// Local generator hashed from a tree's own position: shape, scale and thinning never touch the shared sequence.
function treeRandom(x: number, y: number) {
  const hash = (Math.imul(Math.round(x * 8), 73856093) ^ Math.imul(Math.round(y * 8), 19349663)) >>> 0;
  const random = seededRandom(hash % 2147483646 + 1);
  random();
  return random;
}
// Low-frequency field that opens deterministic glades in the stand.
const glade = (x: number, y: number) =>
  Math.sin(x * 0.0105 + 1.3) * Math.sin(y * 0.019 + 0.7) + 0.45 * Math.sin(x * 0.029 - y * 0.021 + 2.1);

function treeTrunk(s: number, top: number) {
  return `<ellipse cx="${(s * 0.12).toFixed(1)}" cy="0" rx="${(s * 0.55).toFixed(1)}" ry="${(s * 0.09).toFixed(1)}" fill="#13221a" fill-opacity="0.28"/>` +
    `<path d="M${pt(-s * 0.07, 0)}${ln([-s * 0.05, top])}${ln([s * 0.05, top])}${ln([s * 0.07, 0])}Z" fill="${TRUNK}"/>`;
}

// Spruce: drooping scalloped boughs, split lit/shaded like the mountain; snowy variants cap the upper boughs.
function spruceShape(random: () => number, snowy: boolean) {
  const s = TS, h = s * 2.25 * (0.94 + random() * 0.14), w = s * 0.7, n = 4 + Math.floor(random() * 3);
  const bb = -s * 0.2, top = -h, th = (bb - top) / n, droop = s * 0.07, lean = (random() - 0.5) * s * 0.12;
  const tiers = Array.from({ length: n }, (_, k) => {
    const t = (k + 1) / n, base = w * (0.2 + 0.8 * t);
    return { y: top + (bb - top) * t, cx: lean * (1 - t), wr: base * (1 + (random() - 0.5) * 0.24), wl: base * (1 + (random() - 0.5) * 0.24) };
  });
  const wd = (k: number, sg: number) => (sg > 0 ? tiers[k].wr : tiers[k].wl);
  const start = (k: number, sg: number): Point => k > 0 ? [tiers[k].cx + sg * wd(k - 1, sg) * 0.52, tiers[k - 1].y - th * 0.1] : [lean, top];
  const ctrl = (k: number, sg: number): Point => [tiers[k].cx + sg * wd(k, sg) * 0.6, tiers[k].y - th * 0.4];
  const tip = (k: number, sg: number): Point => [tiers[k].cx + sg * wd(k, sg), tiers[k].y + droop];
  const down = (sg: number) => tiers.map((_, k) => {
    const a = ctrl(k, sg), b = tip(k, sg);
    return ` Q${pt(a[0], a[1])} ${pt(b[0], b[1])}` + (k < n - 1 ? ln(start(k + 1, sg)) : "");
  }).join("");
  const up = (sg: number) => tiers.map((_, i) => {
    const k = n - 1 - i, a = ctrl(k, sg), b = start(k, sg);
    return ln(tip(k, sg)) + ` Q${pt(a[0], a[1])} ${pt(b[0], b[1])}`;
  }).join("");
  const apex = `M${pt(lean, top)}`;
  let out = treeTrunk(s, bb - 1) +
    `<path d="${apex}${down(1)}${ln([s * 0.06, bb])}${ln([-s * 0.06, bb])}${up(-1)}Z"/>` +
    `<path d="${apex}${down(-1)}${ln([0, bb])}Z" ${LIT}/>`;
  if (snowy) {
    let lit = "", shaded = "";
    for (let j = 0; j < 2; j++) {
      for (const sg of j ? [-1] : [-1, 1]) {
        const a = start(j, sg), b = ctrl(j, sg), e = tip(j, sg);
        const cap = `M${pt(a[0], a[1])} Q${pt(b[0], b[1])} ${pt(e[0], e[1])} Q${pt(b[0] - sg * s * 0.05, b[1] + s * 0.19)} ${pt(a[0] - sg * s * 0.03, a[1] + s * 0.13)}Z`;
        if (sg < 0) lit += cap; else shaded += cap;
      }
    }
    out += `<path d="${lit}" fill="#ebece4"/><path d="${shaded}" fill="#c9d0cd"/>`;
  }
  return out;
}

// Insert into the scenery <svg>'s <defs>. Fixed seeds: identical on server and client.
export const treeDefs =
  Array.from({ length: SPRUCE_VARIANTS }, (_, v) => `<g id="tv-spruce${v}">${spruceShape(treeRandom(13 + 3 * 977, v * 131 + 7), false)}</g>`).join("") +
  Array.from({ length: SNOW_VARIANTS }, (_, v) => `<g id="tv-snow${v}">${spruceShape(treeRandom(13 + 4 * 977, v * 131 + 7), true)}</g>`).join("");

// Everything is generated from fixed numbers, not fetched or user-provided SVG.
// Keep random calls in reference order; even rejected trees affect later clouds.
export function buildScenery() {
  const random = seededRandom(7);
  function jag(y: number, amplitude: number, step: number) {
    const points: Point[] = [];
    for (let x = -1010; x <= WORLD_WIDTH + 1210; x += step) {
      points.push([x, y + (random() - 0.5) * amplitude + Math.sin(x * 0.02) * amplitude * 0.4]);
    }
    return points;
  }
  // One shared draw per accepted tree (its tone), exactly where the reference pine() drew its colour.
  // Every other decision, including the new glade and crown-clearance rejections, uses treeRandom.
  function pine(x: number, y: number, size: number, kind: TreeKind) {
    const tone = random();
    const local = treeRandom(x, y), base = tone > 0.5 ? "#203a2e" : "#2c4b39";
    const depth = kind === "hill" ? Math.min(1, Math.max(0, (y - 2520) / 670)) : Math.min(1, Math.max(0, (y - 2160) / 1010));
    const s = size * (0.88 + 0.2 * depth);
    let sx = s * (0.9 + local() * 0.2), sy = s * (0.9 + local() * 0.24);
    if (kind !== "edge" && glade(x, y) < GLADE && local() < GLADE_P) return "";
    if (kind === "forest" && inClearing(x, y, s * 0.65)) return "";
    let body = mixHex(mixHex(base, "#6c8673", (1 - depth) * HAZE), "#14251c", depth * 0.2);
    if (kind === "hill") body = mixHex(body, "#5a7257", 0.3 * (1 - depth));
    if (kind !== "hill" && depth < 0.14) { sx *= 1.1; sy *= 0.8; } // krummholz at the treeline
    const snowy = kind !== "hill" && depth < 0.24 && local() < 0.7 * (1 - depth / 0.24);
    const variant = Math.floor(local() * (snowy ? SNOW_VARIANTS : SPRUCE_VARIANTS));
    return `<use aria-hidden="true" href="#tv-${snowy ? "snow" : "spruce"}${variant}" transform="translate(${x.toFixed(0)} ${y.toFixed(0)}) scale(${(sx / TS).toFixed(3)} ${(sy / TS).toFixed(3)})" fill="${mixHex(body, "#13221a", 0.22)}"/>`;
  }
  const snowEdge = jag(1320, 150, 38);
  const snow = [...snowEdge, [WORLD_WIDTH + 1210, -10], [-1010, -10]] as Point[];
  const forestEdge = jag(2200, 120, 34);
  const forest = [...forestEdge, [WORLD_WIDTH + 1210, 3210], [-1010, 3210]] as Point[];
  const meadow = [...jag(3020, 40, 40), [WORLD_WIDTH + 1210, 3210], [-1010, 3210]] as Point[];
  const hillsBack = hills(2620, 260, 5), hillsFront = hills(2950, 120, 9);

  let hillTrees = "";
  for (let y = 2520, row = 0; y < 3190; y += 30, row++) {
    for (let x = -3100 + (row % 2) * 35; x < 4500; x += 70) {
      if (random() < 0.3) continue;
      const px = x + (random() - 0.5) * 22, py = y + (random() - 0.5) * 8;
      if (px > leftX(py) - 20 && px < rightX(py) + 20 && py < 3100) continue;
      if (py < topAt(hillsBack, px) + 16) continue;
      hillTrees += pine(px, py, 12 + random() * 11, "hill");
    }
  }

  const trees: DepthItem[] = [];
  for (let y = 2160, row = 0; y < 3170; y += 30, row++) {
    for (let x = -960 + (row % 2) * 24; x < WORLD_WIDTH + 1160; x += 48) {
      if (random() < 0.24) continue;
      const px = x + (random() - 0.5) * 18, py = y + (random() - 0.5) * 9, size = 14 + random() * 12;
      if (py < topAt(forestEdge, px) + 14) continue;
      if (px < leftX(py) + size * 0.7 + 4 || px > rightX(py) - size * 0.7 - 4) continue;
      if (inClearing(px, py)) continue;
      const markup = pine(px, py, size, "forest");
      if (markup) trees.push({ groundY: py, markup });
    }
  }

  function cumulus(cx: number, cy: number, width: number) {
    const count = 5 + Math.floor(random() * 4), step = width / count;
    let base = "", top = "";
    for (let index = 0; index < count; index++) {
      const profile = Math.sin(Math.PI * (index + 0.5) / count);
      const radius = step * (0.75 + profile * 0.9 + random() * 0.3);
      const x = cx - width / 2 + step * (index + 0.5) + (random() - 0.5) * step * 0.4;
      const y = cy - radius * (0.35 + profile * 0.35);
      base += `<circle cx="${x.toFixed(0)}" cy="${(y + radius * 0.18).toFixed(0)}" r="${radius.toFixed(0)}"/>`;
      top += `<circle cx="${(x - radius * 0.12).toFixed(0)}" cy="${(y - radius * 0.08).toFixed(0)}" r="${(radius * 0.92).toFixed(0)}"/>`;
    }
    const flat = `<ellipse cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" rx="${(width * 0.55).toFixed(0)}" ry="${(step * 0.5).toFixed(0)}"/>`;
    return `<g clip-path="url(#cloud-base)" transform="translate(0 0)"><g fill="#d7dee5">${base}${flat}</g><g fill="#ffffff">${top}</g></g>`;
  }
  function cloudBand(count: number, yMin: number, yMax: number, wMin: number, wMax: number) {
    let markup = "";
    for (let index = 0; index < count; index++) {
      const width = wMin + random() * (wMax - wMin);
      markup += cumulus(-900 + random() * (WORLD_WIDTH + 1800), yMin + random() * (yMax - yMin), width);
    }
    return markup;
  }
  const cloudsBack = cloudBand(20, 560, 760, 260, 520);
  const cloudsFront = cloudBand(18, 700, 900, 240, 460);
  const cloudsHigh = cloudBand(8, -700, -150, 220, 420);
  let contours = "";
  for (let index = 0; index < 7; index++) {
    const y = 600 + index * 360;
    contours += `<path d="M${leftX(y) - 40} ${y} Q 1090 ${y - 140} ${rightX(y) + 40} ${y + 60}" />`;
  }
  const edgeTrees: DepthItem[] = [];
  for (let y = 2240; y < 3180; y += 20) {
    [leftX(y), rightX(y)].forEach((x, side) => {
      if (random() < 0.4) return;
      const direction = side ? 1 : -1, size = 13 + random() * 11;
      const px = x - direction * (size * 0.55 + random() * 8), py = y + (random() - 0.5) * 6;
      if (py < topAt(forestEdge, px) + 14) return;
      const markup = pine(px, py, size, "edge");
      if (markup) edgeTrees.push({ groundY: py, markup });
    });
  }

  return {
    distant: far(330, 220, 11, "#9fb0ad") + far(430, 180, 23, "#7d918d"),
    backdrop: `<g filter="url(#softer)" opacity="0.7">${cloudsHigh}</g><g filter="url(#softer)" opacity="0.75">${cloudsBack}</g>` +
      `<polygon points="${polygon(hillsBack)}" fill="#4b6447"/><polygon points="${polygon(hillsFront)}" fill="#6f7c55"/><polygon points="${silhouette}" fill="#8b8476"/>`,
    bands: `<polygon points="${polygon(forest)}" fill="#34503f"/><polygon points="${polygon(meadow)}" fill="#6f7c55"/><polygon points="${polygon(snow)}" fill="#f4f2ea"/>` +
      `<g fill="none" stroke="#fffbed" stroke-width="1.2" opacity="0.28">${contours}</g>`,
    trees,
    shade: `<polygon points="${shade}" fill="#1f2621" opacity="0.16" pointer-events="none"/>`,
    edgeTrees: paintDepth(edgeTrees),
    hillTrees,
    treeDefs,
    cloudsFront: `<g filter="url(#soft)" opacity="0.92">${cloudsFront}</g>`,
  };
}

// Landmarks enter the same depth order, beneath shade. The chairlift
// remains separate so its cables can hang above the forest.
export function paintDepth(trees: readonly DepthItem[], landmarks: readonly DepthItem[] = []) {
  return [...trees, ...landmarks].sort((a, b) => a.groundY - b.groundY).map((item) => item.markup).join("");
}
