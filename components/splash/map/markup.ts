import { mapArt } from "./print.generated";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export const splashAssets = `${basePath}/splash`;
const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// The same deterministic paper faces serve both sequences.
// Namespace SVG references so a finishing opening and a new transition cannot
// accidentally use one another's text definitions.
export function mapOverlayMarkup(heading: string, prefix: string) {
  const greeting = heading.split(" ").map((word) => `<span class="splash-word">${escape(word)}</span>`).join(" ");
  return `<svg class="splash-defs" aria-hidden="true" focusable="false" width="0" height="0"><defs>${mapArt.defs}</defs></svg>
<div class="splash-world"><div class="splash-table"></div><div class="splash-camera"><div class="splash-rig">
<i class="splash-probe"></i><i class="splash-shadow splash-shadow--soft"></i><i class="splash-shadow splash-shadow--contact"></i>
<div class="splash-map">${mapArt.rows}<i class="splash-pane-cover"></i><p class="splash-pane-greeting"></p></div>
</div></div></div><p class="splash-greeting splash-greeting--page">${greeting}</p><div class="splash-paper-stage"><div class="splash-sheet"></div><p class="splash-greeting splash-greeting--paper">${greeting}</p></div>`
    .replaceAll("__SPLASH_ASSETS__", splashAssets)
    .replace(/id="([^"]+)"/g, `id="${prefix}-$1"`)
    .replace(/href="#([^"]+)"/g, `href="#${prefix}-$1"`)
    .replace(/url\(#([^)]+)\)/g, `url(#${prefix}-$1)`);
}

export const mapAssetStyles = {
  "--grain": `url("${splashAssets}/grain.png")`,
  "--print-wide": `url("${splashAssets}/print/print-wide.png")`,
  "--print-tall": `url("${splashAssets}/print/print-tall.png")`,
};
