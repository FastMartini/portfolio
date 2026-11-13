import { trailheadIntro } from "../../../content/trailhead";
import { printLettering } from "./print.generated";
import themeTokens from "../../theme/tokens.json";

const base = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/splash`;
const escape = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export const splashStyle = {
  "--grain": `url("${base}/grain.png")`,
  // Fixed paper reference, independent of the visitor's selected theme.
  "--paper": themeTokens.surface.header[1],
  "--paper-back": themeTokens.surface.header[1],
};

function slice(id: string, x: number, width: number, row: number, own = false) {
  return (["wide", "tall"] as const).map((variant) => {
    const height = variant === "wide" ? 350 : 625;
    const y = own ? 0 : row * height;
    // Paper, shapes and lettering share one SVG viewport. A separately painted
    // CSS background can disappear beneath nested 3D print layers.
    return `<svg class="splash-print--${variant}" viewBox="${x} ${y} ${width} ${height}" preserveAspectRatio="none" aria-hidden="true" focusable="false"><rect class="splash-paper" x="${x}" y="${y}" width="${width}" height="${height}" fill="var(--paper)"/><image href="${base}/print/${id}-${variant}.webp" x="0" y="0" width="${own ? width : 1000}" height="${own ? height : height * 2}" preserveAspectRatio="none"/><use href="#${id}-${variant}"/></svg>`;
  }).join("");
}

function rowMarkup(row: number) {
  const crease = '<i class="splash-crease splash-crease--row"></i><i class="splash-crease splash-crease--hinge"></i><i class="splash-shade"></i>';
  const legends = row === 0 ? ["lg-lt", "lg-rt"] : ["lg-lb", "lg-rb"];
  const sheen = '<div class="splash-sheen"><i></i></div>';
  const casts = `${row === 1 ? '<i class="splash-cast splash-cast--top"></i>' : ""}<i class="splash-cast splash-cast--door"></i>`;
  return `<div class="splash-row splash-row--${row === 0 ? "top" : "bottom"}">
    <div class="splash-pane"><div class="splash-face splash-face--front">${slice("print", 250, 500, row)}${casts}${crease}${sheen}</div>${row === 0 ? `<div class="splash-face splash-face--back">${slice("cover", 0, 500, 0, true)}<i class="splash-shade"></i></div>` : ""}</div>
    ${["l", "r"].map((side, i) => `<div class="splash-door splash-door--${side}"><div class="splash-face splash-face--front">${slice("print", i === 0 ? 0 : 750, 250, row)}${crease}${sheen}</div><div class="splash-face splash-face--back">${slice(legends[i], 0, 250, 0, true)}<i class="splash-shade"></i></div></div>`).join("")}
  </div>`;
}

/** Trusted, deterministic artwork. Prefix SVG references for simultaneous overlays. */
export function splashMarkup(namespace: "opening" | "climb") {
  const greeting = trailheadIntro.heading.split(" ").map((word) => `<span class="splash-word">${escape(word)}</span>`).join(" ");
  const markup = `<svg class="splash-defs" aria-hidden="true" focusable="false" width="0" height="0"><defs>${printLettering}</defs></svg>
  <div class="splash-world"><div class="splash-table"></div><div class="splash-camera"><div class="splash-arrival"><div class="splash-rig">
    <i class="splash-probe"></i><i class="splash-shadow splash-shadow--soft"></i><i class="splash-shadow splash-shadow--contact"></i>
    <div class="splash-map"><svg class="splash-underlay" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true" focusable="false"><rect class="splash-paper" width="1" height="1" fill="var(--paper)"/></svg>${rowMarkup(1)}${rowMarkup(0)}<i class="splash-pane-cover"></i><p class="splash-pane-greeting"></p></div>
  </div></div></div></div>
  <p class="splash-greeting splash-greeting--page">${escape(trailheadIntro.heading)}</p>
  <div class="splash-sheet"><p class="splash-greeting splash-greeting--paper">${greeting}</p></div>`;
  return markup.replace(/\bid="([^"]+)"/g, `id="${namespace}-$1"`)
    .replace(/href="#([^"]+)"/g, `href="#${namespace}-$1"`)
    .replace(/url\(#([^)]+)\)/g, `url(#${namespace}-$1)`);
}

export function createMapOverlay() {
  const element = document.createElement("div");
  element.className = "splash";
  element.setAttribute("aria-hidden", "true");
  Object.entries(splashStyle).forEach(([name, value]) => element.style.setProperty(name, value));
  element.innerHTML = splashMarkup("climb");
  return element;
}
