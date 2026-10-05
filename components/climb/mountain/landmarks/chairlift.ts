import { lerp } from "../geometry";
import type { Point } from "../geometry";
import { ROOF, WIN, STEEL } from "../parts";
import type { Parts } from "../parts";

export function chairlift(parts: Parts, A: Point, B: Point, scale: number) {
  const { line, shape } = parts;
  const sag = function (f: number) { return Math.sin(Math.PI * ((f * 3) % 1)) * 8; };
  // The haul rope wraps each bullwheel: top strand runs up, bottom strand runs back down
  const rA = 14 * scale, rB = 13 * scale;                 // bullwheel radii at the base (02) and top (03) stations
  const dropA = 2 * rA, dropB = 2 * rB;             // bottom strand leaves from the bottom of each wheel
  function strand(fromA: boolean, lower: boolean) {
    const pts: Point[] = [];
    for (let q2 = 0; q2 <= 30; q2++) {
      const f = fromA ? q2 / 30 : 1 - q2 / 30;
      pts.push([lerp(A[0], B[0], f), lerp(A[1], B[1], f) + sag(f) + (lower ? lerp(dropA, dropB, f) : 0)]);
    }
    return pts;
  }
  function pts2d(pts: readonly Point[], move: boolean) { return pts.map(function (pt, k) { return (k === 0 && move ? "M" : "L") + pt[0].toFixed(1) + " " + pt[1].toFixed(1); }).join(" "); }
  const sweep = B[0] > A[0] ? 1 : 0;
  const upper = strand(true, false), lowerBack = strand(false, true);
  const loopPath = pts2d(upper, true) +
    " A" + rB.toFixed(1) + " " + rB.toFixed(1) + " 0 0 " + sweep + " " + B[0].toFixed(1) + " " + (B[1] + dropB).toFixed(1) + " " +
    pts2d(lowerBack.slice(1), false) +
    " A" + rA.toFixed(1) + " " + rA.toFixed(1) + " 0 0 " + sweep + " " + A[0].toFixed(1) + " " + A[1].toFixed(1) + " Z";
  let lift = "";
  [0.33, 0.66].forEach(function (f) {
    const tx2 = lerp(A[0], B[0], f), ty2 = lerp(A[1], B[1], f) + 4, low = lerp(dropA, dropB, f);
    lift += line("M" + tx2.toFixed(0) + " " + ty2.toFixed(0) + " V" + (ty2 + 90 + low * 0.3).toFixed(0), STEEL, 4) +
      line("M" + (tx2 - 11).toFixed(0) + " " + ty2.toFixed(0) + " H" + (tx2 + 11).toFixed(0), STEEL, 2.5) +
      line("M" + (tx2 - 8).toFixed(0) + " " + (ty2 + low - 2).toFixed(0) + " H" + (tx2 + 8).toFixed(0), STEEL, 2);
  });
  lift += line(pts2d(upper, true), WIN, 1.3) + '<path d="' + pts2d(strand(true, true), true) + '" fill="none" stroke="' + WIN + '" stroke-width="1.3" opacity="0.6"/>';
  // Chairs travel one continuous loop: up, around the top wheel, down, around the bottom wheel
  const chairDur = 60, nChairs = 12;
  for (let ch = 0; ch < nChairs; ch++) {
    const begin = "-" + ((ch / nChairs) * chairDur).toFixed(2) + "s";
    lift += "<g>" + line("M0 0 v20 h-12 m12 0 h3 v-8", WIN, 1.6) + shape("M-13 19 h17 v4 h-17 Z", ROOF) +
      '<animateMotion dur="' + chairDur + 's" begin="' + begin + '" repeatCount="indefinite" path="' + loopPath + '"/></g>';
  }
  
  return lift;
}
