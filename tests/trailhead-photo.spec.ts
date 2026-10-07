import { expect, test } from "@playwright/test";
import { openClimb, scrollToClimbStop } from "./helpers/climb";

test("List View introduces Diego with his photo instead of Field note 01, without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("./");
  const trailhead = page.getByRole("region", { name: "Software engineer building intelligent, data-driven products." });
  const portrait = trailhead.getByRole("img", { name: "Diego Martinez" });
  await expect(portrait).toBeVisible();
  await expect.poll(() => portrait.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  await expect(trailhead.getByText("Field note 01")).toHaveCount(0);
  const imageBounds = await portrait.boundingBox();
  const titleBounds = await trailhead.getByRole("heading", { level: 1 }).boundingBox();
  expect(imageBounds!.x).toBeGreaterThan(titleBounds!.x + titleBounds!.width);
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
    await expect(page.getByRole("button", { name: "Start the climb →" })).toBeVisible();
    await page.getByRole("button", { name: "List view", exact: true }).click();
    await page.goto("./#trailhead");
    const listPortrait = page.getByRole("img", { name: "Diego Martinez" });
    await expect(listPortrait).toBeVisible();
    const listImageBounds = await listPortrait.boundingBox();
    const copyBounds = await page.locator(".trailhead-copy").boundingBox();
    expect(listImageBounds!.y).toBeGreaterThanOrEqual(copyBounds!.y + copyBounds!.height);
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

  await page.locator("#climb").evaluate((element: HTMLElement) => {
    window.scrollTo(0, 0.32 / 9 * (element.offsetHeight - innerHeight));
  });
  // Observe the same rendered fade on both reading surfaces, not a second timer.
  await expect(page.locator('[data-card="0"]')).toHaveCSS("opacity", /0\.[4-8]\d*/);
  const opacity = await page.locator('[data-card="0"]').evaluate((element) => getComputedStyle(element).opacity);
  await expect(portrait.locator("..")).toHaveCSS("opacity", opacity);
  await scrollToClimbStop(page, 1);
  await expect(page.getByRole("img", { name: "Diego Martinez" })).toHaveCount(0);
  await scrollToClimbStop(page, 0);
  await expect(portrait).toBeInViewport();
  await expect(portrait.locator("..")).toHaveCSS("opacity", "1");
});
