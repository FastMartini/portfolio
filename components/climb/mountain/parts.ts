export const WALL = "#d6ccb5", WALL_S = "#b3a891", ROOF = "#93573b", ROOF_S = "#74432e", ROOF_L = "#a8694b", WOOD = "#6a5240", WOOD_D = "#4b3a2c",
    WIN = "#2a2f2b", WARM = "#f0c46f", STEEL = "#545b56", SNOW = "#f1f0ea", SNOW_S = "#d6dadd", PINE = "#2c4b39",
    STW = "#b8a88e", STW_S = "#94846d", STW_H = "#d0c2a7", MORTAR = "#cfc3ab";

// One fixed light sequence per scene build; never shared mutable module state.
export function createParts() {
  function line(d2: string, c: string, w: number, extra = "") { return '<path d="' + d2 + '" fill="none" stroke="' + c + '" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round"' + (extra || "") + "/>"; }
  function shape(d2: string, c: string, extra = "") { return '<path d="' + d2 + '" fill="' + c + '"' + (extra || "") + "/>"; }
  function rect(x: number, y: number, w: number, h: number, c: string, extra = "") { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + c + '"' + (extra || "") + "/>"; }
  function shadow(w: number) { return '<ellipse cx="' + (w * 0.45).toFixed(0) + '" cy="1" rx="' + w + '" ry="' + (w * 0.14).toFixed(0) + '" fill="#1f2621" opacity="0.24" filter="url(#lm-blur)"/>'; }
  let lightSeed = 0;
  function pulseOpacity(lo: number, hi: number, dur: number) {
    lightSeed += 0.77;
    return '<animate attributeName="opacity" values="' + lo + ";" + hi + ";" + ((lo + hi) / 2).toFixed(2) + ";" + hi + ";" + lo + '" dur="' + dur + 's" begin="-' + (lightSeed % dur).toFixed(2) + 's" repeatCount="indefinite"/>';
  }
  // A lit window: warm pane that slowly brightens and dims, soft glow, wooden frame, mullions and sill
  function warmWin(x: number, y: number, w: number, h: number, shutters: boolean) {
    const cx = x + w / 2, cy = y + h / 2;
    let out = "";
    out += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (Math.max(w, h) * 0.85).toFixed(1) + '" fill="' + WARM + '" opacity="0.12" filter="url(#lm-glow)">' + pulseOpacity(0.04, 0.22, 3.8) + "</circle>";
    if (shutters) out += rect(x - 6, y - 1, 5, h + 2, WOOD) + rect(x + w + 1, y - 1, 5, h + 2, WOOD);
    out += rect(x - 1.5, y - 1.5, w + 3, h + 3, WOOD_D);
    out += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + WARM + '">' + pulseOpacity(0.62, 1, 3.8) + "</rect>";
    out += line("M" + cx + " " + y + " V" + (y + h) + " M" + x + " " + cy + " H" + (x + w), WOOD_D, 1);
    out += rect(x - 3, y + h + 1, w + 6, 2.5, WOOD_D);
    return out;
  }
  // Rising, drifting smoke made of soft puffs that grow and fade
  function smoke(x: number, y: number, scale = 1) {
    let out = '<g filter="url(#lm-smoke)">';
    const n = 6, dur = 7.5, s = scale || 1;
    for (let k = 0; k < n; k++) {
      const b = "-" + (k * dur / n).toFixed(2) + "s";
      out += '<circle cx="' + x + '" cy="' + y + '" r="3" fill="#e6e6e1" opacity="0">' +
        '<animate attributeName="cy" values="' + y + ";" + (y - 46 * s) + ";" + (y - 96 * s) + '" dur="' + dur + 's" begin="' + b + '" repeatCount="indefinite"/>' +
        '<animate attributeName="cx" values="' + x + ";" + (x + 9 * s) + ";" + (x + 30 * s) + '" dur="' + dur + 's" begin="' + b + '" repeatCount="indefinite"/>' +
        '<animate attributeName="r" values="' + (3 * s) + ";" + (9 * s) + ";" + (17 * s) + '" dur="' + dur + 's" begin="' + b + '" repeatCount="indefinite"/>' +
        '<animate attributeName="opacity" values="0;0.62;0.32;0" keyTimes="0;0.15;0.6;1" dur="' + dur + 's" begin="' + b + '" repeatCount="indefinite"/>' +
        "</circle>";
    }
    return out + "</g>";
  }
  // Bullwheel with turning spokes
  function bullwheel(cx: number, cy: number, r: number, dir = 1) {
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + STEEL + '" stroke-width="3.2"/>' +
      '<g>' + line("M" + cx + " " + (cy - r) + " V" + (cy + r) + " M" + (cx - r) + " " + cy + " H" + (cx + r) +
        " M" + (cx - r * 0.7) + " " + (cy - r * 0.7) + " L" + (cx + r * 0.7) + " " + (cy + r * 0.7) +
        " M" + (cx + r * 0.7) + " " + (cy - r * 0.7) + " L" + (cx - r * 0.7) + " " + (cy + r * 0.7), STEEL, 1) +
      '<animateTransform attributeName="transform" type="rotate" from="0 ' + cx + " " + cy + '" to="' + (360 * (dir || 1)) + " " + cx + " " + cy + '" dur="7s" repeatCount="indefinite"/></g>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="3" fill="' + ROOF + '"/>';
  }
  // Two-tone pitched roof with an overhang, shingle courses and a ridge cap
  function roof(x0: number, x1: number, yBase: number, yPeak: number, thick: number) {
    const mx = (x0 + x1) / 2;
    let out = "";
    out += shape("M" + x0 + " " + yBase + " L" + mx + " " + yPeak + " L" + mx + " " + (yBase + thick) + " L" + x0 + " " + (yBase + thick) + " Z", ROOF);
    out += shape("M" + mx + " " + yPeak + " L" + x1 + " " + yBase + " L" + x1 + " " + (yBase + thick) + " L" + mx + " " + (yBase + thick) + " Z", ROOF_S);
    // shingle courses: horizontal runs from each eave to the ridge
    for (let c2 = 1; c2 <= 3; c2++) {
      const h2 = c2 / 4, yy2 = yBase - (yBase - yPeak) * h2, xl = x0 + (mx - x0) * h2, xr = x1 - (x1 - mx) * h2;
      out += line("M" + (xl + 1) + " " + yy2 + " L" + (mx - 0.5) + " " + yy2, ROOF_L, 1, ' opacity="0.55"');
      out += line("M" + (mx + 0.5) + " " + yy2 + " L" + (xr - 1) + " " + yy2, "#5f3624", 1, ' opacity="0.55"');
    }
    out += line("M" + (mx - 5) + " " + (yPeak + 3) + " L" + mx + " " + (yPeak - 1) + " L" + (mx + 5) + " " + (yPeak + 3), WOOD_D, 2.2);
    return out;
  }
  // Irregular coursed masonry in warm stone
  function masonry(x: number, y: number, w: number, h: number, seed: number) {
    let sd = seed;
    const r = function () { sd = (sd * 16807) % 2147483647; return (sd - 1) / 2147483646; };
    let out = rect(x, y, w, h, MORTAR);
    const rowH = 8;
    for (let yy = y; yy < y + h - 0.5; yy += rowH) {
      let xx = x + ((yy - y) / rowH % 2 ? -4 : 0);
      const hh = Math.min(rowH - 1.5, y + h - yy - 1);
      while (xx < x + w) {
        const bw = 9 + r() * 10, x0 = Math.max(x, xx), x1 = Math.min(x + w, xx + bw - 1.5);
        if (x1 - x0 > 2) {
          const tone = r(); const col = tone < 0.33 ? STW_S : tone < 0.8 ? STW : STW_H;
          out += '<rect x="' + x0.toFixed(1) + '" y="' + (yy + 0.75).toFixed(1) + '" width="' + (x1 - x0).toFixed(1) + '" height="' + hh.toFixed(1) + '" rx="1.5" fill="' + col + '"/>';
        }
        xx += bw;
      }
    }
    return out;
  }
  
  
  return { line, shape, rect, shadow, pulseOpacity, warmWin, smoke, bullwheel, roof, masonry };
}
export type Parts = ReturnType<typeof createParts>;
export type LandmarkArt = { svg: string; top: number; w: number; cable?: readonly [number, number] };
