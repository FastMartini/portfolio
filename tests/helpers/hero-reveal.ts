import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

// Exercise the shared visual contract through each real entry controller.
export async function expectGreetingGlide(page: Page, seek: (time: number) => Promise<void>) {
  const heading = page.locator("#trailhead-title");
  const portrait = page.locator("#trailhead .trailhead-portrait");
  const viewport = page.viewportSize()!;
  await heading.evaluate((el) => Reflect.set(window, "greetingNode", el));
  const layout = () => page.locator("#trailhead").evaluate((el) => {
    const photo = el.querySelector(".trailhead-portrait") as HTMLElement;
    const actions = el.querySelector(".trailhead-actions") as HTMLElement;
    return [el.clientHeight, photo.offsetTop, photo.offsetHeight, actions.offsetTop];
  });
  await seek(450);
  const reserved = await layout();
  const center = (await heading.boundingBox())!;
  const words = await heading.evaluate((el) => {
    const range = document.createRange(); range.selectNodeContents(el);
    return range.getBoundingClientRect().toJSON();
  });
  expect(words.x + words.width / 2).toBeCloseTo(viewport.width / 2, 0);
  expect(words.y + words.height / 2).toBeCloseTo(viewport.height / 2, 0);
  expect(center.x).toBeGreaterThanOrEqual(0);
  expect(words.x + words.width).toBeLessThanOrEqual(viewport.width);
  await expect(heading).toHaveCSS("opacity", "1");
  await expect(portrait).toHaveCSS("opacity", "0");
  await seek(600);
  expect(await heading.boundingBox()).toEqual(center);
  await seek(1050);
  const moving = (await heading.boundingBox())!;
  await expect(heading).toHaveCSS("opacity", "1");
  await expect(page.locator("#trailhead .trailhead-lead")).toHaveCSS("opacity", "0");
  const portraitOpacity = Number(await portrait.evaluate((el) => getComputedStyle(el).opacity));
  if (viewport.width > 900) {
    expect(moving.x).toBeLessThan(center.x);
    expect(portraitOpacity).toBeGreaterThan(0);
    expect(portraitOpacity).toBeLessThan(1);
  } else expect(portraitOpacity).toBe(0);
  await seek(1450);
  const settled = (await heading.boundingBox())!;
  expect(settled.x).toBeLessThanOrEqual(center.x);
  if (viewport.width <= 900) expect(settled.y).toBeLessThan(viewport.height / 2);
  await expect(heading).toHaveCSS("opacity", "1");
  expect(Number(await page.locator("#trailhead .trailhead-lead").evaluate((el) => getComputedStyle(el).opacity))).toBeGreaterThan(0);
  await seek(1790);
  expect(await heading.boundingBox()).toEqual(settled);
  expect(await layout()).toEqual(reserved);
  expect(await heading.evaluate((el) => el === Reflect.get(window, "greetingNode"))).toBe(true);
  const photo = (await portrait.boundingBox())!;
  const copy = (await page.locator(".trailhead-copy").boundingBox())!;
  if (viewport.width <= 900) expect(photo.y).toBeGreaterThanOrEqual(copy.y + copy.height);
  else {
    expect(photo.x).toBeGreaterThan(settled.x + settled.width);
    expect(photo.x + photo.width).toBeCloseTo(viewport.width, 0);
    expect(photo.height).toBeGreaterThan(photo.width);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}
