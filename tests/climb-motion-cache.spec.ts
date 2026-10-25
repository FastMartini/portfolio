import { expect, test } from "@playwright/test";
import { openClimb } from "./helpers/climb";
import { sampleTrail, trailLength } from "../components/climb/mountain/geometry";

test("scrolling uses a bounded cached mountain while the trail keeps moving, then restores the SVG", async ({ page }) => {
  await page.addInitScript(() => {
    const arc = CanvasRenderingContext2D.prototype.arc;
    CanvasRenderingContext2D.prototype.arc = function (x, y, ...rest) {
      if (this.canvas.classList.contains("climb-motion-climber")) Reflect.set(window, "cacheClimberPoint", { x, y });
      return arc.call(this, x, y, ...rest);
    };
  });
  await openClimb(page);
  const host = page.locator(".climb-mountain");
  await expect(host).toHaveAttribute("data-cache-ready", "true", { timeout: 15000 });
  const cache = page.locator(".climb-motion-cache");
  await expect(cache).toBeHidden();
  const pixels = await cache.locator("img").evaluateAll((images) => images.reduce((sum, image) => {
    const bitmap = image as HTMLImageElement;
    return sum + bitmap.naturalWidth * bitmap.naturalHeight;
  }, 0));
  expect(pixels).toBeGreaterThan(0);
  expect(pixels).toBeLessThanOrEqual(16_000_000);
  await page.locator("#climb").evaluate((element) => window.scrollTo(0, (element as HTMLElement).offsetHeight / 3));
  await expect(cache).toBeVisible();
  await expect(page.locator("svg.mtn")).toHaveCSS("opacity", "0");
  expect(await page.locator("svg.mtn").evaluate((svg) => (svg as SVGSVGElement).animationsPaused())).toBe(true);
  const state = await page.evaluate(() => ({
    position: Number(document.querySelector<HTMLElement>("#climb")!.dataset.position),
    offset: document.querySelector<HTMLCanvasElement>(".climb-motion-walked")!.getContext("2d")!.lineDashOffset,
    climber: Reflect.get(window, "cacheClimberPoint"),
  }));
  expect(state.offset).toBeCloseTo(trailLength * (1 - state.position), -1);
  const point = sampleTrail(state.position);
  // The DOM position is rounded to four decimals; allow its arc-length error.
  const tolerance = trailLength * 0.00005 + 0.1;
  expect(Math.abs(state.climber.x - point[0])).toBeLessThan(tolerance);
  expect(Math.abs(state.climber.y - point[1])).toBeLessThan(tolerance);
  await expect(page.locator("#climb")).toHaveAttribute("data-settled", "true", { timeout: 15000 });
  await expect(cache).toBeHidden();
  await expect(page.locator("svg.mtn")).toHaveCSS("opacity", "1");
  await page.locator('[data-marker="3"]').click();
  await expect(page.getByRole("dialog").locator("#panel-title")).toHaveText("Veritas");
});

test("weather changes do not inherit through the detailed SVG", async ({ page }) => {
  await openClimb(page);
  await expect(page.locator(".climb-sky")).toHaveCSS("--sky-top", "rgb(231,220,192)");
  expect(await page.locator("svg.mtn").evaluate((svg) => getComputedStyle(svg).getPropertyValue("--sky-top"))).toBe("");
});

test("an unavailable bitmap context keeps the original mountain and navigation usable", async ({ page }) => {
  await page.addInitScript(() => { HTMLCanvasElement.prototype.getContext = () => null; });
  await openClimb(page);
  await expect(page.locator(".climb-mountain")).toHaveAttribute("data-cache-state", "unavailable");
  await page.getByRole("navigation", { name: "Trail stops" }).getByRole("button", { name: "Go to Waypoint 02: Veritas", exact: true }).click();
  await expect(page.locator("#climb")).toHaveAttribute("data-stop", "3");
  await expect(page.locator("svg.mtn")).toHaveCSS("opacity", "1");
  await page.locator('[data-marker="3"]').click();
  await expect(page.getByRole("dialog").locator("#panel-title")).toHaveText("Veritas");
});

test("resizing rebuilds the cache without replacing the source artwork", async ({ page }) => {
  await openClimb(page);
  const host = page.locator(".climb-mountain");
  await expect(host).toHaveAttribute("data-cache-ready", "true", { timeout: 15000 });
  const previous = await page.locator(".climb-motion-cache img").first().getAttribute("src");
  await page.locator("svg.mtn").evaluate((svg) => Reflect.set(window, "originalMountain", svg));
  await page.setViewportSize({ width: 390, height: 700 });
  await expect.poll(() => page.locator(".climb-motion-cache img").first().getAttribute("src"), { timeout: 15000 }).not.toBe(previous);
  expect(await page.locator("svg.mtn").evaluate((svg) => svg === Reflect.get(window, "originalMountain"))).toBe(true);
  const pixels = await page.locator(".climb-motion-cache img").evaluateAll((images) => images.reduce((sum, image) => {
    const bitmap = image as HTMLImageElement;
    return sum + bitmap.naturalWidth * bitmap.naturalHeight;
  }, 0));
  expect(pixels).toBeGreaterThan(0);
  expect(pixels).toBeLessThanOrEqual(16_000_000);
});

test("losing a live drawing context restores vector navigation", async ({ page }) => {
  await openClimb(page);
  await expect(page.locator(".climb-mountain")).toHaveAttribute("data-cache-ready", "true", { timeout: 15000 });
  await page.locator("#climb").evaluate((element) => window.scrollTo(0, (element as HTMLElement).offsetHeight / 3));
  await expect(page.locator(".climb-motion-cache")).toBeVisible();
  await page.locator(".climb-motion-climber").dispatchEvent("contextlost");
  await expect(page.locator(".climb-motion-cache")).toBeHidden();
  await expect(page.locator("svg.mtn")).toHaveCSS("opacity", "1");
  await expect(page.locator(".climb-mountain")).toHaveAttribute("data-cache-state", "unavailable");
  await expect(page.locator("#climb")).toBeVisible();
  await expect(page.locator("#climb")).toHaveAttribute("data-settled", "true", { timeout: 15000 });
});
