import { WALL, WALL_S, ROOF, WOOD, WOOD_D, WIN, PINE } from "../parts";
import type { LandmarkArt, Parts } from "../parts";

export function highPass(parts: Parts): LandmarkArt {
  const { line, shape, rect, shadow } = parts;
  let g = shadow(78);
  g += '<ellipse cx="-56" cy="0" rx="30" ry="4" fill="#1f2621" opacity="0.25" filter="url(#lm-blur)"/>';
  // second-iteration pebbles: plain stacked stones, each with a shaded right side
  [[-56, -8, 24, 10], [-58, -25, 20, 9], [-55, -40, 16, 8], [-57, -53, 12, 7], [-56, -63, 8, 5]].forEach(function (st, k) {
    g += '<ellipse cx="' + st[0] + '" cy="' + st[1] + '" rx="' + st[2] + '" ry="' + st[3] + '" fill="' + (k % 2 ? "#857e70" : "#a39b8b") + '"/>';
    g += '<ellipse cx="' + (st[0] + st[2] * 0.4) + '" cy="' + st[1] + '" rx="' + (st[2] * 0.6) + '" ry="' + st[3] + '" fill="#857e70" opacity="0.5"/>';
  });
  g += line("M60 0 V-114", WOOD_D, 5) + rect(56, -117, 8, 4, WOOD);
  // Summit: points left
  g += shape("M60 -82 H10 L0 -72 L10 -62 H60 Z", WALL) + shape("M60 -72 H0 L10 -62 H60 Z", WALL_S, ' opacity="0.55"');
  g += '<text x="31" y="-68.5" font-family="Manrope, sans-serif" font-size="10.5" font-weight="800" text-anchor="middle" fill="' + WIN + '">Summit</text>';
  // Trailhead: points right, back down the trail
  g += shape("M60 -56 H114 L124 -46 L114 -36 H60 Z", WALL_S) + shape("M60 -46 H124 L114 -36 H60 Z", "#9d927c", ' opacity="0.45"');
  g += '<text x="90" y="-42.5" font-family="Manrope, sans-serif" font-size="10" font-weight="800" text-anchor="middle" fill="' + WIN + '">Trailhead</text>';
  const ax = -56, ay = -67, bx = 60, by = -113, mx = (ax + bx) / 2, my = Math.max(ay, by) - 18, cols = [ROOF, PINE, WALL, ROOF, PINE, WALL, ROOF];
  g += line("M" + ax + " " + ay + " Q" + mx + " " + my + " " + bx + " " + by, WOOD_D, 1);
  for (let k = 1; k <= 7; k++) {
    const tt = k / 8, px = (1 - tt) * (1 - tt) * ax + 2 * (1 - tt) * tt * mx + tt * tt * bx, py = (1 - tt) * (1 - tt) * ay + 2 * (1 - tt) * tt * my + tt * tt * by;
    g += shape("M" + (px - 4).toFixed(1) + " " + py.toFixed(1) + " L" + (px + 4).toFixed(1) + " " + py.toFixed(1) + " L" + px.toFixed(1) + " " + (py + 11).toFixed(1) + " Z", cols[k - 1]);
  }
  return { svg: g, top: -120, w: 80 };
}
