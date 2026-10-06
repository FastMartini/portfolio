import { WALL, WALL_S, ROOF, WOOD, WOOD_D, WIN, WARM, STW_S } from "../parts";
import type { LandmarkArt, Parts } from "../parts";

// 01: fire lookout watchtower
export function watchtower(parts: Parts): LandmarkArt {
  const { line, rect, shadow, pulseOpacity, roof } = parts;
  let g = shadow(55);
  g += rect(-38, -4, 10, 5, STW_S) + rect(28, -4, 10, 5, STW_S);
  g += line("M-34 0 L-19 -118 M34 0 L19 -118", WOOD_D, 5) + line("M-22 0 L-12 -118 M22 0 L12 -118", WOOD, 3);
  g += line("M-31 -20 L28 -56 M31 -20 L-28 -56 M-28 -56 L24 -92 M28 -56 L-24 -92 M-24 -92 L20 -116 M24 -92 L-20 -116", WOOD, 1.6);
  g += line("M-31 -20 H31 M-28 -56 H28 M-24 -92 H24", WOOD_D, 2.2);
  g += line("M4 0 L2 -118 M12 0 L10 -118", WOOD_D, 1.4);
  for (let r2 = 1; r2 < 12; r2++) g += line("M" + (4 - r2 * 0.17).toFixed(1) + " " + (-r2 * 10) + " H" + (12 - r2 * 0.17).toFixed(1), WOOD_D, 1);
  g += rect(-36, -126, 72, 8, WOOD_D);
  g += rect(-27, -160, 54, 34, WALL) + rect(4, -160, 23, 34, WALL_S);
  g += line("M-27 -152 H27 M-27 -144 H27 M-27 -136 H27", WALL_S, 0.8, ' opacity="0.8"');
  g += rect(-23, -154, 46, 14, WOOD_D);
  g += rect(-21, -152, 13, 10, WIN) + '<rect x="-6.5" y="-152" width="13" height="10" fill="' + WARM + '">' + pulseOpacity(0.55, 1, 4.2) + "</rect>" + rect(8, -152, 13, 10, WIN);
  g += line("M-36 -126 V-136 M-24 -126 V-136 M-12 -126 V-136 M0 -126 V-136 M12 -126 V-136 M24 -126 V-136 M36 -126 V-136 M-37 -136 H37", WOOD_D, 1.4);
  g += roof(-38, 38, -158, -186, 4);
  g += line("M0 -186 V-200", WOOD_D, 1.6) + '<path fill="' + ROOF + '" d="M0 -200 Q6 -200 13 -196.5 Q6 -194 0 -193 Z"><animate attributeName="d" dur="1.8s" repeatCount="indefinite" values="M0 -200 Q6 -200 13 -196.5 Q6 -194 0 -193 Z;M0 -200 Q6 -198 13 -198 Q6 -195 0 -193 Z;M0 -200 Q6 -201 12 -195.5 Q6 -193 0 -193 Z;M0 -200 Q6 -200 13 -196.5 Q6 -194 0 -193 Z"/></path>';
  return { svg: g, top: -202, w: 50 };
}
