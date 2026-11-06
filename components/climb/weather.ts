import { clamp, lerp } from "./mountain/geometry";
import { smooth } from "./progress";

type Color = readonly [number, number, number];
const hex = (value: string): Color => [1, 3, 5].map((start) => parseInt(value.slice(start, start + 2), 16)) as [number, number, number];
const SKY = [
  [0, "#e7dcc0", "#f6efdc", "#f2dcb5"], [0.3, "#cbd5cb", "#e6e8dc", "#e9e2cf"],
  [0.52, "#a9b3b6", "#d3d8d5", "#cfd3d4"], [0.7, "#8f9aa1", "#c3cacd", "#c4c9cd"],
  [0.84, "#ccd5db", "#e7ebec", "#e3e6e8"], [0.9, "#e6edf1", "#f4f7f8", "#f5f2ea"],
  [0.95, "#3f8ad4", "#bfe0f5", "#fff6dc"], [1, "#2b78cc", "#a8d5f4", "#fff8e4"],
] as const;
const frames = SKY.map(([position, top, bottom, light]) => ({ position, colors: [hex(top), hex(bottom), hex(light)] }));
export const colorCss = (color: Color) => `rgb(${color.map(Math.round).join(",")})`;

export function weather(position: number) {
  const t = clamp(position, 0, 1);
  const index = Math.max(0, frames.findIndex((frame, index) => index < frames.length - 1 && t <= frames[index + 1].position));
  const a = frames[index], b = frames[index + 1];
  const blend = smooth(a.position, b.position, t);
  const colors = a.colors.map((color, index) => color.map((channel, axis) => lerp(channel, b.colors[index][axis], blend)) as [number, number, number]);
  return {
    top: colors[0], bottom: colors[1], light: colors[2],
    snow: smooth(0.5, 0.6, t) * (1 - smooth(0.82, 0.88, t)),
    haze: smooth(0.83, 0.875, t) * (1 - smooth(0.885, 0.93, t)) * 0.85,
    sun: smooth(0.9, 0.98, t),
  };
}
