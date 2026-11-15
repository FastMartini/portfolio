import { expect, test } from "@playwright/test";
import { openClimb, scrollToClimbStop } from "./helpers/climb";
import { holdNextTransition, imageDifference, seekIntro } from "./helpers/splash";
import { LIST } from "../components/splash/controller";

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  for (const theme of ["light", "dark"] as const) {
    test(`List return looks down, holds the open map and reuses the ${theme} hero reveal at ${viewport.width}px`, async ({ page }, info) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await openClimb(page, theme);
      await scrollToClimbStop(page, 3);
      await holdNextTransition(page, ".splash--list");
      await page.getByRole("button", { name: "List view", exact: true }).click();
      const overlay = page.locator(".splash--list");
      await seekIntro(page, 300, ".splash--list");
      await expect(page.locator("#climb")).toBeVisible();
      await expect(page.locator(".climb-list")).toBeHidden();
      await expect(overlay.locator(".splash-hand")).toHaveCount(0);
      // The map starts open: every panel remains flat for the entire sequence.
      const open = () => overlay.locator(".splash-pane, .splash-door").evaluateAll(panels => panels.map(panel => {
        const m = new DOMMatrix(getComputedStyle(panel).transform);
        return [m.m11, m.m22, m.m33];
      }));
      expect(await open()).toEqual(Array(6).fill([1, 1, 1]));
      await page.screenshot({ path: info.outputPath("01-looking-down.png") });
      await seekIntro(page, LIST.tilt, ".splash--list");
      await expect(page.locator(".climb-list")).toBeVisible();
      const map = overlay.locator(".splash-map"), camera = overlay.locator(".splash-camera");
      const overhead = (await map.boundingBox())!;
      expect(overhead.x + overhead.width / 2).toBeCloseTo(viewport.width / 2, 0);
      expect(overhead.y + overhead.height / 2).toBeCloseTo(viewport.height / 2, 0);
      await page.screenshot({ path: info.outputPath("02-overhead.png") });
      await seekIntro(page, LIST.zoom - 1, ".splash--list");
      expect(await map.boundingBox()).toEqual(overhead);
      expect(await camera.evaluate(el => new DOMMatrix(getComputedStyle(el).transform).m11)).toBe(1);
      expect(await open()).toEqual(Array(6).fill([1, 1, 1]));
      await seekIntro(page, 2300, ".splash--list");
      expect(await camera.evaluate(el => new DOMMatrix(getComputedStyle(el).transform).m11)).toBeGreaterThan(1);
      await page.screenshot({ path: info.outputPath("03-zoom-and-ink.png") });
      await seekIntro(page, 2700, ".splash--list");
      await expect(overlay.locator(".splash-sheet")).toHaveCSS("background-color", "rgb(243, 238, 221)");
      await expect(overlay.locator(".splash-sheet")).toHaveCSS("opacity", "1");
      await expect(overlay.locator(".splash-world")).toBeHidden();
      const heading = page.locator("#trailhead-title");
      const box = (await heading.boundingBox())!;
      await seekIntro(page, 4135, ".splash--list");
      await expect(heading).toHaveCSS("opacity", "0");
      const before = await page.screenshot();
      await seekIntro(page, 4145, ".splash--list");
      await expect(heading).toHaveCSS("opacity", "1");
      const after = await page.screenshot();
      const difference = await imageDifference(page, before, after, { x: Math.floor(box.x), y: Math.floor(box.y), width: Math.ceil(box.width), height: Math.ceil(box.height) });
      expect(difference.max).toBeLessThanOrEqual(1);
      await seekIntro(page, LIST.end + 1, ".splash--list");
      await expect(overlay).toHaveCount(0);
      await expect(page.locator("#list-view")).toBeFocused();
      await expect(page.getByRole("banner")).toHaveCSS("opacity", "1");
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await expect(page.locator(".climb-stage")).toHaveCSS("translate", "none");
      expect(await page.locator(".climb-list").evaluate(el => el.getAnimations({ subtree: true }).filter(a => !(a instanceof CSSAnimation)).length)).toBe(0);
      expect(await page.evaluate(() => scrollY)).toBe(0);
    });
  }

  test(`List return switches directly with reduced motion at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openClimb(page);
    await scrollToClimbStop(page, 3);
    await page.getByRole("button", { name: "List view", exact: true }).click();
    await expect(page.locator(".splash--list")).toHaveCount(0);
    await expect(page.locator(".climb-list")).toBeVisible();
    await expect(page.locator("#trailhead-title")).toHaveCSS("opacity", "1");
    await expect(page.locator("#list-view")).toBeFocused();
    expect(await page.evaluate(() => scrollY)).toBe(0);
  });

  test(`List return plays continuously at ${viewport.width}px`, async ({ browser, baseURL }, info) => {
    const context = await browser.newContext({ baseURL, viewport, reducedMotion: "no-preference", recordVideo: { dir: info.outputPath("recording"), size: viewport } });
    const page = await context.newPage();
    await openClimb(page);
    await scrollToClimbStop(page, 3);
    await page.getByRole("button", { name: "List view", exact: true }).click();
    await expect(page.locator(".splash--list")).toBeVisible();
    await expect(page.locator(".splash--list")).toHaveCount(0, { timeout: 5500 });
    await expect(page.locator("#trailhead-title")).toHaveCSS("opacity", "1");
    await expect(page.getByRole("banner")).toHaveCSS("opacity", "1");
    await context.close();
    await page.video()!.saveAs(info.outputPath("video.webm"));
  });
}

for (const time of [400, 2100]) {
  test(`List return dismisses cleanly at ${time}ms`, async ({ page }) => {
    await openClimb(page);
    await holdNextTransition(page, ".splash--list");
    await page.getByRole("button", { name: "List view", exact: true }).click();
    await seekIntro(page, time, ".splash--list");
    await page.keyboard.press("Escape");
    await expect(page.locator(".splash--list")).toHaveCount(0);
    await expect(page.locator("#trailhead-title")).toHaveCSS("opacity", "1");
    await expect(page.getByRole("banner")).toHaveCSS("opacity", "1");
    await expect(page.locator("#list-view")).toBeFocused();
  });
}

test("List return restores the page on resize during zoom", async ({ page }) => {
  await openClimb(page);
  await holdNextTransition(page, ".splash--list");
  await page.getByRole("button", { name: "List view", exact: true }).click();
  await seekIntro(page, 2000, ".splash--list");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".splash--list")).toHaveCount(0);
  await expect(page.locator("#trailhead-title")).toHaveCSS("opacity", "1");
});
