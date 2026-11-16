// Reuse the opening map's deterministic contour field without its labels/route.
import { writeFileSync } from "node:fs";
import { insidePrint } from "./splash/print.mjs";
const contours = insidePrint("wide").match(/<g class="contours">([\s\S]*?)<\/g>/)?.[1];
if (!contours) throw new Error("Opening map contours are missing");
const paths = contours.replace(/class="(ci|c)"/g, (_, kind) => `fill="none" stroke="url(#quiet)" stroke-width="${kind === "ci" ? 1.6 : 1}"`);
writeFileSync(new URL("../public/hero-contours.svg", import.meta.url), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 700"><defs><linearGradient id="quiet" gradientUnits="userSpaceOnUse" x1="0" x2="1000" y1="0" y2="0"><stop stop-color="white" stop-opacity=".12"/><stop offset=".6" stop-color="white" stop-opacity=".2"/><stop offset="1" stop-color="white"/></linearGradient></defs>${paths}</svg>\n`);
