import { summitStopIndex } from "../content/journey";
import { expect, test } from "@playwright/test";
import { openClimb, scrollToClimbStop } from "./helpers/climb";
test("List View has a portrait-free typographic opening without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("./");
  await expect(page.locator("#trailhead img, #trailhead [data-paper-piece]")).toHaveCount(0);
  await expect(page.locator("#trailhead .resume-link")).toHaveCount(1);
  await expect(page.locator("#trailhead .resume-link")).toHaveAttribute("href", "/portfolio/resume/Martinez_Diego_2026.pdf");
  await context.close();
});

for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 568 }]) {
  test(`Trailhead photo fits above the introduction on a ${viewport.width}px mobile Climb`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openClimb(page);
    await scrollToClimbStop(page, 0);
    const portrait = page.getByRole("img", { name: "Diego Martinez" });
    await expect(portrait).toBeInViewport();
    const photoBounds = await portrait.boundingBox();
    const introBounds = await page.locator('[data-card="0"]').boundingBox();
    expect(photoBounds!.y).toBeGreaterThanOrEqual(72);
    expect(photoBounds!.y + photoBounds!.height).toBeLessThanOrEqual(introBounds!.y);
    await expect(page.locator('[data-card="0"]').getByRole("link", { name: "View résumé (PDF, opens in a new tab)" })).toBeVisible();
    await page.getByRole("button", { name: "List view", exact: true }).click();
    await page.goto("./#trailhead");
    await expect(page.locator("#trailhead img[alt='Diego Martinez']")).toHaveCount(0);
    await expect(page.locator("#trailhead .resume-link")).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test("Climb shows Diego to the right of Trailhead and fades the photo with its introduction in both directions", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openClimb(page);
  await scrollToClimbStop(page, 0);
  const portrait = page.getByRole("img", { name: "Diego Martinez" });
  const intro = page.getByRole("heading", { level: 1 });
  await expect(portrait).toBeInViewport();
  await expect.poll(() => portrait.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  const imageBounds = await portrait.boundingBox();
  const titleBounds = await intro.boundingBox();
  expect(imageBounds!.x).toBeGreaterThan(titleBounds!.x + titleBounds!.width);

  await page.locator("#climb").evaluate((element: HTMLElement, intervals) => {
    window.scrollTo(0, 0.32 / intervals * (element.offsetHeight - innerHeight));
  }, summitStopIndex);
  // Observe the same rendered fade on both reading surfaces, not a second timer.
  await expect(page.locator('[data-card="0"]')).toHaveCSS("opacity", /^0\.3[0-5]\d*$/);
  const opacity = await page.locator('[data-card="0"]').evaluate((element) => getComputedStyle(element).opacity);
  // The portrait remains painted after becoming inert and leaving the accessibility tree.
  await expect(page.locator(".climb-portrait")).toHaveCSS("opacity", opacity);
  await scrollToClimbStop(page, 1);
  await expect(page.getByRole("img", { name: "Diego Martinez" })).toHaveCount(0);
  await scrollToClimbStop(page, 0);
  await expect(portrait).toBeInViewport();
  await expect(portrait.locator("xpath=ancestor::figure")).toHaveCSS("opacity", "1");
});
