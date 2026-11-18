import { pointText, type Point, type TrailGeometry } from "./trail-geometry";

const NS = "http://www.w3.org/2000/svg";
function element<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>, parent: SVGElement) {
  const node = document.createElementNS(NS, tag);
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value))); parent.append(node); return node;
}
export function buildBraid(group: SVGGElement, line: SVGPathElement, geo: TrailGeometry) {
  group.replaceChildren();
  const { braidAt, length, narrow, samples, about, padding } = geo;
  let nearest = samples[0], distance = Infinity;
  samples.forEach(p => { const d = Math.hypot(p.x - braidAt.x, p.y - braidAt.y); if (d < distance) { distance = d; nearest = p; } });
  const start = Math.max(0, nearest.length - (narrow ? 40 : 30));
  const duration = Math.max(120, Math.min(narrow ? 300 : 560, length * 0.12, geo.pins[1].length - start - 90));
  const strands: Point[][] = [[], [], []];
  let tangent: Point = { x: 0, y: 1 };
  for (let k = 0; k <= 240; k++) {
    const len = Math.min(length - 1, start + duration * k / 240), p = line.getPointAtLength(len), q = line.getPointAtLength(Math.min(length, len + 1));
    const norm = Math.hypot(q.x - p.x, q.y - p.y) || 1, tx = (q.x - p.x) / norm, ty = (q.y - p.y) / norm;
    const s = k / 240, amp = (narrow ? 6 : 15) * (1 - s * s * (3 - 2 * s));
    if (!k) tangent = { x: tx, y: ty };
    strands.forEach((strand, i) => { const offset = amp * Math.sin(2 * Math.PI * (narrow ? 3 : 4.5) * s + i * 2 * Math.PI / 3); strand.push({ x: p.x - ty * offset, y: p.y + tx * offset }); });
  }
  const poly = (points: Point[]) => points.map(p => ` L${pointText(p)}`).join("");
  const leads: { from: Point; c1: Point; c2: Point }[] = [];
  const paths = strands.map((strand, i) => {
    strand.splice(Math.round(strand.length * 0.9));
    const first = strand[0];
    if (narrow) return `M${pointText(first)}` + poly(strand.slice(1));
    const from = { x: about.right - padding, y: braidAt.y - 170 + i * 46 };
    const c1 = { x: from.x - 160, y: from.y }, c2 = { x: first.x - tangent.x * 110, y: first.y - tangent.y * 110 };
    leads[i] = { from, c1, c2 };
    return `M${pointText(from)} C${pointText(c1)} ${pointText(c2)} ${pointText(first)}` + poly(strand.slice(1));
  });
  const svg = group.ownerSVGElement!;
  const maskAttrs = { maskUnits: "userSpaceOnUse", x: 0, y: 0, width: svg.getAttribute("width")!, height: svg.getAttribute("height")! };
  const defs = element("defs", {}, group);
  const ropeMask = element("mask", { ...maskAttrs, id: "about-rope-mask" }, defs);
  const ropeReveal = element("path", { d: paths[0], fill: "none", stroke: "white", "stroke-width": 8, "stroke-linecap": "round" }, ropeMask);
  const rope = element("path", { class: "braid-rope", d: paths[0] }, group);
  element("path", { class: "braid-rope-twist", d: paths[0], mask: "url(#about-rope-mask)" }, group);
  const string = element("path", { class: "braid-string", d: paths[1] }, group);
  const reverse = [...strands[2]].reverse();
  let reversedPath = `M${pointText(reverse[0])}` + poly(reverse.slice(1));
  if (leads[2]) { const { from, c1, c2 } = leads[2]; reversedPath += ` C${pointText(c2)} ${pointText(c1)} ${pointText(from)}`; }
  const codePath = element("path", { id: "about-code-path", fill: "none", d: reversedPath }, defs);
  const codeMask = element("mask", { ...maskAttrs, id: "about-code-mask" }, defs);
  const codeReveal = element("path", { d: paths[2], fill: "none", stroke: "white", "stroke-width": 22, "stroke-linecap": "round" }, codeMask);
  const text = element("text", { class: `braid-code-text${narrow ? " braid-code-text--small" : ""}`, mask: "url(#about-code-mask)", dy: 3.5 }, group);
  const textPath = element("textPath", { href: "#about-code-path", startOffset: 0 }, text);
  const binary = [..."climb · play · code "].map(ch => ch.charCodeAt(0).toString(2).padStart(8, "0")).join("");
  const digits = Math.ceil(codePath.getTotalLength() / (narrow ? 5.4 : 6.6));
  textPath.textContent = binary.repeat(Math.ceil(digits / binary.length) + 1).slice(0, digits);
  const hit = element("path", { class: "braid-string-hit", d: paths[1] }, group);
  const labels = narrow ? [] : ["CLIMBING", "MUSIC", "CODE"].map((label, i) => {
    const text = element("text", { class: "braid-label", x: about.right - padding, y: braidAt.y - 170 + i * 46 - 13, "text-anchor": "end" }, group);
    text.textContent = label; return text;
  });
  const draws = [rope, ropeReveal, string, codeReveal, hit].map(path => { const length = path.getTotalLength(); path.style.strokeDasharray = `${length} ${length + 10}`; return { path, length }; });
  return {
    paint(shown: number, still: boolean) {
      const fraction = still ? 1 : Math.max(0, Math.min(1, (shown - (start - 160)) / (duration + 160)));
      draws.forEach(({ path, length }) => path.style.strokeDashoffset = String(length * (1 - fraction)));
      labels.forEach(label => label.style.opacity = fraction > 0.12 ? "1" : "0");
      // Hidden portions must not accept a click through empty space.
      hit.style.pointerEvents = fraction > 0.01 && !still ? "stroke" : "none";
    },
    hit, string,
  };
}
