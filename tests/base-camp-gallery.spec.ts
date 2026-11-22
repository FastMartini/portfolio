import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { openClimb, scrollToClimbStop } from "./helpers/climb";
import { imageDifference } from "./helpers/splash";

async function baseCamp(page: Page, reducedMotion: "reduce" | "no-preference" = "no-preference") {
  await page.emulateMedia({ reducedMotion });
  await openClimb(page);
  await scrollToClimbStop(page, 1);
  const gallery = page.getByRole("region", { name: "Accomplishments" });
  await expect(gallery).toHaveAttribute("data-ready", "true");
  await gallery.locator(".teaching-gallery-viewport").scrollIntoViewIfNeeded();
  await expect.poll(() => gallery.evaluate(element => [...element.querySelectorAll("img")].every(image => image.complete && image.naturalWidth > 0))).toBe(true);
  return gallery;
}

async function position(page: Page) {
  return page.locator(".teaching-gallery-track").evaluate(element => new DOMMatrixReadOnly(getComputedStyle(element).transform).m41);
}

async function loopDistance(page: Page, before: number) {
  const period = await page.locator('.teaching-gallery-copy[data-copy="1"]').evaluate(element => element.getBoundingClientRect().width);
  const difference = Math.abs((await position(page)) - before) % period;
  return Math.min(difference, period - difference);
}

async function drag(page: Page, distance: number) {
  const box = (await page.locator(".teaching-gallery-viewport").boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + 40);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + distance, box.y + 40, { steps: 12 });
  await page.mouse.up();
}

async function openPhoto(page: Page) {
  const viewport = page.locator(".teaching-gallery-viewport");
  const box = (await viewport.boundingBox())!;
  await viewport.click({ position: { x: box.width / 2, y: 40 } });
  const preview = page.getByRole("dialog", { name: /enlarged/ });
  await expect(preview).toBeVisible();
  return preview;
}

test("Accomplishments loops every List View teaching photo to the right, with no pause button", async ({ page }) => {
  const gallery = await baseCamp(page);
  await expect(gallery.getByRole("heading", { name: "Accomplishments" })).toBeVisible();
  await expect(gallery.getByRole("button")).toHaveCount(0);
  const sources = await gallery.evaluate(element => [...new Set([...element.querySelectorAll("img")].map(image => new URL(image.src).pathname))].sort());
  // The same teaching photos as the List View "Teaching moments" ring, and none of its project cards.
  await page.evaluate(() => { location.hash = "about"; });
  const ring = page.getByRole("region", { name: "Teaching moments" });
  const listView = await ring.evaluate(element => [...element.querySelectorAll(".ring-card img")].map(image => new URL((image as HTMLImageElement).src).pathname).sort());
  expect(sources).toEqual(listView);
  expect(sources).toHaveLength(8);
  expect(sources.every(source => source.startsWith("/portfolio/about/teacher/"))).toBe(true);
});

test("auto-scroll runs faster to the right, pauses on drag and resumes 3 seconds after release", async ({ page }) => {
  const gallery = await baseCamp(page);
  await expect(gallery).toHaveAttribute("data-playback", "running");
  const start = await position(page);
  await page.waitForTimeout(1000);
  // About 18px per second, left to right. Frames are capped at 50ms so slow
  // renderers move more slowly instead of jumping; allow for that on CI.
  await expect.poll(() => loopDistance(page, start), { timeout: 3000 }).toBeGreaterThan(12);
  const box = (await page.locator(".teaching-gallery-viewport").boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + 40);
  await page.mouse.down();
  const pressed = await position(page);
  await page.waitForTimeout(300);
  expect(await position(page)).toBe(pressed);
  await page.mouse.move(box.x + box.width / 2 - 60, box.y + 40, { steps: 8 });
  await page.mouse.up();
  const released = await position(page);
  await page.waitForTimeout(2000);
  expect(await position(page)).toBe(released);
  // A second drag restarts the 3-second wait.
  await drag(page, 30);
  const again = await position(page);
  await page.waitForTimeout(2000);
  expect(await position(page)).toBe(again);
  await expect(gallery).toHaveAttribute("data-playback", "paused");
  await expect.poll(() => loopDistance(page, again), { timeout: 3000 }).toBeGreaterThan(2);
  await expect(gallery).toHaveAttribute("data-playback", "running");
});

test("dragging browses both ways without opening a photo, then automatic movement resumes", async ({ page }) => {
  await baseCamp(page);
  await drag(page, -80);
  await expect(page.getByRole("dialog", { name: /enlarged/ })).toHaveCount(0);
  const left = await position(page);
  await page.waitForTimeout(250);
  expect(await position(page)).toBe(left);
  await drag(page, 40);
  const right = await position(page);
  // Measure around the loop: the drag may cross the seam between copies.
  const period = await page.locator('.teaching-gallery-copy[data-copy="1"]').evaluate(element => element.getBoundingClientRect().width);
  const moved = ((right - left) % period + period * 1.5) % period - period / 2;
  expect(moved).toBeCloseTo(40, 0);
  await expect(page.getByRole("dialog", { name: /enlarged/ })).toHaveCount(0);
  await page.waitForTimeout(300);
  expect(await position(page)).toBe(right);
  // The drag can end beside the seam, so automatic movement may wrap around it.
  await expect.poll(() => loopDistance(page, right), { timeout: 5000 }).toBeGreaterThan(2);
});

test("an enlarged photo keeps the strip paused and restores focus before resuming", async ({ page }) => {
  await baseCamp(page);
  const preview = await openPhoto(page);
  await expect(preview.getByRole("button", { name: "Close enlarged photo" })).toBeFocused();
  const frozen = await position(page);
  await page.waitForTimeout(2500);
  expect(await position(page)).toBe(frozen);
  // The mountain stays painted behind the preview, and the page does not scroll.
  const scrolled = await page.evaluate(() => scrollY);
  await page.mouse.move(700, 450); await page.mouse.wheel(0, 600); await page.waitForTimeout(200);
  expect(await page.evaluate(() => scrollY)).toBe(scrolled);
  await expect(page.locator("html")).not.toHaveCSS("overflow", "hidden");
  await expect(page.locator(".climb-stage")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(preview).toBeHidden();
  await expect(page.locator('.teaching-gallery-copy[data-copy="1"] a:focus')).toHaveCount(1);
  const closed = await position(page);
  await page.waitForTimeout(250);
  expect(await position(page)).toBe(closed);
  await expect.poll(() => position(page), { timeout: 5000 }).not.toBe(closed);
  await expect(page.locator("html")).not.toHaveCSS("overflow", "hidden");
});

test("close button, outside click and Escape close the accessible lightbox", async ({ page }) => {
  const gallery = await baseCamp(page, "reduce");
  expect((await new AxeBuilder({ page }).include(".teaching-gallery").analyze()).violations).toEqual([]);
  for (const close of ["button", "outside", "escape"]) {
    const preview = await openPhoto(page);
    await expect(preview.getByRole("img")).toBeInViewport();
    expect((await new AxeBuilder({ page }).include(".teaching-preview").analyze()).violations).toEqual([]);
    if (close === "button") await preview.getByRole("button", { name: "Close enlarged photo" }).click();
    else if (close === "outside") await page.mouse.click(8, 8);
    else await page.keyboard.press("Escape");
    await expect(preview).toBeHidden();
    await expect(gallery).toHaveAttribute("data-playback", "reduced");
  }
});

test("reduced motion keeps manual keyboard browsing and modal focus recovery", async ({ page }) => {
  const gallery = await baseCamp(page, "reduce");
  await expect(gallery).toHaveAttribute("data-playback", "reduced");
  const viewport = gallery.locator(".teaching-gallery-viewport");
  await viewport.focus();
  const before = await position(page);
  await page.waitForTimeout(200);
  expect(await position(page)).toBe(before);
  await page.keyboard.press("ArrowRight");
  expect(await position(page)).not.toBe(before);
  await page.keyboard.press("ArrowLeft");
  expect(await loopDistance(page, before)).toBeLessThan(0.001);
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: /enlarged/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(gallery.getByRole("link", { name: "Enlarge Leadership" })).toBeFocused();
});

test("a full manual loop has identical photo pixels at the seam", async ({ page, browserName }, info) => {
  // One full period is wider than the window, and Firefox drops synthetic
  // pointer coordinates outside it. Its drags are covered by the browsing test.
  test.skip(browserName === "firefox", "Firefox drops synthetic pointer moves outside the window.");
  const gallery = await baseCamp(page, "reduce");
  const viewport = gallery.locator(".teaching-gallery-viewport");
  const clip = (await viewport.boundingBox())!;
  const period = await gallery.locator('[data-copy="1"]').evaluate(element => element.getBoundingClientRect().width);
  const initial = await position(page);
  const before = await page.screenshot();
  await drag(page, period);
  expect(await loopDistance(page, initial)).toBeLessThan(0.001);
  const after = await page.screenshot();
  await info.attach("Before loop", { body: before, contentType: "image/png" });
  await info.attach("After loop", { body: after, contentType: "image/png" });
  expect(await viewport.boundingBox()).toEqual(clip);
  const difference = await imageDifference(page, before, after, clip);
  expect(difference.mean).toBeLessThan(0.1);
  expect(difference.changedRatio).toBeLessThan(0.001);
  await expect(page.getByRole("dialog", { name: /enlarged/ })).toHaveCount(0);
});

test("the gallery stops offscreen and closes a preview when Climb is left", async ({ page }) => {
  const gallery = await baseCamp(page);
  await scrollToClimbStop(page, 2);
  const offscreen = await position(page);
  await page.waitForTimeout(250);
  expect(await position(page)).toBe(offscreen);
  await scrollToClimbStop(page, 1);
  await gallery.locator(".teaching-gallery-viewport").scrollIntoViewIfNeeded();
  await openPhoto(page);
  await page.evaluate(() => { location.hash = "about"; });
  await expect(page.getByRole("dialog", { name: /enlarged/ })).toHaveCount(0);
  await expect(page.locator("html")).not.toHaveCSS("overflow", "hidden");
  await expect(page.locator(".teaching-gallery")).toHaveAttribute("data-playback", "inactive");
});

test("a native phone swipe browses without opening, and a subsequent tap enlarges", async ({ browser, browserName, baseURL }) => {
  test.skip(browserName !== "chromium", "Native touch swipes use Chromium's input protocol.");
  const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await baseCamp(page, "reduce");
  const box = (await page.locator(".teaching-gallery-viewport").boundingBox())!;
  const input = await context.newCDPSession(page);
  const x = box.x + box.width * 0.7, y = box.y + 45;
  await input.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  const before = await position(page);
  for (let step = 1; step <= 8; step++) await input.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x - step * 12, y }] });
  await input.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  expect(await position(page)).not.toBe(before);
  await expect(page.getByRole("dialog", { name: /enlarged/ })).toHaveCount(0);
  // Tap the middle of a photo that is fully visible after the swipe.
  const target = await page.locator('.teaching-gallery-copy[data-copy="1"] [data-photo-index]').evaluateAll((links, bounds) => {
    const fits = links.map(link => link.getBoundingClientRect()).find(rect => rect.left >= bounds.x && rect.right <= bounds.x + bounds.width);
    return fits && { x: fits.left + fits.width / 2, y: fits.top + Math.min(45, fits.height / 2) };
  }, box);
  expect(target).toBeTruthy();
  await page.touchscreen.tap(target!.x, target!.y);
  await expect(page.getByRole("dialog", { name: /enlarged/ })).toBeVisible();
  await page.keyboard.press("Escape");
  const card = page.locator('[data-card="1"]');
  const scrollBefore = await card.evaluate(element => element.scrollTop);
  const pageBefore = await page.evaluate(() => scrollY);
  const currentBox = (await page.locator(".teaching-gallery-viewport").boundingBox())!;
  const touch = { x: currentBox.x + currentBox.width / 2, y: currentBox.y + 30 };
  await input.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [touch] });
  for (let step = 1; step <= 8; step++) await input.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: touch.x, y: touch.y + step * 10 }] });
  await input.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect.poll(async () => (await card.evaluate(element => element.scrollTop)) < scrollBefore || (await page.evaluate(() => scrollY)) !== pageBefore).toBe(true);
  await expect(page.getByRole("dialog", { name: /enlarged/ })).toHaveCount(0);
  await context.close();
});

for (const theme of ["light", "dark"] as const) {
  test(`the gallery and enlarged teaching photo fit a phone in ${theme}`, async ({ page }, info) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.addInitScript(theme => localStorage.setItem("portfolio-theme", theme), theme);
    const gallery = await baseCamp(page, "reduce");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
    await gallery.screenshot({ path: info.outputPath(`gallery-${theme}.png`) });
    const preview = await openPhoto(page);
    await expect(preview.getByRole("img")).toBeInViewport();
    await expect(preview.getByRole("button", { name: "Close enlarged photo" })).toBeInViewport();
    await page.screenshot({ path: info.outputPath(`enlarged-${theme}.png`) });
  });
}
