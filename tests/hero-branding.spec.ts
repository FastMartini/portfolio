import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { OPEN } from "../components/splash/controller";
import { seekIntro } from "./helpers/splash";

async function probeAudio(page: Page) {
  await page.addInitScript(() => {
    Reflect.set(window, "guitarNotes", 0);
    Reflect.set(window, "guitarContexts", []);
    const Native = window.AudioContext;
    window.AudioContext = class extends Native {
      constructor(options?: AudioContextOptions) {
        super(options); Reflect.get(window, "guitarContexts").push(this);
      }
    };
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args) {
      Reflect.set(window, "guitarNotes", Reflect.get(window, "guitarNotes") + 1);
      return Reflect.apply(start, this, args);
    };
  });
}

// Sample a visible contour in open paper, clear of the copy and action row.
async function contourPoint(page: Page) {
  return page.locator(".hero-strings").evaluate(canvas => {
    const c = canvas as HTMLCanvasElement, box = c.getBoundingClientRect();
    const data = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
    const sx = c.width / box.width, sy = c.height / box.height;
    for (let y = 620; y < 800; y += 2) for (let x = box.width - 150; x < box.width - 20; x++) {
      if (data[(Math.floor(y * sy) * c.width + Math.floor(x * sx)) * 4 + 3] > 5) return { x: x + box.left, y: y + box.top };
    }
    throw new Error("No contour found in the interaction area");
  });
}

for (const width of [1440, 390]) {
  test(`Branding iron is the default and finishes on paper at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("./");
    await seekIntro(page, OPEN.greeting + 119);
    const paper = page.locator(".splash-greeting--paper");
    const first = paper.locator(".trailhead-title-line").first().locator(".hero-reveal-letter").first();
    const second = paper.locator(".trailhead-title-line").nth(1).locator(".hero-reveal-letter").first();
    await expect(first).toHaveCSS("opacity", "0");
    await seekIntro(page, OPEN.greeting + 200);
    await expect(first).toHaveCSS("opacity", "1");
    await expect(second).toHaveCSS("opacity", "0");
    await seekIntro(page, OPEN.greeting + 1000);
    await expect(second).toHaveCSS("opacity", "1");
    await expect(paper.locator(".hero-brand-spark")).toHaveCount(68);
    await seekIntro(page, OPEN.handoff[0]);
    expect(await paper.locator(".hero-brand-heat, .hero-brand-scorch, .hero-brand-spark, .hero-brand-smoke").evaluateAll(elements => elements.every(el => Number(getComputedStyle(el).opacity) < 0.001))).toBe(true);
    await expect(page.locator(".hero-strings")).toHaveCount(0);
    await expect(page.locator("#trailhead-title")).not.toHaveCSS("text-shadow", "none");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.locator("[data-hero-reveal-controls]")).toHaveCount(0);
  });

  test(`contours vibrate silently and only clicks or taps play at ${width}px`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, hasTouch: true, viewport: { width, height: 900 } });
    const page = await context.newPage();
    await probeAudio(page);
    await page.goto("./?variant=letterpress#trailhead");
    await expect(page.locator("html")).not.toHaveAttribute("data-reveal-variant");
    await expect(page.locator(".hero-strings")).toHaveCount(1);
    await expect(page.locator(".trailhead-surprise")).toBeVisible();
    const point = await contourPoint(page);
    const pixels = () => page.locator(".hero-strings").evaluate(c => (c as HTMLCanvasElement).toDataURL());
    const before = await pixels();
    await page.mouse.move(point.x - 50, point.y - 50);
    await page.mouse.move(point.x + 15, point.y + 50, { steps: 12 });
    await expect.poll(pixels).not.toBe(before);
    expect(await page.evaluate(() => Reflect.get(window, "guitarContexts").length)).toBe(0);
    await page.keyboard.press("Shift");
    expect(await page.evaluate(() => Reflect.get(window, "guitarContexts").length)).toBe(0);
    if (width < 600) await page.touchscreen.tap(point.x, point.y);
    else await page.mouse.click(point.x, point.y);
    await expect.poll(() => page.evaluate(() => Reflect.get(window, "guitarNotes"))).toBeGreaterThan(0);
    const notes = await page.evaluate(() => Reflect.get(window, "guitarNotes"));
    await page.mouse.move(point.x - 50, point.y - 50, { steps: 12 });
    await page.mouse.move(point.x + 15, point.y + 50, { steps: 12 });
    expect(await page.evaluate(() => Reflect.get(window, "guitarNotes"))).toBe(notes);
    const sound = page.getByRole("button", { name: "Guitar sound", exact: true });
    await sound.click();
    await page.mouse.click(point.x, point.y);
    expect(await page.evaluate(() => Reflect.get(window, "guitarNotes"))).toBe(notes);
    await page.reload();
    await expect(sound).toHaveAttribute("aria-pressed", "false");
    await page.getByRole("button", { name: "Climb view", exact: true }).click();
    await expect(page.locator(".splash--climb")).toHaveCount(0, { timeout: 4000 });
    await expect(page.locator(".hero-strings")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Ambient sound", exact: true })).toBeVisible();
    await expect(sound).toHaveCount(0);
    await page.getByRole("button", { name: "List view", exact: true }).click();
    await expect(page.locator(".splash--list")).toHaveCount(0, { timeout: 7000 });
    await expect(page.locator(".hero-strings")).toHaveCount(1);
    await expect(sound).toHaveAttribute("aria-pressed", "false");
    await context.close();
  });
}

test("reduced motion keeps the deboss but skips strings and the discovery note", async ({ page }) => {
  await probeAudio(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./");
  await expect(page.locator("#trailhead-title")).toHaveCSS("opacity", "1");
  await expect(page.locator("#trailhead-title")).not.toHaveCSS("text-shadow", "none");
  await expect(page.locator(".hero-strings")).toHaveCount(0);
  await expect(page.locator(".trailhead-surprise")).toBeHidden();
  await expect(page.getByRole("button", { name: "Guitar sound", exact: true })).toBeHidden();
  expect(await page.evaluate(() => Reflect.get(window, "guitarContexts").length)).toBe(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator(".hero-strings")).toHaveCount(1);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".hero-strings")).toHaveCount(0);
});
