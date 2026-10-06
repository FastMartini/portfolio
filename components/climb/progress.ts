import { journeyStops } from "../../content/journey";
import { clamp, lerp } from "./mountain/geometry";

export function smooth(a: number, b: number, value: number) {
  const t = clamp((value - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

export function readClimbProgress(scroll: number) {
  const u = clamp(scroll, 0, 1) * (journeyStops.length - 1);
  const index = Math.min(journeyStops.length - 2, Math.floor(u));
  const position = lerp(journeyStops[index].trailPosition, journeyStops[index + 1].trailPosition,
    smooth(0.18, 0.82, u - index));
  return { u, position, nearest: Math.round(u) };
}

export type ClimbFrame = ReturnType<typeof readClimbProgress> & { reducedMotion: boolean };
