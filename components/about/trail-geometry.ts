export type Point = { x: number; y: number };
export type Sample = Point & { length: number };
type Node = { point: Point; direction: Point };
export type Bounds = { left: number; right: number; top: number; bottom: number; cx: number; cy: number; width: number; height: number };
export const pointText = (p: Point) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
export const normalize = (p: Point): Point => { const n = Math.hypot(p.x, p.y) || 1; return { x: p.x / n, y: p.y / n }; };

/** Layout coordinates deliberately ignore reveal transforms. */
export function relativeBounds(element: HTMLElement, main: HTMLElement): Bounds {
  let left = 0, top = 0, at: HTMLElement | null = element;
  while (at && at !== main) { const parent = at.offsetParent as HTMLElement | null; left += at.offsetLeft + (parent?.clientLeft ?? 0); top += at.offsetTop + (parent?.clientTop ?? 0); at = parent; }
  const width = element.offsetWidth, height = element.offsetHeight;
  return { left, top, width, height, right: left + width, bottom: top + height, cx: left + width / 2, cy: top + height / 2 };
}
function cubic(points: Point[], t: number): Point {
  const u = 1 - t, [a, b, c, d] = points;
  return { x: u ** 3 * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t ** 3 * d.x, y: u ** 3 * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t ** 3 * d.y };
}
function join(a: Node, b: Node, minX: number): string {
  // Keep the quiet stretches beside the copy gently curved as well.
  if (Math.abs(a.point.x - b.point.x) < 0.1 && b.point.y - a.point.y > 40) {
    const middle: Node = { point: { x: a.point.x + 5, y: (a.point.y + b.point.y) / 2 }, direction: { x: 0, y: 1 } };
    return join(a, middle, minX) + join(middle, b, minX);
  }
  const dy = Math.max(0, b.point.y - a.point.y), chord = Math.hypot(b.point.x - a.point.x, dy);
  let ka = Math.min(chord * 0.5, dy * 0.9 / Math.max(a.direction.y, 0.2));
  let kb = Math.min(chord * 0.5, dy * 0.9 / Math.max(b.direction.y, 0.2));
  const curve = () => [a.point, { x: a.point.x + a.direction.x * ka, y: a.point.y + a.direction.y * ka }, { x: b.point.x - b.direction.x * kb, y: b.point.y - b.direction.y * kb }, b.point];
  let points = curve();
  for (let tries = 0; tries < 12; tries++) {
    if (Array.from({ length: 41 }, (_, k) => cubic(points, k / 40).x).every(x => x >= minX)) break;
    ka *= 0.85; kb *= 0.85; points = curve();
  }
  return ` C${pointText(points[1])} ${pointText(points[2])} ${pointText(points[3])}`;
}

export function buildTrailGeometry(main: HTMLElement, line: SVGPathElement) {
  const hero = main.querySelector<HTMLElement>(".trailhead")!, about = main.querySelector<HTMLElement>(".about")!;
  const work = main.querySelector<HTMLElement>(".work")!, marker = work.querySelector<HTMLElement>(".waypoint-marker")!;
  if (!hero.offsetWidth || !about.offsetWidth) return null;
  const path = [...hero.querySelectorAll<SVGPathElement>(".trailhead-trail")].find(p => getComputedStyle(p.ownerSVGElement!).display !== "none")!;
  const matrix = path?.getScreenCTM(); if (!matrix) return null;
  const origin = main.getBoundingClientRect(), heroLength = path.getTotalLength();
  const heroPoints = Array.from({ length: 321 }, (_, i) => {
    const p = path.getPointAtLength(heroLength * i / 320).matrixTransform(matrix);
    return { x: p.x - origin.left, y: p.y - origin.top };
  });
  const end = heroPoints.at(-1)!, previous = heroPoints.at(-4)!;
  const direction = normalize({ x: end.x - previous.x, y: end.y - previous.y });
  const rel = (el: HTMLElement) => relativeBounds(el, main);
  const A = rel(about), title = rel(about.querySelector<HTMLElement>(".about-top")!);
  const kicker = rel(work.querySelector<HTMLElement>(".section-kicker")!), M = rel(marker);
  const pitches = [...about.querySelectorAll<HTMLElement>(".about-pitch")];
  const B = pitches.map(rel), labels = pitches.map(p => rel(p.querySelector<HTMLElement>("h3")!));
  const padding = parseFloat(getComputedStyle(about).paddingLeft), narrow = innerWidth <= 900;
  const down = { x: 0, y: 1 }, last = { x: M.cx, y: M.top };
  let nodes: Node[], braidAt: Point;
  if (narrow) {
    const gutter = A.left + padding + 10, amplitude = 11;
    braidAt = { x: gutter + amplitude, y: B[0].cy };
    nodes = [{ point: end, direction }, { point: { x: gutter - amplitude, y: title.top + title.height * 0.35 }, direction: down },
      ...B.map((b, i) => ({ point: { x: gutter + (i % 2 ? -amplitude : amplitude), y: b.cy }, direction: down })),
      { point: { x: gutter - amplitude + 4, y: (A.bottom + kicker.top) / 2 }, direction: down },
      { point: { x: gutter + amplitude, y: kicker.bottom + 40 }, direction: down }, { point: last, direction: down }];
  } else {
    const builder = pitches[1], teacher = pitches[2];
    const builderText = rel(builder.querySelector<HTMLElement>(".about-pitch-copy")!), builderRing = rel(builder.querySelector<HTMLElement>(".photo-ring")!);
    const teacherText = rel(teacher.querySelector<HTMLElement>(".about-pitch-copy")!), teacherRing = rel(teacher.querySelector<HTMLElement>(".photo-ring")!);
    const bx = (builderRing.right + builderText.left) / 2, tx = (teacherText.right + teacherRing.left) / 2;
    braidAt = { x: A.left + A.width * 0.76, y: B[0].cy };
    nodes = [{ point: end, direction }, { point: { x: A.left + padding * 0.5 + 26, y: title.bottom + 46 }, direction: normalize({ x: 0.62, y: 1 }) },
      { point: braidAt, direction: down }, { point: { x: bx, y: labels[1].cy }, direction: down },
      { point: { x: bx, y: Math.max(builderText.bottom + 16, builderRing.bottom + 24) }, direction: down },
      // Enter the gap before the Teacher ring's side cards become visible.
      { point: { x: tx + 30, y: Math.min(labels[2].cy - 24, teacherRing.top - 32) }, direction: normalize({ x: -0.9, y: 1 }) },
      { point: { x: tx, y: labels[2].cy }, direction: down },
      { point: { x: tx, y: teacherText.bottom + 24 }, direction: down },
      { point: { x: A.left + padding * 0.5, y: kicker.bottom + 40 }, direction: down }, { point: last, direction: down }];
  }
  let d = heroPoints.map((p, i) => `${i ? "L" : "M"}${pointText(p)}`).join(" ");
  for (let i = 0; i < nodes.length - 1; i++) d += join(nodes[i], nodes[i + 1], A.left + Math.max(10, padding * 0.2));
  line.setAttribute("d", d);
  const length = line.getTotalLength();
  const samples: Sample[] = Array.from({ length: 1601 }, (_, i) => { const p = line.getPointAtLength(length * i / 1600); return { x: p.x, y: p.y, length: length * i / 1600 }; });
  let from = 0;
  const pins = labels.map(label => { while (from < samples.length - 1 && samples[from].y < label.cy) from++; return samples[from]; });
  const mainTop = origin.top + scrollY, reading = innerHeight * 0.62;
  let peak = -Infinity;
  const reachY = samples.map(p => peak = Math.max(peak, p.y));
  const endScroll = Math.max(1, Math.min(last.y + mainTop - reading, document.documentElement.scrollHeight - innerHeight - 4));
  return { length, samples, pins, mainTop, endScroll, reachY, braidAt, narrow, about: A, padding, pitches, marker };
}
export type TrailGeometry = NonNullable<ReturnType<typeof buildTrailGeometry>>;
export function lengthAtHeight(geo: TrailGeometry, y: number) {
  let lo = 0, hi = geo.reachY.length - 1;
  if (geo.reachY[0] > y) return 0;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (geo.reachY[mid] <= y) lo = mid; else hi = mid - 1; }
  return geo.samples[lo].length;
}
