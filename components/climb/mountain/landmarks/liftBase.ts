import { WALL, ROOF, ROOF_S, WOOD, WOOD_D, WIN, WARM, STEEL } from "../parts";
import type { LandmarkArt, Parts } from "../parts";

// 02: chairlift base station with a covered bullwheel terminal
export function liftBase(parts: Parts): LandmarkArt {
  const { line, shape, rect, shadow, warmWin, bullwheel, roof, masonry } = parts;
  let g = shadow(88);
  g += masonry(-52, -9, 88, 9, 3);
  g += rect(-50, -54, 84, 45, WOOD) + rect(10, -54, 24, 45, WOOD_D, ' opacity="0.55"');
  for (let bx = -45; bx < 34; bx += 6) g += line("M" + bx + " -54 V-9", WOOD_D, 0.8, ' opacity="0.45"');
  g += rect(-50, -54, 84, 5, "#1f2621", ' opacity="0.22"');
  g += roof(-60, 44, -52, -86, 5);
  g += rect(-23, -36, 20, 27, WOOD_D) + rect(-21, -34, 16, 25, WIN) + '<circle cx="-8" cy="-21" r="1.2" fill="' + WARM + '"/>';
  g += rect(-25, -46, 24, 8, WALL) + '<text x="-13" y="-39.5" font-family="Manrope, sans-serif" font-size="6.5" font-weight="800" text-anchor="middle" fill="' + WIN + '">LIFT</text>';
  g += warmWin(-44, -40, 13, 11, false);
  g += warmWin(16, -40, 11, 11, false);
  // terminal
  g += rect(36, -6, 44, 6, WOOD_D);
  g += line("M40 -6 V-66 M76 -6 V-70", STEEL, 3);
  g += shape("M34 -64 L84 -71 L84 -66 L34 -59 Z", ROOF_S) + line("M34 -64 L84 -71", ROOF, 1.5);
  g += bullwheel(58, -42, 14, 1);
  return { svg: g, top: -92, w: 75, cable: [58, -56] };
}
