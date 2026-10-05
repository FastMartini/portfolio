import { WALL, WALL_S, ROOF, ROOF_S, WOOD_D, WARM, STEEL, SNOW, STW_S } from "../parts";
import type { LandmarkArt, Parts } from "../parts";

// 03: A-frame ski lodge with the lift's top terminal built onto its side and skis on a rack
export function skiLodge(parts: Parts): LandmarkArt {
  const { line, shape, rect, shadow, pulseOpacity, warmWin, smoke, bullwheel, roof, masonry } = parts;
  let g = shadow(95);
  // lift terminal lean-to attached to the lodge
  g += rect(-140, -6, 92, 6, WOOD_D);
  g += line("M-132 -6 V-56 M-86 -6 V-62", STEEL, 3);
  g += shape("M-24 -64 L-142 -52 L-142 -46 L-24 -58 Z", ROOF_S) + line("M-24 -64 L-142 -52", ROOF, 1.5);
  g += shape("M-142 -52 L-24 -64 L-24 -62 L-142 -50 Z", SNOW, ' opacity="0.9"');
  g += bullwheel(-106, -34, 13, -1);
  // lodge: chimney first so it rises out of the roof slope
  g += masonry(14, -100, 11, 62, 11) + rect(12, -104, 15, 4, STW_S) + rect(12, -106, 15, 2, SNOW);
  g += roof(-58, 58, 4, -116, 0);
  g += shape("M-36 0 L0 -78 L36 0 Z", WALL) + shape("M0 -78 L36 0 L0 0 Z", WALL_S);
  for (let vx = -30; vx <= 30; vx += 6) {
    const top = -78 + Math.abs(vx) * (78 / 36);
    g += line("M" + vx + " " + top.toFixed(1) + " V0", WALL_S, 0.8, ' opacity="0.7"');
  }
  g += shape("M-58 4 L-30 -54 L-27 -52 L-54 4 Z", SNOW, ' opacity="0.9"');
  g += '<path d="M-15 -42 L0 -70 L15 -42 Z" fill="' + WOOD_D + '"/>';
  g += '<path d="M-12 -43.5 L0 -66 L12 -43.5 Z" fill="' + WARM + '">' + pulseOpacity(0.6, 1, 4.6) + "</path>";
  g += line("M0 -66 V-43.5 M-7 -52 H7", WOOD_D, 1);
  g += rect(-28, -34, 56, 3, WOOD_D);
  for (let bal = -26; bal <= 26; bal += 4) g += line("M" + bal + " -34 V-41", WOOD_D, 0.9);
  g += line("M-28 -41 H28", WOOD_D, 1.6);
  g += rect(-8, -23, 16, 23, WOOD_D) + rect(-6, -21, 12, 21, ROOF) + '<circle cx="3" cy="-10" r="1" fill="' + WARM + '"/>';
  g += warmWin(-24, -22, 9, 10, false) + warmWin(15, -22, 9, 10, false);
  g += smoke(19.5, -110, 1);
  return { svg: g, top: -130, w: 92, cable: [-106, -47] };
}
