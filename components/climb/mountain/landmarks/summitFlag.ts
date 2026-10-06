import type { Point } from "../geometry";

// Exact traveling-wave model from reference/summit-flag-generator.py:
// 12 vertical strips, 30 frames + the repeated initial frame, fold-slope light.
export function summitFlag() {
  const columns = 12, frames = 30;
  const strips: string[][] = Array.from({ length: columns }, () => []);
  const shades: string[][] = Array.from({ length: columns }, () => []);
  const coordinates = (point: Point) => point.map((n) => n.toFixed(1)).join(" ");
  for (let frame = 0; frame <= frames; frame++) {
    const t = frame % frames / frames;
    const top: Point[] = [], bottom: Point[] = [];
    for (let k = 0; k <= columns; k++) {
      const u = k / columns, amplitude = 4.2 * u ** 1.15, phase = 2 * Math.PI * t;
      const displacement = amplitude * Math.sin(2 * Math.PI * 1.25 * u - phase)
        + 0.35 * amplitude * Math.sin(2 * Math.PI * 2.6 * u - 2 * phase + 1.1);
      const x = 1.5 + 38 * u - 1.2 * u ** 2 * (1 + Math.sin(2 * Math.PI * 1.25 * u - phase)) * 0.5;
      const droop = 2.5 * u * u;
      top.push([x, -72 + displacement + droop]);
      bottom.push([x, -72 + 24 - 0.08 * 24 * u + displacement * 0.92 + droop]);
    }
    for (let k = 0; k < columns; k++) {
      const a = top[k], b = top[k + 1], c = bottom[k + 1], d = bottom[k];
      strips[k].push("M" + [a, b, c, d].map(coordinates).join(" L") + " Z");
      const slope = (b[1] - a[1]) / Math.max(0.1, b[0] - a[0]);
      const light = Math.max(-1, Math.min(1, -slope * 0.9));
      const base = [181, 101, 59], target = light > 0 ? [214, 140, 98] : [128, 66, 38];
      shades[k].push("#" + base.map((value, i) =>
        Math.round(value + (target[i] - value) * Math.abs(light)).toString(16).padStart(2, "0")).join(""));
    }
  }
  return '<g class="summit-flag">' + strips.map((paths, k) =>
    '<path d="' + paths[0] + '" fill="' + shades[k][0] + '" stroke="' + shades[k][0] + '" stroke-width="0.6" stroke-linejoin="round">' +
    ["d", "fill", "stroke"].map((attribute) => '<animate attributeName="' + attribute +
      '" dur="2.4s" repeatCount="indefinite" values="' + (attribute === "d" ? paths : shades[k]).join(";") + '"/>').join("") + "</path>",
  ).join("") + "</g>";
}
