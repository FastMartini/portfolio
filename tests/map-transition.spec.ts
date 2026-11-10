import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function seekTransition(page: Page, time: number) {
  await page.locator(".splash--climb").evaluate((element, time) => {
    const controller = Reflect.get(element, Symbol.for("portfolio.splash"));
    controller.holdFailsafe();
    controller.animations.forEach((animation: Animation) => { animation.pause(); animation.currentTime = time; });
    controller.tick();
  }, time);
}

async function startPausedTransition(page: Page) {
  // Freeze in the activation task: a slow first paint can cross the 380ms
  // switch, and seeking backwards cannot undo a cue that has already fired.
  await page.getByRole("button", { name: "Climb view", exact: true }).evaluate((button: HTMLButtonElement) => {
    button.focus(); button.click();
    const controller = Reflect.get(document.querySelector(".splash--climb")!, Symbol.for("portfolio.splash"));
    controller.holdFailsafe();
    controller.animations.forEach((animation: Animation) => { animation.pause(); animation.currentTime = 0; });
  });
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("splash-seen", "1"));
});

for (const theme of ["light", "dark"] as const) {
  for (const width of [390, 1440]) {
    test(`${theme} List-to-Climb map sequence at ${width}px switches under paper and preserves the header`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript((theme) => localStorage.setItem("portfolio-theme", theme), theme);
      await page.goto("./");
      await expect(page.locator(".climb-list")).toBeVisible();
      await startPausedTransition(page);
      await expect(page.locator(".splash--climb")).toBeVisible();
      await expect(page.locator(".splash--climb .splash-hand")).toHaveCount(0);
      await seekTransition(page, 370);
      await expect(page.locator(".climb-list")).toBeVisible();
      await seekTransition(page, 400);
      await expect(page.locator("#climb")).toBeVisible();
      await expect(page.getByRole("button", { name: "List view", exact: true })).toBeFocused();
      await expect(page.locator(".site-header")).toHaveCSS("z-index", "60");
      await expect(page.locator(".splash--climb")).toHaveCSS("z-index", "59");
      await seekTransition(page, 1500);
      const scale = await page.locator(".climb-stage").evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a);
      expect(scale).toBe(1);
      await seekTransition(page, 2600);
      await expect(page.locator(".splash--climb")).toHaveCount(0);
      expect(await page.locator(".climb-stage").evaluate((el) => el.getAnimations().length)).toBe(0);
      await page.keyboard.press("Enter");
      await expect(page.locator(".climb-list")).toBeVisible();
      await expect(page.locator(".splash--climb")).toHaveCount(0);
    });
  }
}

for (const input of ["Escape", "pointer", "wheel", "touch", "resize", "motion"] as const) {
  test(`${input} dismisses an active transition into the finished Climb`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, hasTouch: true });
    const page = await context.newPage();
    await page.addInitScript(() => sessionStorage.setItem("splash-seen", "1"));
    await page.goto("./");
    await startPausedTransition(page);
    await seekTransition(page, 200);
    await expect(page.locator(".climb-list")).toBeVisible();
    if (input === "Escape") await page.keyboard.press("Escape");
    else if (input === "pointer") await page.mouse.click(10, 200);
    else if (input === "wheel") await page.mouse.wheel(0, 1);
    else if (input === "touch") await page.touchscreen.tap(10, 200);
    else if (input === "resize") await page.setViewportSize({ width: 900, height: 700 });
    else await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page.locator(".splash--climb")).toHaveCount(0);
    await expect(page.locator("#climb")).toBeVisible();
    await expect(page.locator(".climb-stage")).toHaveCSS("translate", "none");
    await context.close();
  });
}

test("natural completion leaves the Climb interactive and no transition animations running", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Climb view", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".splash--climb")).toBeVisible();
  await expect(page.locator(".splash--climb")).toHaveCount(0, { timeout: 4000 });
  await expect(page.locator("#climb")).toHaveAttribute("data-settled", "true");
  await page.getByRole("button", { name: "Go to Waypoint 01: MomentumX", exact: true }).click();
  await expect(page.locator('[data-marker="2"]')).toHaveAttribute("tabindex", "0");
  await page.locator('[data-marker="2"]').click();
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("offscreen greeting starts from blank paper and rapid reversal cleans up", async ({ page }) => {
  await page.goto("./#work");
  await page.getByRole("button", { name: "Climb view", exact: true }).click();
  await expect(page.locator(".splash--climb .splash-greeting--paper")).toBeHidden();
  await page.getByRole("button", { name: /List view|Climb view/, exact: true }).click();
  await expect(page.locator(".climb-list")).toBeVisible();
  await expect(page.locator(".splash--climb")).toHaveCount(0);
});

test("reduced motion enters Climb with opacity only and no map overlay", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./");
  await expect(page.locator(".climb-list")).toBeVisible();
  await page.getByRole("button", { name: "Climb view", exact: true }).click();
  await expect(page.locator("#climb")).toBeVisible();
  await expect(page.locator(".splash--climb")).toHaveCount(0);
  await expect(page.locator(".climb-enhancement")).toHaveCSS("opacity", "1");
  expect(await page.locator(".climb-enhancement").evaluate((el) => el.getAnimations().length)).toBe(0);
});

test("a failed map animation restores navigation and cancels partial animation effects", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await page.evaluate(() => {
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (frames, timing) {
      if (this.classList.contains("splash-camera")) throw new Error("Simulated camera animation failure");
      return animate.call(this, frames, timing);
    };
  });
  await page.getByRole("button", { name: "Climb view", exact: true }).click();
  await expect(page.locator("#climb")).toBeVisible();
  await expect(page.locator(".splash--climb")).toHaveCount(0);
  await expect(page.locator("#trailhead-title")).toHaveCSS("opacity", "1");
  await page.getByRole("button", { name: "List view", exact: true }).click();
  await expect(page.locator(".climb-list")).toBeVisible();
  expect(errors).toEqual([]);
});
