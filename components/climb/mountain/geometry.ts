import { journeyStops } from "../../../content/journey";

export type Point = readonly [number, number];
export const WORLD_WIDTH = 2000;
export const WORLD_HEIGHT = 3200;
export const PEAK_X = 1090;

export const clamp = (value: number, low: number, high: number) =>
  value < low ? low : value > high ? high : value;
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const polygon = (points: readonly Point[]) =>
  points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

// Wide scenery flanks from the approved prototype. Only trailL/trailR own
// switchback and Landmark placement; their bounds stay clamped to world width.
const left: Point[] = ([[-480, 3200], [-480, 3060], [-380, 2990], [-300, 2920], [-200, 2800], [-120, 2700], [-50, 2580], [0, 2450], [50, 2350], [95, 2390], [130, 2080], [185, 2120], [215, 1700], [262, 1720], [280, 1260], [325, 1290], [330, 860], [372, 885], [400, 560], [428, 578], [455, 360], [480, 372], [515, 210], [545, 150]] as [number, number][]).map(([x, y]) => [x * 2, y]);
const right: Point[] = ([[545, 150], [578, 212], [605, 200], [635, 360], [662, 350], [690, 560], [718, 548], [760, 860], [795, 842], [820, 1260], [858, 1240], [885, 1700], [925, 1680], [955, 2100], [985, 2080], [1000, 2350], [1050, 2470], [1120, 2590], [1200, 2700], [1300, 2810], [1400, 2930], [1480, 3000], [1580, 3060], [1580, 3200]] as [number, number][]).map(([x, y]) => [x * 2, y]);

function crossings(points: readonly Point[], y: number) {
  const xs: number[] = [];
  for (let index = 0; index < points.length - 1; index++) {
    const a = points[index], b = points[index + 1];
    if ((y - a[1]) * (y - b[1]) <= 0 && a[1] !== b[1]) {
      xs.push(a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]));
    }
  }
  return xs;
}
export function leftX(y: number) {
  const xs = crossings(left, y);
  return xs.length ? Math.max(...xs) : 0;
}
export function rightX(y: number) {
  const xs = crossings(right, y);
  return xs.length ? Math.min(...xs) : WORLD_WIDTH;
}
export const trailL = (y: number) => Math.max(0, leftX(y));
export const trailR = (y: number) => Math.min(WORLD_WIDTH, rightX(y));

export const silhouette = polygon([...left, ...right.slice(1)]);
export const shade = polygon([
  [PEAK_X, 150], ...right.slice(1),
  ...([[620, 3200], [585, 1600], [565, 700], [555, 330]] as Point[])
    .map(([x, y]): Point => [x * 2, y]),
]);

type Cubic = readonly [Point, Point, Point, Point];
const trailPoints: Point[] = [];
for (let index = 0; index <= 13; index++) {
  const y = 3130 - index * (3130 - 330) / 13;
  const l = trailL(y), r = trailR(y), margin = 0.2 * (r - l) + 18;
  trailPoints.push([index % 2 === 0 ? l + margin + (index === 0 ? 40 : 0) : r - margin, y]);
}
trailPoints.push([PEAK_X, 168]);
trailPoints[0] = [WORLD_WIDTH * 0.3, 3150];

let path = `M${trailPoints[0][0]} ${trailPoints[0][1]}`;
const curves: Cubic[] = [];
const round = (n: number) => Number(n.toFixed(1));
for (let index = 0; index < trailPoints.length - 1; index++) {
  const p0 = trailPoints[Math.max(0, index - 1)], p1 = trailPoints[index];
  const p2 = trailPoints[index + 1], p3 = trailPoints[Math.min(trailPoints.length - 1, index + 2)];
  const c1: Point = [round(p1[0] + (p2[0] - p0[0]) / 6), round(p1[1] + (p2[1] - p0[1]) / 6)];
  const c2: Point = [round(p2[0] - (p3[0] - p1[0]) / 6), round(p2[1] - (p3[1] - p1[1]) / 6)];
  const end: Point = [round(p2[0]), round(p2[1])];
  curves.push([index ? curves[index - 1][3] : p1, c1, c2, end]);
  path += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${end[0].toFixed(1)} ${end[1].toFixed(1)}`;
}
export const trailPath = path;

function cubicPoint([a, b, c, d]: Cubic, t: number): Point {
  const u = 1 - t;
  return [0, 1].map((axis) =>
    u ** 3 * a[axis] + 3 * u ** 2 * t * b[axis] + 3 * u * t ** 2 * c[axis] + t ** 3 * d[axis],
  ) as [number, number];
}

// Pure arc-length sampling replaces the prototype's temporary DOM path.
// Fine subdivision keeps the 601 samples within subpixel distance of native
// SVG sampling, including during server rendering and static export.
const arc: { point: Point; length: number }[] = [{ point: curves[0][0], length: 0 }];
for (const curve of curves) {
  for (let index = 1; index <= 512; index++) {
    const point = cubicPoint(curve, index / 512);
    const previous = arc[arc.length - 1];
    arc.push({ point, length: previous.length + Math.hypot(point[0] - previous.point[0], point[1] - previous.point[1]) });
  }
}
export const trailLength = arc[arc.length - 1].length;
let cursor = 1;
export const trailSamples: readonly Point[] = Array.from({ length: 601 }, (_, index) => {
  const distance = trailLength * index / 600;
  while (cursor < arc.length - 1 && arc[cursor].length < distance) cursor++;
  const a = arc[cursor - 1], b = arc[cursor];
  const t = (distance - a.length) / (b.length - a.length);
  return [lerp(a.point[0], b.point[0], t), lerp(a.point[1], b.point[1], t)];
});
export function sampleTrail(position: number): Point {
  const f = clamp(position, 0, 1) * 600;
  const a = trailSamples[Math.floor(f)], b = trailSamples[Math.min(600, Math.floor(f) + 1)];
  return [lerp(a[0], b[0], f % 1), lerp(a[1], b[1], f % 1)];
}

export function mountainView(position: number, width: number, height: number) {
  const narrow = width <= 900;
  const scale = clamp(height / 1350, 0.4, 1.2) * (width < 600 ? 0.66 : 1);
  const point = sampleTrail(position);
  const x = width > 900
    ? width * 0.62 - lerp(PEAK_X, point[0], 0.55) * scale
    : clamp(width / 2 - point[0] * scale, width - WORLD_WIDTH * scale, 0);
  const y = clamp(height * (narrow ? 0.42 : 0.6) - point[1] * scale,
    height - WORLD_HEIGHT * scale, (narrow ? height * 0.3 : height * 0.42) - 150 * scale + 60);
  return { scale, x, y, point };
}

// Reserve the reference clearings now so adding the artwork in phase 4 cannot
// change the seeded tree/cloud sequence. Dimensions are each builder's w/top.
const landmarkSizes = [[50, -202], [75, -92], [92, -130], [62, -206], [60, -276], [80, -120]] as const;
export const landmarkSites = landmarkSizes.map(([width, top], index) => {
  const stopIndex = index + 2;
  const point = sampleTrail(journeyStops[stopIndex].trailPosition);
  return {
    stopIndex, width, top,
    x: clamp(point[0] + (stopIndex % 2 ? 1 : -1) * 110, trailL(point[1]) + 150, trailR(point[1]) - 150),
    y: point[1] - 22,
  };
});
const campPoint = sampleTrail(journeyStops[1].trailPosition);
export const campSite = {
  width: 44, top: -40,
  x: clamp(campPoint[0] + 90, trailL(campPoint[1]) + 80, trailR(campPoint[1]) - 80),
  y: campPoint[1] - 18,
};
