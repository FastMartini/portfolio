import { WALL, WALL_S, ROOF, WOOD, WOOD_D, WARM, STEEL } from "../parts";
import type { LandmarkArt, Parts } from "../parts";

// 04: stone radio and weather station; dish and beacon send out signal pulses
export function radioStation(parts: Parts): LandmarkArt {
  const { line, shape, rect, shadow, pulseOpacity, warmWin, masonry } = parts;
  let g = shadow(70);
  g += masonry(-50, -40, 64, 40, 21);
  g += rect(-8, -40, 22, 40, "#1f2621", ' opacity="0.14"');
  g += rect(-56, -46, 76, 6, WOOD_D) + rect(-56, -46, 76, 1.5, WOOD);
  g += rect(-31, -27, 17, 27, WOOD_D) + rect(-29, -25, 13, 25, ROOF) + '<circle cx="-19" cy="-12" r="1" fill="' + WARM + '"/>';
  g += warmWin(-46, -32, 9, 9, false);
  g += rect(4, -54, 4, 8, STEEL) + rect(3, -56, 6, 2, STEEL);
  // dish on the roof, pointing up and left
  g += line("M-22 -46 L-17 -60", STEEL, 2.4);
  g += shape("M-40 -82 Q-10 -94 -5 -62 Q-28 -60 -40 -82 Z", WALL) + shape("M-20 -70 Q-10 -94 -5 -62 Q-14 -62 -20 -70 Z", WALL_S);
  g += line("M-21 -72 L-31 -84", STEEL, 1.2) + '<circle cx="-32" cy="-85" r="2" fill="' + STEEL + '"/>';
  // signal pulses leaving the dish
  for (let k = 0; k < 3; k++) {
    const b = "-" + (k * 0.9).toFixed(1) + "s";
    g += '<g transform="translate(-34 -88) rotate(-135)"><g opacity="0">' +
      line("M9 -10 A13 13 0 0 1 9 10", ROOF, 2.2) +
      '<animateTransform attributeName="transform" type="scale" values="0.5;2.4" dur="2.7s" begin="' + b + '" repeatCount="indefinite"/>' +
      '<animate attributeName="opacity" values="0;0.95;0" keyTimes="0;0.2;1" dur="2.7s" begin="' + b + '" repeatCount="indefinite"/></g></g>';
  }
  // lattice mast with a beacon
  g += line("M22 0 L33 -176 L44 0", STEEL, 3);
  for (let m = 0; m < 8; m++) {
    const y1 = -m * 22, y2 = -(m + 1) * 22, w1 = 11 - m * 1.3, w2 = 11 - (m + 1) * 1.3;
    g += line("M" + (33 - w1).toFixed(1) + " " + y1 + " L" + (33 + w2).toFixed(1) + " " + y2 + " M" + (33 - w2).toFixed(1) + " " + y2 + " H" + (33 + w2).toFixed(1), STEEL, 1);
  }
  for (let rr = 0; rr < 2; rr++) {
    const b2 = "-" + (rr * 1.4).toFixed(1) + "s";
    g += '<circle cx="33" cy="-180" r="4" fill="none" stroke="' + ROOF + '" stroke-width="1.6" opacity="0">' +
      '<animate attributeName="r" values="4;26" dur="2.8s" begin="' + b2 + '" repeatCount="indefinite"/>' +
      '<animate attributeName="opacity" values="0;0.8;0" keyTimes="0;0.15;1" dur="2.8s" begin="' + b2 + '" repeatCount="indefinite"/></circle>';
  }
  g += '<circle cx="33" cy="-180" r="7" fill="' + WARM + '" opacity="0.3">' + pulseOpacity(0.1, 0.45, 1.6) + "</circle>";
  g += '<circle cx="33" cy="-180" r="3.5" fill="' + ROOF + '">' + pulseOpacity(0.6, 1, 1.6) + "</circle>";
  return { svg: g, top: -206, w: 62 };
}
