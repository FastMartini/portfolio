// Rebuild the lightweight text/face markup from the supplied v2 artwork.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import * as print from "./splash/print.mjs";
const H0 = { wide: 350, tall: 625 };
// Read only the canonical display name/order fields; never bundle runtime metadata.
const wp = [...readFileSync(new URL("../content/waypoints.ts", import.meta.url), "utf8").matchAll(/name:\s*"([^"]+)",\s*slug:\s*"[^"]+",\s*order:\s*(\d+)/g)].map(([, name, order]) => [Number(order), name]);
if (wp.length !== 6) throw new Error("Expected six canonical Waypoint names");
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
  "lg-h": SANS + "fill:#173f35", "lg-n": SANS + "fill:#b5653b", "cv-kicker": SANS + "fill:#173f35", "cv-foot": SANS + "fill:#4a524b",
  "cv-title": SERIF + "fill:#173f35;font-style:italic", "cv-ridge": "fill:none;stroke:#173f35;stroke-width:2.4;stroke-linejoin:round",
  thin: "stroke-width:1.2;opacity:.6", "cv-route": "fill:none;stroke:#b5653b;stroke-width:2.2;stroke-dasharray:2 6;stroke-linecap:round",
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
const SPRITES = [["print-wide", 1000, 700, 1.8], ["print-tall", 1000, 1250, 1.1], ["cover-wide", 500, 350, 1.8], ["cover-tall", 500, 625, 1.3]];
for (const v of ["wide", "tall"]) for (const k of ["lg-lt", "lg-lb", "lg-rt", "lg-rb"]) SPRITES.push([`${k}-${v}`, 250, H0[v], v === "wide" ? 1.8 : 1.2]);

mkdirSync(new URL("../.next/splash-art/", import.meta.url), { recursive: true });
writeFileSync(new URL("../.next/splash-art/sprites.html", import.meta.url), `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:transparent}svg{display:block}</style><svg width="0" height="0" style="position:absolute"><defs>${shapeDefs}</defs></svg>${SPRITES.map(([id,w,h,k]) => `<svg id="sprite-${id}" width="${Math.round(w*k)}" height="${Math.round(h*k)}" viewBox="0 0 ${w} ${h}"><use href="#${id}"/></svg>`).join("")}`);
// One face: lossless print, live lettering, and hairline hinge rules.
const H = H0;
function slice(id, x, w, row, own) {
  return ["wide", "tall"].map((v) => {
    const width = own ? (id === "cover" ? 500 : 250) : 1000;
    const height = own ? H[v] : H[v] * 2;
    return `<svg class="splash-print splash-print--${v}" data-map-art="${id}-${v}" viewBox="${x} ${own ? 0 : row * H[v]} ${w} ${H[v]}" preserveAspectRatio="none" aria-hidden="true" focusable="false"><image href="__SPLASH_ASSETS__/print/${id}-${v}.png" width="${width}" height="${height}" preserveAspectRatio="none"/><use href="#${id}-${v}"/></svg>`;
  }).join("");
}
function rowMarkup(row) {
  const name = row === 0 ? "top" : "bottom";
  const crease = '<i class="splash-crease splash-crease--row"></i><i class="splash-crease splash-crease--hinge"></i>';
  const lg = row === 0 ? ["lg-lt", "lg-rt"] : ["lg-lb", "lg-rb"];
  return `          <div class="splash-row splash-row--${name}">
            <div class="splash-pane"><div class="splash-face splash-face--front">${slice("print", 250, 500, row)}${crease}</div>${row === 0 ? `<div class="splash-face splash-face--back">${slice("cover", 0, 500, 0, true)}</div>` : ""}</div>
            <div class="splash-door splash-door--l"><div class="splash-face splash-face--front">${slice("print", 0, 250, row)}${crease}</div><div class="splash-face splash-face--back">${slice(lg[0], 0, 250, 0, true)}</div></div>
            <div class="splash-door splash-door--r"><div class="splash-face splash-face--front">${slice("print", 750, 250, row)}${crease}</div><div class="splash-face splash-face--back">${slice(lg[1], 0, 250, 0, true)}</div></div>
          </div>`;
}


const generated = { defs: textDefs, rows: rowMarkup(0) + rowMarkup(1) };
writeFileSync(new URL("../components/splash/map/print.generated.ts", import.meta.url), "// Generated by scripts/generate-splash-art.mjs. Do not edit.\nexport const mapArt = " + JSON.stringify(generated, null, 2) + " as const;\n");
