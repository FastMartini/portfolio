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

export async function expectSolidPaperSeams(page: Page, map: Locator) {
  const box = (await map.boundingBox())!;
  // Remove printed green ink, leaving only paper, creases and grain. Any green
  // inside the open sheet now comes from the scenery through a panel gap.
  const style = await page.addStyleTag({ content: ".splash-face :is(image,use),.splash-pane-greeting { visibility:hidden!important; }" });
  const screenshot = await page.screenshot();
  await style.evaluate((el) => el.parentNode?.removeChild(el));
  const count = await page.evaluate(async ({ data, box }) => {
    const image = new Image(); image.src = `data:image/png;base64,${data}`; await image.decode();
    const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height;
    const ctx = canvas.getContext("2d")!; ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const scale = canvas.width / innerWidth;
    let green = 0;
    for (let y = Math.max(0, Math.ceil((box.y + 2) * scale)); y < Math.min(canvas.height, Math.floor((box.y + box.height - 2) * scale)); y++) {
      for (let x = Math.max(0, Math.ceil((box.x + 2) * scale)); x < Math.min(canvas.width, Math.floor((box.x + box.width - 2) * scale)); x++) {
        const i = (y * canvas.width + x) * 4;
        if (pixels[i + 1] > pixels[i] + 5) green++;
      }
    }
    return green;
  }, { data: screenshot.toString("base64"), box });
  expect(count, "green backdrop bleeding between the open paper panels").toBeLessThanOrEqual(2);
}

/** Compare decoration against the visible paper silhouette, with its table shadow retained. */
export async function expectNoMapBleed(page: Page, map: Locator) {
  const box = (await map.boundingBox())!;
  const actual = await page.screenshot();
  const maskStyle = await page.addStyleTag({ content: `
    .splash-face { background:#ff00ff!important; box-shadow:none!important; }
    .splash-face::before,.splash-face :is(image,use,.splash-shade,.splash-crease,.splash-cast,.splash-sheen),
    .splash-pane-cover,.splash-pane-greeting,.splash-cast,.splash-sheen,.splash-underlay { visibility:hidden!important; }
    .splash-paper { fill:#ff00ff!important; }
    .splash-table { background:#000!important; }
    .splash-table::after,.splash-shadow { visibility:hidden!important; }
  ` });
  const mask = await page.screenshot();
  await maskStyle.evaluate((el) => el.parentNode?.removeChild(el));
  const emptyStyle = await page.addStyleTag({ content: ".splash-map { opacity:0!important; }" });
  const empty = await page.screenshot();
  await emptyStyle.evaluate((el) => el.parentNode?.removeChild(el));
  const bleed = await page.evaluate(async ({ actual, mask, empty, box }) => {
    const images = await Promise.all([actual, mask, empty].map(async (data) => {
      const image = new Image(); image.src = `data:image/png;base64,${data}`; await image.decode();
      const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height;
      const ctx = canvas.getContext("2d")!; ctx.drawImage(image, 0, 0);
      return ctx.getImageData(0, 0, image.width, image.height);
    }));
    const [a, m, e] = images, scale = a.width / innerWidth;
    const paper = (x: number, y: number) => {
      if (x < 0 || y < 0 || x >= m.width || y >= m.height) return false;
      const i = (y * m.width + x) * 4;
      return m.data[i] > 200 && m.data[i + 1] < 30 && m.data[i + 2] > 200;
    };
    let count = 0, samples = 0;
    const top = Math.max(0, Math.floor((box.y - 20) * scale));
    const left = Math.max(0, Math.floor((box.x - 20) * scale));
    const bottom = Math.min(a.height, Math.ceil((box.y + box.height + 20) * scale));
    const right = Math.min(a.width, Math.ceil((box.x + box.width + 20) * scale));
    for (let y = top; y < bottom; y += 2) for (let x = left; x < right; x += 2) {
      if ([-3, 0, 3].some((dy) => [-3, 0, 3].some((dx) => paper(x + dx, y + dy)))) continue;
      const i = (y * a.width + x) * 4;
      if ([0, 1, 2].some((c) => Math.abs(a.data[i + c] - e.data[i + c]) > 35)) count++;
      samples++;
    }
    return { count, samples };
  }, { actual: actual.toString("base64"), mask: mask.toString("base64"), empty: empty.toString("base64"), box });
  expect(bleed.count, "map fill or decoration outside the visible paper outline").toBeLessThanOrEqual(Math.max(20, bleed.samples * 0.0001));
}
