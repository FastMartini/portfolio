// Rebuild lossless, transparent print sprites with Chromium's SVG renderer.
// PNG avoids WebP chroma bleeding from green print into the unprinted paper.
// No font rasterisation, Python environment, or extra image dependency required.
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import "./generate-splash-art.mjs";

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 2000, height: 2000 } });
  await page.goto(new URL("../.next/splash-art/sprites.html", import.meta.url).href);
  const directory = new URL("../public/splash/print/", import.meta.url);
  mkdirSync(directory, { recursive: true });
  for (const sprite of await page.locator('svg[id^="sprite-"]').all()) {
    const id = (await sprite.getAttribute("id")).slice(7);
    const png = await sprite.screenshot({ omitBackground: true });
    writeFileSync(fileURLToPath(new URL(`${id}.png`, directory)), png);
  }
} finally { await browser.close(); }
