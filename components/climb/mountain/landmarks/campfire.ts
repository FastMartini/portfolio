import { WARM, WOOD, WOOD_D, STW_S, STW } from "../parts";
import type { Parts } from "../parts";

export function campfire(parts: Parts) {
  const { line, pulseOpacity, smoke } = parts;
  let o = "";
  o += '<ellipse cx="0" cy="0" rx="46" ry="9" fill="' + WARM + '" opacity="0.25" filter="url(#lm-glow)">' + pulseOpacity(0.12, 0.34, 1.7) + "</ellipse>";
  // log seats
  o += '<rect x="-46" y="-7" width="22" height="7" rx="3.5" fill="' + WOOD + '"/><circle cx="-24.5" cy="-3.5" r="3.5" fill="#a07b55"/>';
  o += '<rect x="26" y="-6" width="20" height="7" rx="3.5" fill="' + WOOD_D + '"/><circle cx="26.5" cy="-2.5" r="3.5" fill="#8f6c4a"/>';
  // ring of stones
  [[-15, -1], [-10, 2], [-3, 3], [4, 3], [11, 2], [15, -1], [12, -4], [-12, -4]].forEach(function (st, k) {
    o += '<ellipse cx="' + st[0] + '" cy="' + st[1] + '" rx="3.6" ry="2.4" fill="' + (k % 2 ? STW_S : STW) + '"/>';
  });
  // crossed logs
  o += line("M-11 0 L8 -7", WOOD_D, 3.4) + line("M11 0 L-8 -7", WOOD, 3.4);
  // flames
  const fl1 = ["M-9 -2 C-11 -12 -4 -16 -2 -26 C2 -18 10 -14 9 -2 Z", "M-9 -2 C-12 -10 -6 -18 1 -27 C3 -17 11 -12 9 -2 Z", "M-9 -2 C-10 -13 -2 -15 -4 -24 C3 -19 9 -12 9 -2 Z"];
  const fl2 = ["M-6 -2 C-7 -9 -2 -12 0 -19 C3 -12 7 -9 6 -2 Z", "M-6 -2 C-8 -8 -1 -14 2 -20 C3 -12 8 -8 6 -2 Z", "M-6 -2 C-6 -10 -3 -11 -2 -18 C4 -13 6 -8 6 -2 Z"];
  const fl3 = ["M-3 -2 C-4 -6 -1 -8 0 -12 C2 -8 4 -6 3 -2 Z", "M-3 -2 C-4 -5 0 -9 1 -13 C2 -8 4 -5 3 -2 Z", "M-3 -2 C-3 -7 -1 -7 -1 -11 C2 -8 3 -6 3 -2 Z"];
  ([[fl1, "#d9762f", "0.9s"], [fl2, "#f0a93e", "0.7s"], [fl3, "#fde3a0", "0.55s"]] satisfies [string[], string, string][]).forEach(function (f) {
    o += '<path d="' + f[0][0] + '" fill="' + f[1] + '"><animate attributeName="d" dur="' + f[2] + '" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.33;0.66;1" keySplines="0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1" values="' + f[0].concat([f[0][0]]).join(";") + '"/></path>';
  });
  // sparks drifting up
  for (let sk2 = 0; sk2 < 4; sk2++) {
    const bg = "-" + (sk2 * 0.6).toFixed(1) + "s", sx2 = -3 + sk2 * 2;
    o += '<circle cx="' + sx2 + '" cy="-14" r="0.9" fill="#fde3a0" opacity="0">' +
      '<animate attributeName="cy" values="-14;-48" dur="2.4s" begin="' + bg + '" repeatCount="indefinite"/>' +
      '<animate attributeName="cx" values="' + sx2 + ";" + (sx2 + 4) + ";" + (sx2 - 2) + '" dur="2.4s" begin="' + bg + '" repeatCount="indefinite"/>' +
      '<animate attributeName="opacity" values="0;1;0" dur="2.4s" begin="' + bg + '" repeatCount="indefinite"/></circle>';
  }
  o += smoke(0, -30, 0.6);
  return o;
}
