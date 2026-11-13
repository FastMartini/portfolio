import * as print from "./print.mjs";

export function artwork(wp) {

const legends = { wide: print.legend("wide", wp), tall: print.legend("tall", wp) };
const rawDefs = ["wide", "tall"].map((v) => print.insidePrint(v) + print.cover(v) + Object.values(legends[v]).join("")).join("");

// <use> clones don't match the page's descendant selectors, so the print's
// classes are resolved to inline styles here.
const SERIF = "font-family:var(--font-newsreader),Georgia,serif;";
const SANS = "font-family:var(--font-manrope),sans-serif;font-weight:700;letter-spacing:.14em;";
const STYLE = {
  c: "fill:none;stroke:rgba(23,63,53,.24);stroke-width:1", ci: "fill:none;stroke:rgba(23,63,53,.42);stroke-width:1.6",
  water: "fill:#dfe5d6;stroke:rgba(23,63,53,.25)", "water-label": SERIF + "fill:#5c776c;font-style:italic",
  "route-halo": "fill:none;stroke:#fffbed;stroke-width:7;stroke-linecap:round",
  route: "fill:none;stroke:#b5653b;stroke-width:2.6;stroke-dasharray:2 7;stroke-linecap:round",
  stop: "fill:#fffbed;stroke:#b5653b;stroke-width:2", stopn: SANS + "fill:#8b4428;font-weight:800;letter-spacing:0",
  peak: "fill:#b5653b", neat: "fill:none;stroke:rgba(23,63,53,.55);stroke-width:1.2", tick: "fill:none;stroke:rgba(23,63,53,.5);stroke-width:1",
  place: SERIF + "fill:#173f35;font-style:italic", compass: "fill:rgba(23,63,53,.35);stroke:rgba(23,63,53,.5);stroke-width:1",
  needle: "fill:#b5653b;stroke:none", titleblock: SANS + "fill:#173f35", scale: "fill:none;stroke:#173f35;stroke-width:1.2",
  "tb-title": "font-weight:800", "tb-sub": "fill:#4a524b", "lg-t": SERIF + "fill:#1f2621", "lg-i": SERIF + "fill:#173f35;font-style:italic",
  "lg-h": SANS + "fill:#173f35", "lg-n": SANS + "fill:#b5653b", "cv-kicker": SANS + "fill:#1f2621", "cv-foot": SANS + "fill:#4a524b",
  "cv-title": SERIF + "fill:#173f35;font-style:italic", "cv-ridge": "fill:none;stroke:#173f35;stroke-width:2.4;stroke-linejoin:round",
  thin: "stroke-width:1.2;opacity:.6", "cv-route": "fill:none;stroke:#b5653b;stroke-width:2.2;stroke-dasharray:2 6;stroke-linecap:round",
  "cv-fold": "fill:none;stroke:#68583e;stroke-width:1.7;opacity:.22",
  "cv-fold-light": "fill:none;stroke:#fffbed;stroke-width:1.5;opacity:.8",
  contours: "", "cv-art": "",
};
const defs = rawDefs.replace(/ class="([^"]+)"/g, (_, names) => {
  const css = names.split(/\s+/).map((n) => { if (!(n in STYLE)) throw new Error("no style for " + n); return STYLE[n]; }).filter(Boolean).join(";");
  return css ? ` style="${css}"` : "";
}).replace(/<text /g, `<text style="${SERIF}fill:#173f35" `).replace(/<text style="([^"]*)" ([^>]*?) style="([^"]*)"/g, '<text $2 style="$1;$3"');

// Shapes are rasterised once (raster.py); faces keep only the lettering as live SVG.
const textDefs = defs
  .replace(/<clipPath[\s\S]*?<\/clipPath>/g, "")
  .replace(/ clip-path="[^"]*"/g, "")
  .replace(/<(path|circle|ellipse|rect)\b[^>]*\/>/g, "");
const shapeDefs = defs.replace(/<text\b[\s\S]*?<\/text>/g, "");

return { textDefs, shapeDefs };
}
