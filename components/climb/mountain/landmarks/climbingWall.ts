import { ROOF, WOOD_D, STEEL, SNOW, PINE } from "../parts";
import type { LandmarkArt, Parts } from "../parts";

const ROPE = "#d38b3c";
export function climbingWall(parts: Parts): LandmarkArt {
  const { line, shape, rect } = parts;
// A climber seen from behind, facing the wall. Feet at (0,0). Jointed limbs, harness with gear, helmet.
function climber(x: number, y: number, jacket: string, helmet: string, pose: "lead" | "follow" | "hang", dur: number, delay: number, tilt = 0) {
  const b = "-" + delay + "s", PANTS = "#3a3f46", PANTS_S = "#2c3036", SKIN = "#d9b08c", SHOE = "#1f2621";
  const P = {
    lead:   { lL: [[-2.2, -14], [-8, -18], [-9, -12]], lR: [[2.2, -14], [5, -7], [4.5, 0]], aL: [[-5, -26], [-9, -33], [-9.5, -41]], aR: [[5, -26], [10, -29], [11.5, -35]], pack: true },
    follow: { lL: [[-2.2, -14], [-6, -8], [-6, -1]], lR: [[2.2, -14], [7, -12], [7.5, -6]], aL: [[-5, -26], [-8, -33], [-7, -40]], aR: [[5, -26], [9, -33], [9.5, -40]], pack: false },
    hang:   { lL: [[-2.2, -14], [-9, -12], [-11, -5]], lR: [[2.2, -14], [-5, -10], [-7, -2]], aL: [[-5, -26], [-6, -32], [-4, -38]], aR: [[5, -26], [8.5, -20], [9, -15]], pack: false }
  }[pose];
  function limb(j: number[][], col: string, w: number) { return line("M" + j[0][0] + " " + j[0][1] + " L" + j[1][0] + " " + j[1][1] + " L" + j[2][0] + " " + j[2][1], col, w); }
  let out = '<g transform="translate(' + x + " " + y + ") rotate(" + (tilt || 0) + ') scale(1.12)"><g>';
  out += '<animateTransform attributeName="transform" type="translate" values="0 0;' + (pose === "lead" ? "0.6 -2.4" : "0.4 -1.2") + ';0 0" dur="' + dur + 's" begin="' + b + '" repeatCount="indefinite"/>';
  // legs: pants with a darker far leg, shoes at the feet
  out += limb(P.lR, PANTS_S, 3.6) + limb(P.lL, PANTS, 3.6);
  [P.lL[2], P.lR[2]].forEach(function (f) { out += '<ellipse cx="' + (f[0] + 0.6) + '" cy="' + (f[1] + 0.4) + '" rx="2.6" ry="1.5" fill="' + SHOE + '"/>'; });
  // harness: waist belt, leg loops, gear on the loops, chalk bag behind
  out += '<rect x="-3.6" y="-14.5" width="7.2" height="3" rx="1.4" fill="' + "#c2b8a4" + '"/>';
  out += '<rect x="-5.2" y="-17.2" width="10.4" height="2.8" rx="1" fill="#2a2f2b"/>';
  out += line("M-4.2 -14.5 Q-3.8 -12 -2.4 -12 M4.2 -14.5 Q3.8 -12 2.4 -12", "#2a2f2b", 1.2);
  ["#e0b04a", "#5d7891", "#b5653b"].forEach(function (c, k) { out += line("M" + (-5 + k * 0.4) + " " + (-15.5 + k * 0.2) + " l" + (-0.8 + k * 0.4) + " 3.6", c, 1.2); });
  out += line("M5 -15.6 l0.6 3.8 M5.8 -15.4 l1 3.2", "#a9b0ae", 1);
  out += '<rect x="-1.8" y="-18" width="3.6" height="3.6" rx="1" fill="#d6ccb5"/>';
  // torso: tapered jacket, shaded on its right side; a small pack for the leader
  const torso = "M-5.4 -27.8 Q-6.4 -22 -4.8 -16.8 L4.8 -16.8 Q6.4 -22 5.4 -27.8 Q0 -30 -5.4 -27.8 Z";
  out += '<path d="' + torso + '" fill="' + jacket + '"/>';
  out += '<path d="M0.6 -29.4 Q5 -29 5.4 -27.8 Q6.4 -22 4.8 -16.8 L1 -16.8 Q2.2 -22 0.6 -29.4 Z" fill="#1f2621" opacity="0.2"/>';
  out += line("M-4.6 -21.5 H4.6", "#1f2621", 0.7, ' opacity="0.25"');
  if (P.pack) out += '<rect x="-3.6" y="-27" width="7.2" height="7.5" rx="2" fill="' + WOOD_D + '"/><rect x="-3.6" y="-27" width="7.2" height="2.2" rx="1" fill="#6a5240"/>';
  // arms: sleeve to the elbow, forearm, hand; they reach and settle out of phase
  function arm(j: number[][], flip: boolean, phaseOffset: number) {
    const reach = pose === "hang" ? (flip ? "0;9;0" : "0;-8;0") : (flip ? "0;14;0" : "0;-22;0");
    return "<g>" + line("M" + j[0][0] + " " + j[0][1] + " L" + j[1][0] + " " + j[1][1], jacket, 3.2) +
      line("M" + j[1][0] + " " + j[1][1] + " L" + j[2][0] + " " + j[2][1], jacket, 2.6) +
      '<circle cx="' + j[2][0] + '" cy="' + j[2][1] + '" r="1.6" fill="' + SKIN + '"/>' +
      '<animateTransform attributeName="transform" type="rotate" values="' + reach.split(";").map(function (a) { return a + " " + j[0][0] + " " + j[0][1]; }).join(";") +
      '" dur="' + dur + 's" begin="-' + (delay + phaseOffset) + 's" repeatCount="indefinite"/></g>';
  }
  out += arm(P.aR, true, dur / 2) + arm(P.aL, false, 0);
  // neck, back of the head, helmet with brim, strap and a vent highlight
  out += rect(-1.3, -31, 2.6, 2.4, SKIN);
  out += '<ellipse cx="0" cy="-33.4" rx="3.9" ry="4.1" fill="#5a3d28"/>';
  out += '<path d="M-4.9 -33.6 A4.9 5 0 0 1 4.9 -33.6 L5.4 -32.4 Q0 -31.4 -5.4 -32.4 Z" fill="' + helmet + '"/>';
  out += '<path d="M-3.4 -36.2 A3.6 3.4 0 0 1 1 -38" fill="none" stroke="#ffffff" stroke-width="1" opacity="0.35" stroke-linecap="round"/>';
  out += line("M-4.2 -32.4 Q-3.6 -30 -1.4 -29.6 M4.2 -32.4 Q3.6 -30 1.4 -29.6", "#2a2f2b", 0.7);
  return out + "</g></g>";
}
function quickdraw(x: number, y: number) {
  return '<circle cx="' + x + '" cy="' + y + '" r="1.3" fill="' + STEEL + '"/>' + line("M" + x + " " + y + " l0.8 4.5", "#a9b0ae", 1.2) + '<circle cx="' + (x + 0.8) + '" cy="' + (y + 5.5) + '" r="1.3" fill="none" stroke="#a9b0ae" stroke-width="0.9"/>';
}

  let sd = 91;
  const r = function () { sd = (sd * 16807) % 2147483647; return (sd - 1) / 2147483646; };
  let g = "";
  // soft fade so the cliff band melts into the mountain instead of reading as a separate rock
  g += '<defs><radialGradient id="cliff-fade-g" cx="0.5" cy="0.5" r="0.5"><stop offset="0.55" stop-color="#fff"/><stop offset="1" stop-color="#000"/></radialGradient>' +
    '<mask id="cliff-fade" maskUnits="userSpaceOnUse" x="-140" y="-340" width="280" height="380"><ellipse cx="0" cy="-140" rx="105" ry="170" fill="url(#cliff-fade-g)"/></mask></defs>';
  let tex = "";
  tex += '<ellipse cx="0" cy="-140" rx="100" ry="168" fill="#6c665a" opacity="0.55"/>';
  // faceted rock: a jittered tessellation of angular blocks, each lit on its upper-left and shaded on its lower-right
  const cw = 24, ch2 = 20, colsN = 10, rowsN = 18, gx0 = -120, gy0 = -330, grid: number[][][] = [];
  for (let gy = 0; gy <= rowsN; gy++) {
    grid.push([]);
    for (let gx = 0; gx <= colsN; gx++) {
      grid[gy].push([gx0 + gx * cw + (gy % 2 ? cw / 2 : 0) + (r() - 0.5) * cw * 0.55, gy0 + gy * ch2 + (r() - 0.5) * ch2 * 0.6]);
    }
  }
  const tones = ["#8f877a", "#857d70", "#9a9284", "#7a7266"];
  for (let ry = 0; ry < rowsN; ry++) {
    for (let rx2 = 0; rx2 < colsN; rx2++) {
      const A1 = grid[ry][rx2], B1 = grid[ry][rx2 + 1], C1 = grid[ry + 1][rx2 + 1], D1 = grid[ry + 1][rx2];
      const base = tones[Math.floor(r() * tones.length)];
      const pt = function (q: number[]) { return q[0].toFixed(1) + " " + q[1].toFixed(1); };
      tex += '<path d="M' + pt(A1) + " L" + pt(B1) + " L" + pt(C1) + " L" + pt(D1) + ' Z" fill="' + base + '"/>';
      // shaded half of the block (toward the lower right)
      tex += '<path d="M' + pt(B1) + " L" + pt(C1) + " L" + pt(D1) + ' Z" fill="#3f3a32" opacity="' + (0.14 + r() * 0.16).toFixed(2) + '"/>';
      // lit upper edge
      if (r() > 0.45) tex += line("M" + pt(A1) + " L" + pt(B1), "#bdb4a4", 1.1, ' opacity="0.55"');
      // dark joint along some block edges
      if (r() > 0.5) tex += line("M" + pt(B1) + " L" + pt(C1), "#3a352d", 1.2, ' opacity="0.6"');
      if (r() > 0.7) tex += line("M" + pt(D1) + " L" + pt(C1), "#3a352d", 1, ' opacity="0.5"');
    }
  }
  // a few long jagged cracks running in different directions
  for (let ck = 0; ck < 6; ck++) {
    let cx3 = -70 + r() * 140, cy3 = -300 + r() * 220, ang = (r() - 0.5) * 2.2 + (r() > 0.5 ? Math.PI / 2 : 0), dd = "M" + cx3.toFixed(1) + " " + cy3.toFixed(1);
    for (let seg = 0; seg < 6; seg++) {
      ang += (r() - 0.5) * 0.9;
      cx3 += Math.cos(ang) * (10 + r() * 10); cy3 += Math.abs(Math.sin(ang)) * (10 + r() * 10);
      dd += " L" + cx3.toFixed(1) + " " + cy3.toFixed(1);
    }
    tex += line(dd, "#2e2a24", 1.6, ' opacity="0.65"') + line(dd.replace(/(-?\d+\.\d) (-?\d+\.\d)/g, function (m0, a3, b3) { return (parseFloat(a3) - 1.2).toFixed(1) + " " + (parseFloat(b3) - 1).toFixed(1); }), "#c2b9a8", 0.8, ' opacity="0.45"');
  }
  // overhanging roofs: rock wedges that jut from the wall, lit lip on top, deep shadow beneath
  [[-4, 50, -268], [-74, -30, -200], [8, 62, -116]].forEach(function (o) {
    const x0 = o[0], x1 = o[1], y0 = o[2], mx = (x0 + x1) / 2;
    // the roof is part of a band of rock: a fracture runs out from both sides with a stain beneath
    tex += line("M" + (x0 - 70) + " " + (y0 + 8) + " Q" + (x0 - 30) + " " + (y0 + 2) + " " + x0 + " " + (y0 + 1) + " M" + x1 + " " + (y0 - 1) + " Q" + (x1 + 30) + " " + (y0 + 2) + " " + (x1 + 70) + " " + (y0 - 4), "#3a352d", 2.2, ' opacity="0.7"');
    tex += line("M" + (x0 - 70) + " " + (y0 + 6) + " Q" + (x0 - 30) + " " + y0 + " " + x0 + " " + (y0 - 1) + " M" + x1 + " " + (y0 - 3) + " Q" + (x1 + 30) + " " + y0 + " " + (x1 + 70) + " " + (y0 - 6), "#b3aa99", 1.2, ' opacity="0.6"');
    tex += shape("M" + (x0 + 8) + " " + (y0 + 12) + " L" + (x1 - 8) + " " + (y0 + 8) + " L" + (x1 - 14) + " " + (y0 + 60) + " L" + (x0 + 14) + " " + (y0 + 64) + " Z", "#4f4a41", ' opacity="0.22"');
    tex += shape("M" + x0 + " " + y0 + " Q" + mx + " " + (y0 - 6) + " " + x1 + " " + (y0 - 2) + " Q" + (x1 - 6) + " " + (y0 + 10) + " " + (mx + 4) + " " + (y0 + 22) + " Q" + (x0 + 10) + " " + (y0 + 14) + " " + x0 + " " + y0 + " Z", "#2a2620", ' opacity="0.6"');
    tex += shape("M" + x0 + " " + y0 + " Q" + mx + " " + (y0 - 6) + " " + x1 + " " + (y0 - 2) + " Q" + mx + " " + (y0 - 1) + " " + (x0 + 6) + " " + (y0 + 3) + " Z", "#a59c8c");
    tex += shape("M" + (x0 + 6) + " " + (y0 - 1.5) + " Q" + mx + " " + (y0 - 7) + " " + (x1 - 6) + " " + (y0 - 3.5) + " Q" + mx + " " + (y0 - 4) + " " + (x0 + 6) + " " + (y0 + 0.5) + " Z", SNOW, ' opacity="0.85"');
  });
  // snow caught in cracks
  for (let s2 = 0; s2 < 9; s2++) {
    const sx = -70 + r() * 140, sy = -290 + r() * 280;
    tex += line("M" + sx.toFixed(0) + " " + sy.toFixed(0) + " l" + ((r() - 0.5) * 4).toFixed(1) + " " + (10 + r() * 14).toFixed(0), SNOW, 1.6, ' opacity="0.75"');
  }
  g += '<g mask="url(#cliff-fade)" opacity="0.6">' + tex + "</g>";
  // anchor bolts at the hanging belay
  g += '<circle cx="-16" cy="-176" r="1.6" fill="' + STEEL + '"/><circle cx="-8" cy="-177" r="1.6" fill="' + STEEL + '"/>' + line("M-16 -176 L-12 -170 L-8 -177", "#a9b0ae", 1);
  [[-6, -192], [0, -206], [4, -220], [8, -234], [14, -248]].forEach(function (q) { g += quickdraw(q[0], q[1]); });
  [[-20, -150], [-26, -124], [-30, -98]].forEach(function (q) { g += quickdraw(q[0], q[1]); });
  // ropes: belay up to the leader, belay down to the follower, and a loose tail swinging over the drop
  g += '<path d="M-12 -168 L-6 -186 L0 -200 L4 -214 L8 -228 Q12 -240 14 -242" fill="none" stroke="' + ROPE + '" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>';
  g += '<path d="M-13 -166 Q-18 -156 -20 -146 L-26 -120 L-30 -94 Q-32 -84 -33 -78" fill="none" stroke="' + ROPE + '" stroke-width="1.4" stroke-linecap="round"/>';
  g += '<path fill="none" stroke="' + ROPE + '" stroke-width="1.3" stroke-linecap="round" d="M-11 -166 Q4 -120 -2 -70 Q-6 -40 4 -10">' +
    '<animate attributeName="d" dur="4.5s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.45 0 0.55 1;0.45 0 0.55 1" values="M-11 -166 Q4 -120 -2 -70 Q-6 -40 4 -10;M-11 -166 Q10 -118 6 -68 Q2 -36 14 -8;M-11 -166 Q4 -120 -2 -70 Q-6 -40 4 -10"/></path>';
  // climbers: leader pulling the roof, belayer hanging from the bolts, follower far below
  g += climber(14, -228, ROOF, "#e0b04a", "lead", 5, 0, 8);
  g += climber(-12, -150, PINE, "#d6ccb5", "hang", 7, 1.5, 18);
  g += climber(-33, -56, "#5d7891", "#b5653b", "follow", 6, 3, -4);
  // the leader knocks loose small pebbles now and then
  for (let pb = 0; pb < 3; pb++) {
    const px = 10 + pb * 3, bgn = "-" + (pb * 1.3).toFixed(1) + "s";
    g += '<circle cx="' + px + '" cy="-238" r="' + (1.4 - pb * 0.3).toFixed(1) + '" fill="#4f4a41" opacity="0">' +
      '<animate attributeName="cy" values="-262;-262;-60" keyTimes="0;0.55;1" dur="4.2s" begin="' + bgn + '" repeatCount="indefinite" calcMode="spline" keySplines="0 0 1 1;0.5 0 1 1"/>' +
      '<animate attributeName="cx" values="' + px + ";" + px + ";" + (px + 14) + '" keyTimes="0;0.55;1" dur="4.2s" begin="' + bgn + '" repeatCount="indefinite"/>' +
      '<animate attributeName="opacity" values="0;0;1;0" keyTimes="0;0.55;0.6;1" dur="4.2s" begin="' + bgn + '" repeatCount="indefinite"/></circle>';
  }
  return { svg: g, top: -276, w: 60 };
}
