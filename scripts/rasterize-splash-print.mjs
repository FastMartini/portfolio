import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { artwork } from "./splash/artwork.mjs";
import { legendContent } from "./splash/content.mjs";

// Shapes only: browser font substitution cannot change these committed WebPs.
const { shapeDefs } = artwork(await legendContent());
const sprites = [["print-wide", 1000, 700, 1.8], ["print-tall", 1000, 1250, 1.1],
  ["cover-wide", 500, 350, 1.8], ["cover-tall", 500, 625, 1.3]];
for (const variant of ["wide", "tall"]) for (const face of ["lg-lt", "lg-lb", "lg-rt", "lg-rb"])
  sprites.push([`${face}-${variant}`, 250, variant === "wide" ? 350 : 625, variant === "wide" ? 1.8 : 1.2]);
const destination = new URL("../public/splash/print/", import.meta.url);
await mkdir(destination, { recursive: true });
// A cover-only color/crease edit must not re-encode the unchanged map sprites.
const coversOnly = process.argv.includes("--covers-only");
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  for (const [id, width, height, scale] of sprites) {
    if (coversOnly && !id.startsWith("cover-")) continue;
    const data = await page.evaluate(async ({ id, width, height, scale, shapeDefs }) => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(width * scale)}" height="${Math.round(height * scale)}" viewBox="0 0 ${width} ${height}"><defs>${shapeDefs}</defs><use href="#${id}"/></svg>`;
      const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
      try {
        const image = new Image(); image.src = url; await image.decode();
        const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height;
        canvas.getContext("2d").drawImage(image, 0, 0);
        return canvas.toDataURL("image/webp", 0.86).split(",")[1];
      } finally { URL.revokeObjectURL(url); }
    }, { id, width, height, scale, shapeDefs });
    await writeFile(new URL(`${id}.webp`, destination), Buffer.from(data, "base64"));
  }
} finally { await browser.close(); }
