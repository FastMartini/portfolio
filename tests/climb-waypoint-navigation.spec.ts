import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { journeyStops } from "../content/journey";
import { openClimb, scrollToClimbStop } from "./helpers/climb";
import { settledScrollY } from "./helpers/native-scroll";

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`Waypoint Panel content accepts pointer input at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openClimb(page);
    await scrollToClimbStop(page, 3);
    await page.locator('[data-marker="3"]').click();
    const panel = page.getByRole("dialog");
    const link = panel.getByRole("link", { name: "Read case study" });
    await expect(link).toBeInViewport();
    expect(await link.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return element.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
    })).toBe(true);
    await link.click();
    await expect(panel.locator("#panel-title")).toHaveText("Veritas · Case Study");
    await expect(panel.getByRole("heading", { name: "The problem", exact: true })).toBeVisible();
    await panel.getByRole("button", { name: "← Summary" }).click();
    await expect(panel.locator("#panel-title")).toHaveText("Veritas");
  });
}

for (const height of [568, 680, 681, 700, 844]) {
  test(`the sound control leaves Summit clickable at 390×${height}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openClimb(page);
    const summit = page.locator('[data-rail="9"]');
    const sound = page.locator(".climb-sound-toggle");
    await expect(summit).toBeInViewport();
    const railBox = (await summit.boundingBox())!;
    const soundBox = (await sound.boundingBox())!;
    expect(railBox.x + railBox.width <= soundBox.x || soundBox.x + soundBox.width <= railBox.x
      || railBox.y + railBox.height <= soundBox.y || soundBox.y + soundBox.height <= railBox.y,
    "Summit and sound touch targets must not overlap").toBe(true);
    await scrollToClimbStop(page, 3);
    await page.locator('[data-marker="3"]').click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await summit.click();
    await expect(page.locator("#climb")).toHaveAttribute("data-stop", "9");
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.locator('[data-card="9"]')).toBeVisible();
    await sound.click();
    await expect(sound).toHaveAttribute("aria-pressed", "true");
  });
}

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 568 }]) {
  for (const reducedMotion of ["reduce", "no-preference"] as const) {
    test(`Trail Rail switches open panels at ${viewport.width}px with ${reducedMotion} motion`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion });
      await openClimb(page);
      const rail = page.getByRole("navigation", { name: "Trail stops" });
      await expect(page.locator(".climb-rail-hint")).toHaveCount(0);
      await expect(rail.locator("span").first()).toHaveText("");
      await expect(rail).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
      const resume = page.locator('[data-card="0"]').getByRole("link", { name: "Résumé (PDF)" });
      await expect(resume).toHaveClass(/button-primary/);
      expect((await page.request.get((await resume.getAttribute("href"))!)).ok()).toBe(true);
      await expect(page.getByRole("button", { name: /Start the climb/i })).toHaveCount(0);
      await expect(page.locator(".climb-trail-sign")).toHaveCount(0);

      const panel = page.getByRole("dialog");
      await scrollToClimbStop(page, 2);
      await expect(panel).toBeHidden();
      await page.locator('[data-marker="2"]').click();
      for (const stop of [2, 6, 3]) {
        const button = rail.locator(`[data-rail="${stop}"]`);
        await button.click();
        await expect(panel.locator("#panel-title")).toHaveText(journeyStops[stop].label);
        await expect(page.locator("#climb")).toHaveAttribute("data-settled", "true", { timeout: 15000 });
        await expect(button).toHaveAttribute("aria-current", "step");
        await expect(button).toBeFocused();
        await expect(button).toBeInViewport();
        expect(await button.evaluate((element) => {
          const box = element.getBoundingClientRect();
          return element.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
        })).toBe(true);
      }
      await expect(panel).toBeInViewport();
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
      const audit = await new AxeBuilder({ page }).include(".climb-rail").include("#waypoint-panel")
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      expect(audit.violations).toEqual([]);

      // Keyboard navigation stays on the sidebar when explicitly switching a panel.
      const next = rail.locator('[data-rail="4"]');
      await next.focus();
      await page.keyboard.press("Enter");
      await expect(panel.locator("#panel-title")).toHaveText(journeyStops[4].label);
      await expect(next).toBeFocused();
      await panel.getByRole("button", { name: "Close panel" }).click();
      await expect(panel).toBeHidden();
      await expect(next).toBeFocused();
      await page.waitForTimeout(350);
      await expect(panel).toBeHidden();
      await next.click();
      await expect(panel).toBeHidden();
      // Native smooth scrolling can still move the projected marker after a
      // rail click. Let it settle before targeting that marker with the pointer.
      await settledScrollY(page);
      await expect(page.locator("#climb")).toHaveAttribute("data-settled", "true");
      await page.locator('[data-marker="4"]').click();
      await expect(panel).toBeVisible();
      await rail.locator('[data-rail="9"]').click();
      await expect(panel).toBeHidden();
      await expect(page.locator('[data-card="9"]')).toBeVisible();
      await page.getByRole("button", { name: "List view", exact: true }).click();
      await expect(page.locator("html")).toHaveCSS("scroll-snap-type", "none");
    });
  }
}

test("native wheel scrolling stays free and never opens a panel", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await openClimb(page);
  const url = page.url();
  await scrollToClimbStop(page, 1);
  await page.mouse.move(700, 650);
  let expectedY = 900;
  for (const [delta, stop] of [[800, 2], [800, 3], [-800, 2]] as const) {
    await page.mouse.wheel(0, delta);
    await expect(page.locator("#climb")).toHaveAttribute("data-stop", String(stop));
    const y = await settledScrollY(page);
    expectedY += delta;
    expect(y).toBeCloseTo(expectedY, 0);
    await expect(page.getByRole("dialog")).toBeHidden();
  }
  expect(page.url()).toBe(url);
});

test("reading scroll stays inside the panel and revisiting a waypoint keeps its panel closed", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openClimb(page);
  await scrollToClimbStop(page, 3);
  await page.locator('[data-marker="3"]').click();
  const panel = page.getByRole("dialog");
  await expect(panel.locator("#panel-title")).toHaveText("Veritas");
  await panel.getByRole("link", { name: "Read case study" }).click();
  const before = await page.evaluate(() => scrollY);
  await panel.locator(".climb-panel-body").hover();
  await page.mouse.wheel(0, 600);
  await expect.poll(() => panel.locator(".climb-panel-body").evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  expect(await page.evaluate(() => scrollY)).toBe(before);
  await expect(panel.locator("#panel-title")).toHaveText("Veritas · Case Study");
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await page.waitForTimeout(350);
  await expect(panel).toBeHidden();
  await scrollToClimbStop(page, 4);
  await expect(panel).toBeHidden();
  await scrollToClimbStop(page, 3);
  await expect(panel).toBeHidden();
});
