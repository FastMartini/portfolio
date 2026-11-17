import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import type { SplashElement } from "../../components/splash/controller";

export async function seekIntro(page: Page, time: number, selector = "body > .splash:not(.splash--climb)") {
  const overlay = page.locator(selector);
  await expect.poll(() => overlay.evaluate((el: SplashElement) => {
    if (!el.splashController) return false;
    el.splashController.seek(0);
    return true;
  })).toBe(true);
  await page.evaluate(() => document.fonts.ready);
  await overlay.evaluate((el: SplashElement, time) => el.splashController!.seek(time), time);
}

export async function holdOpening(page: Page) {
  await page.addInitScript(() => {
    const observer = new MutationObserver(() => {
      const overlay = document.querySelector<SplashElement>("body > .splash:not(.splash--climb)");
      if (!overlay?.splashController) return;
      overlay.splashController.seek(0);
      observer.disconnect();
    });
    observer.observe(document, { childList: true, subtree: true, attributes: true });
  });
}

export async function holdNextTransition(page: Page, selector = ".splash--climb") {
  await page.evaluate((selector) => {
    const observer = new MutationObserver(() => {
      const overlay = document.querySelector<SplashElement>(selector);
      if (!overlay?.splashController) return;
      overlay.splashController.seek(0);
      observer.disconnect();
    });
    observer.observe(document.body, { childList: true });
  }, selector);
}

export async function imageDifference(page: Page, before: Buffer, after: Buffer, clip?: { x: number; y: number; width: number; height: number }) {
  return page.evaluate(async ({ before, after, clip }) => {
    const read = async (png: string) => {
      const image = new Image(); image.src = `data:image/png;base64,${png}`; await image.decode();
      const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height;
      const ctx = canvas.getContext("2d")!; ctx.drawImage(image, 0, 0);
      const scale = canvas.width / innerWidth;
      return clip
        ? ctx.getImageData(Math.round(clip.x * scale), Math.round(clip.y * scale), Math.round(clip.width * scale), Math.round(clip.height * scale)).data
        : ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    };
    const a = await read(before), b = await read(after);
    let total = 0, max = 0, changed = 0;
    for (let i = 0; i < a.length; i += 4) {
      let pixel = 0;
      for (let channel = 0; channel < 3; channel++) {
        const delta = Math.abs(a[i + channel] - b[i + channel]);
        total += delta; pixel = Math.max(pixel, delta);
      }
      max = Math.max(max, pixel);
      if (pixel > 8) changed++;
    }
    return { max, mean: total / (a.length / 4 * 3), changedRatio: changed / (a.length / 4) };
  }, { before: before.toString("base64"), after: after.toString("base64"), clip });
}
