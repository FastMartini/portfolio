import { expect, test } from "@playwright/test";
import { holdNextTransition, seekIntro } from "./helpers/splash";

for (const theme of ["dark", "light"] as const) {
  test(`${theme} List View opens Climb through the map with one uninterrupted clock`, async ({ page }, testInfo) => {
    await page.addInitScript((theme) => { localStorage.setItem("portfolio-theme", theme); sessionStorage.setItem("splash-seen", "1"); }, theme);
    await page.goto("./");
    await expect(page.locator(".climb-list")).toBeVisible();
    await expect(page.locator("#climb")).toBeHidden();
    const toggle = page.getByRole("button", { name: "Climb view", exact: true });
    await toggle.focus();
    await holdNextTransition(page);
    await page.keyboard.press("Enter");
    const overlay = page.locator(".splash--climb");
    await expect(overlay).toBeVisible();
    await seekIntro(page, 200, ".splash--climb");
    await expect(page.locator("#climb")).toBeHidden();
    await expect(overlay).toHaveCSS("z-index", "59");
    await seekIntro(page, 400, ".splash--climb");
    await expect(page.locator("#climb")).toBeVisible();
    await expect(page.getByRole("button", { name: "List view", exact: true })).toBeFocused();
    await seekIntro(page, 1100, ".splash--climb");
    await page.screenshot({ path: testInfo.outputPath("map-pullback.png") });
    await seekIntro(page, 1750, ".splash--climb");
    await page.screenshot({ path: testInfo.outputPath("look-up.png") });
    // The detailed mountain may translate, but never scales or gets rebuilt.
    await expect(page.locator(".climb-stage")).toHaveCSS("scale", "none");
    await seekIntro(page, 2601, ".splash--climb");
    await expect(overlay).toHaveCount(0);
    await expect(page.getByRole("button", { name: "List view", exact: true })).toBeFocused();
    await page.getByRole("button", { name: "Go to Waypoint 02: Veritas", exact: true }).click();
    await expect(page.locator("#climb")).toHaveAttribute("data-stop", "3");
    await expect(page.locator('[data-marker="3"]')).not.toHaveAttribute("tabindex", "-1");
    await page.getByRole("button", { name: "List view", exact: true }).click();
    await expect(page.locator(".climb-list")).toBeVisible();
  });
}

for (const time of [100, 1400]) {
  test(`Escape at ${time}ms finishes the transition into interactive Climb`, async ({ page }) => {
    await page.goto("./#list-view");
    await holdNextTransition(page);
    await page.getByRole("button", { name: "Climb view", exact: true }).click();
    await seekIntro(page, time, ".splash--climb");
    await page.keyboard.press("Escape");
    await expect(page.locator(".splash--climb")).toHaveCount(0);
    await expect(page.locator("#climb")).toBeVisible();
    await page.getByRole("button", { name: "List view", exact: true }).click();
    await expect(page.locator(".climb-list")).toBeVisible();
  });
}

test("reduced motion crossfades without paper movement and leaves no script animations", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./#list-view");
  await page.getByRole("button", { name: "Climb view", exact: true }).click();
  await expect(page.locator("#climb")).toBeVisible();
  await expect(page.locator(".splash--climb")).toHaveCount(0);
  await expect(page.locator(".climb-enhancement")).toHaveCSS("opacity", "1");
  expect(await page.locator(".climb-enhancement").evaluate((el) => el.getAnimations().filter((a) => !(a instanceof CSSAnimation)).length)).toBe(0);
});

test("the transition completes naturally by 2.7 seconds", async ({ page }) => {
  await page.goto("./#list-view");
  await page.getByRole("button", { name: "Climb view", exact: true }).click();
  await expect(page.locator("#climb")).toBeVisible({ timeout: 1000 });
  await expect(page.locator(".splash--climb")).toHaveCount(0, { timeout: 2700 });
  expect(await page.locator(".climb-stage").evaluate((el) => el.getAnimations({ subtree: true }).filter((a) => !(a instanceof CSSAnimation)).length)).toBe(0);
});

test("Enter opens the map transition and Enter again returns to List View", async ({ page }) => {
  await page.goto("./#list-view");
  const toggle = page.getByRole("button", { name: "Climb view", exact: true });
  await toggle.focus();
  await holdNextTransition(page);
  await page.keyboard.press("Enter");
  await seekIntro(page, 2601, ".splash--climb");
  await expect(page.getByRole("button", { name: "List view", exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator(".climb-list")).toBeVisible();
  await expect(page.locator("#list-view")).toBeFocused();
});

test("an offscreen greeting uses blank paper and wheel dismissal leaves native scrolling available", async ({ page }) => {
  await page.goto("./#work");
  await holdNextTransition(page);
  await page.getByRole("button", { name: "Climb view", exact: true }).click();
  await seekIntro(page, 100, ".splash--climb");
  await expect(page.locator(".splash--climb .splash-greeting--paper")).toBeHidden();
  await page.mouse.wheel(0, 500);
  await expect(page.locator(".splash--climb")).toHaveCount(0);
  await expect(page.locator("#climb")).toBeVisible();
  await expect(page.locator("#climb")).toHaveAttribute("data-settled", "true");
  await page.mouse.move(1000, 650);
  await page.mouse.wheel(0, 500);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
});

test("resizing during the map pullback restores the finished Climb", async ({ page }) => {
  await page.goto("./#list-view");
  await holdNextTransition(page);
  await page.getByRole("button", { name: "Climb view", exact: true }).click();
  await seekIntro(page, 800, ".splash--climb");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".splash--climb")).toHaveCount(0);
  await expect(page.locator("#climb")).toBeVisible();
  await expect(page.locator(".climb-stage")).toHaveCSS("translate", "none");
});

test("relaxing reduced motion before opting into Climb restores the full map choreography", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./#list-view");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await holdNextTransition(page);
  await page.getByRole("button", { name: "Climb view", exact: true }).click();
  await seekIntro(page, 1100, ".splash--climb");
  await expect(page.locator("html")).toHaveAttribute("data-motion", "full");
  await expect(page.locator(".splash--climb .splash-world")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".splash--climb")).toHaveCount(0);
});

for (const width of [1440, 390]) {
  for (const time of [100, 1400]) {
    test(`browser Back preserves the reading destination during Climb entry at ${time}ms and ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("./#work");
      await expect(page.getByRole("button", { name: "Climb view", exact: true })).toBeVisible();
      await page.evaluate(() => { location.hash = "about"; });
      await expect(page).toHaveURL(/#about$/);
      await holdNextTransition(page);
      await page.getByRole("button", { name: "Climb view", exact: true }).click();
      await seekIntro(page, time, ".splash--climb");
      await page.goBack();
      await expect(page).toHaveURL(/#work$/);
      await expect(page.locator(".splash--climb")).toHaveCount(0);
      await expect(page.locator(".climb-list")).toBeVisible();
      await expect(page.locator("#climb")).toBeHidden();
      await expect(page.locator("#work")).toBeFocused();
      await expect(page.locator("#work")).toBeInViewport();
      await expect(page.locator(".climb-stage")).toHaveCSS("translate", "none");
    });
  }
}
