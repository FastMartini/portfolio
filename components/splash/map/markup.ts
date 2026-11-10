import { trailheadIntro } from "../../../content/trailhead";
import { printLettering } from "./print.generated";

const base = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/splash`;
const escape = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export const splashStyle = {
  "--grain": `url("${base}/grain.png")`,
  "--print-wide": `url("${base}/print/print-wide.webp")`,
  "--print-tall": `url("${base}/print/print-tall.webp")`,
};

function slice(id: string, x: number, width: number, row: number, own = false) {
  return (["wide", "tall"] as const).map((variant) => {
    const height = variant === "wide" ? 350 : 625;
    return `<svg class="splash-print--${variant}" viewBox="${x} ${own ? 0 : row * height} ${width} ${height}" preserveAspectRatio="none" aria-hidden="true" focusable="false"><use href="#${id}-${variant}"/></svg>`;
  }).join("");
}
const art = (id: string) => `--art:url('${base}/print/${id}-wide.webp');--art-t:url('${base}/print/${id}-tall.webp')`;

function rowMarkup(row: number) {
  const crease = '<i class="splash-crease splash-crease--row"></i><i class="splash-crease splash-crease--hinge"></i><i class="splash-shade"></i>';
  const legends = row === 0 ? ["lg-lt", "lg-rt"] : ["lg-lb", "lg-rb"];
  return `<div class="splash-row splash-row--${row === 0 ? "top" : "bottom"}">
    ${row === 1 ? '<i class="splash-cast splash-cast--top"></i>' : ""}<i class="splash-cast splash-cast--door"></i>
    <div class="splash-pane"><div class="splash-face splash-face--front">${slice("print", 250, 500, row)}${crease}</div>${row === 0 ? `<div class="splash-face splash-face--back" style="${art("cover")}">${slice("cover", 0, 500, 0, true)}<i class="splash-shade"></i></div>` : ""}</div>
    ${["l", "r"].map((side, i) => `<div class="splash-door splash-door--${side}"><div class="splash-face splash-face--front">${slice("print", i === 0 ? 0 : 750, 250, row)}${crease}</div><div class="splash-face splash-face--back" style="${art(legends[i])}">${slice(legends[i], 0, 250, 0, true)}<i class="splash-shade"></i></div></div>`).join("")}
  </div>`;
}

/** Trusted, deterministic artwork. Prefix SVG references for simultaneous overlays. */
export function splashMarkup(namespace: "opening" | "climb") {
  const greeting = trailheadIntro.heading.split(" ").map((word) => `<span class="splash-word">${escape(word)}</span>`).join(" ");
  const markup = `<svg class="splash-defs" aria-hidden="true" focusable="false" width="0" height="0"><defs>${printLettering}</defs></svg>
  <div class="splash-world"><div class="splash-table"></div><div class="splash-camera"><div class="splash-arrival"><div class="splash-rig">
    <i class="splash-probe"></i><i class="splash-shadow splash-shadow--soft"></i><i class="splash-shadow splash-shadow--contact"></i>
    <div class="splash-map">${rowMarkup(0)}${rowMarkup(1)}<div class="splash-sheen"><i></i></div><i class="splash-pane-cover"></i><p class="splash-pane-greeting"></p></div>
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
