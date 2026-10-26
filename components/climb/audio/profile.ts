import { campSite, clamp, sampleTrail } from "../mountain/geometry";
import { smooth } from "../progress";

export type AmbientMix = { fire: number; snow: number; firePan: number };

export function ambientMix(position: number): AmbientMix {
  const progress = clamp(position, 0, 1);
  const point = sampleTrail(progress);
  const distance = Math.hypot(point[0] - campSite.x, point[1] - campSite.y);
  return {
    fire: 1 - smooth(120, 650, distance),
    snow: smooth(0.48, 0.84, progress) * (1 - smooth(0.88, 0.995, progress)),
    firePan: clamp((campSite.x - point[0]) / 600, -0.6, 0.6),
  };
}
