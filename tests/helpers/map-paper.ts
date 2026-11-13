import { expect } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

/** Check painted paper, not only panel geometry: a culled 3D face still has a box. */
export async function expectOpaqueMap(page: Page, map: Locator) {
  const box = (await map.boundingBox())!;
  const screenshot = await page.screenshot();
  const panels = await page.evaluate(async ({ data, box }) => {
    const image = new Image(); image.src = `data:image/png;base64,${data}`; await image.decode();
    const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height;
    const ctx = canvas.getContext("2d")!; ctx.drawImage(image, 0, 0);
    const scale = image.width / innerWidth;
    const xs = [0, 0.25, 0.75, 1], ratios = [];
    for (let row = 0; row < 2; row++) for (let col = 0; col < 3; col++) {
      let dark = 0, total = 0;
      // Inset each panel to exclude its shadow, seams and antialiased edges.
      for (let y = 0.15; y < 0.85; y += 0.025) for (let x = 0.15; x < 0.85; x += 0.025) {
        const px = (box.x + box.width * (xs[col] + (xs[col + 1] - xs[col]) * x)) * scale;
        const py = (box.y + box.height * (row + y) / 2) * scale;
        const pixel = ctx.getImageData(px, py, 1, 1).data;
        if (pixel[0] < 150 || pixel[1] < 140) dark++;
        total++;
      }
      ratios.push(dark / total);
    }
    return ratios;
  }, { data: screenshot.toString("base64"), box });
  panels.forEach((ratio, index) => expect(ratio, `paper panel ${index} must not expose the green floor or a reverse face`).toBeLessThan(0.05));
}
