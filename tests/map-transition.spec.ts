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

async function enterClimb(page: Page) {
  await startPausedTransition(page);
  await seekTransition(page, 2600);
  await expect(page.locator("#climb")).toBeVisible();
}

async function startPausedReturn(page: Page) {
  await page.getByRole("button", { name: "List view", exact: true }).evaluate((button: HTMLButtonElement) => {
    button.focus(); button.click();
    const controller = Reflect.get(document.querySelector(".splash--list")!, Symbol.for("portfolio.splash"));
    controller.holdFailsafe();
    controller.animations.forEach((animation: Animation) => { animation.pause(); animation.currentTime = 0; });
  });
}

async function seekReturn(page: Page, time: number) {
  await page.locator(".splash--list").evaluate((element, time) => {
    const controller = Reflect.get(element, Symbol.for("portfolio.splash"));
    controller.animations.forEach((animation: Animation) => { animation.pause(); animation.currentTime = time; });
    controller.tick();
    // The covered switch measures List View and adds the shared camera/reveal
    // effects. Seek those newly created effects onto this same paused frame.
    if (element.isConnected) controller.animations.forEach((animation: Animation) => { animation.pause(); animation.currentTime = time; });
  }, time);
}

for (const theme of ["light", "dark"] as const) {
  for (const width of [390, 1440]) {
    test(`${theme} Climb-to-List at ${width}px looks down at an open map, holds, then reveals the hero`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript((theme) => localStorage.setItem("portfolio-theme", theme), theme);
      await page.goto("./");
      await enterClimb(page);
      await startPausedReturn(page);
      const overlay = page.locator(".splash--list");
      await expect(overlay.locator(".splash-sheet")).toHaveCSS("opacity", "0");
      for (const selector of [".splash-row--top", ".splash-door--l", ".splash-door--r"]) {
        for (const part of await overlay.locator(selector).all()) {
          expect(await part.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).isIdentity)).toBe(true);
        }
      }
      const below = (await overlay.locator(".splash-map").boundingBox())!;
      await seekReturn(page, 450);
      const arriving = (await overlay.locator(".splash-map").boundingBox())!;
      expect(arriving.y).toBeLessThan(below.y);
      expect(arriving.y).toBeLessThan(900);
      await expect(page.locator("#climb")).toBeVisible();
      await expect(page.locator(".climb-list")).toBeHidden();
      await seekReturn(page, 900);
      await expect(page.locator(".climb-list")).toBeVisible();
      await expect(page.locator("#climb")).toBeHidden();
      expect(await page.evaluate(() => scrollY)).toBe(0);
      const overhead = (await overlay.locator(".splash-map").boundingBox())!;
      expect(overhead.x + overhead.width / 2).toBeCloseTo(width / 2, 0);
      expect(overhead.y + overhead.height / 2).toBeCloseTo(450, 0);
      await expect(overlay.locator(".splash-map")).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");
      await expect(overlay.locator(".splash-camera")).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");
      await seekReturn(page, 1400);
      expect(await overlay.locator(".splash-map").boundingBox()).toEqual(overhead);
      await seekReturn(page, 1800);
      const zoom = await overlay.locator(".splash-camera").evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a);
      expect(zoom).toBeGreaterThan(1);
      await seekReturn(page, 2340);
      await expect(overlay.locator(".splash-sheet")).toHaveCSS("opacity", "1");
      expect(await overlay.locator(".splash-sheet").evaluate((el) => getComputedStyle(el).backgroundColor))
        .toBe(await page.locator("body").evaluate((el) => getComputedStyle(el).backgroundColor));
      await expect(page.locator("#trailhead-title")).toHaveCSS("opacity", "0");
      await seekReturn(page, 2430);
      await expect(overlay.locator(".splash-world")).toBeHidden();
      expect(Number(await page.locator("#trailhead-title").evaluate((el) => getComputedStyle(el).opacity))).toBeGreaterThan(0);
      await expect(page.locator("#trailhead .trailhead-lead")).toHaveCSS("opacity", "0");
      await expect(page.locator("#trailhead .trailhead-portrait")).toHaveCSS("opacity", "0");
      await expect(page.locator(".site-header")).toHaveCSS("opacity", "1");
      await expect(page.locator(".site-header")).toHaveCSS("z-index", "60");
      await seekReturn(page, 3100);
      await expect(overlay).toHaveCount(0);
      await expect(page.locator("#trailhead-title")).toHaveCSS("opacity", "1");
      expect(await page.locator("#trailhead-title").evaluate((el) => el.getAnimations().length)).toBe(0);
      expect(await page.locator(".climb-stage").evaluate((el) => el.getAnimations().length)).toBe(0);
    });
  }
}

for (const width of [390, 1440]) {
  test(`natural Climb-to-List completion from mid-Ascent at ${width}px preserves the heading and scroll history`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("./");
    await enterClimb(page);
    await page.evaluate(() => window.scrollTo({ top: document.getElementById("climb")!.offsetHeight * 0.6, behavior: "instant" }));
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(1000);
    const climbScroll = await page.evaluate(() => scrollY);
    await page.evaluate(() => {
      const samples: number[] = [];
      Reflect.set(window, "returnHeading", samples);
      let started = false;
      const sample = () => {
        const overlay = document.querySelector(".splash--list");
        if (overlay) started = true;
        const heading = document.getElementById("trailhead-title")!;
        if (overlay && getComputedStyle(overlay.querySelector(".splash-world")!).visibility === "hidden") samples.push(Number(getComputedStyle(heading).opacity));
        if ((!started || overlay) && samples.length < 100) requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    await page.getByRole("button", { name: "List view", exact: true }).click();
    await expect(page.locator(".splash--list")).toHaveCount(1);
    await expect(page.locator(".splash--list")).toHaveCount(0, { timeout: 5000 });
    await expect(page.locator("#trailhead-title")).toBeInViewport();
    await expect(page.locator("#trailhead-title")).toHaveCSS("opacity", "1");
    const samples = await page.evaluate(() => Reflect.get(window, "returnHeading") as number[]);
    expect(samples.length).toBeGreaterThan(0);
    for (let i = 1; i < samples.length; i++) expect(samples[i] + 0.001).toBeGreaterThanOrEqual(samples[i - 1]);
    await expect(page.locator("#list-view")).toBeFocused();
    await page.getByRole("button", { name: "Climb view", exact: true }).click();
    await expect(page.locator("#climb")).toBeVisible();
    await expect.poll(() => page.evaluate(() => scrollY)).toBeCloseTo(climbScroll, -1);
    expect(errors).toEqual([]);
  });
}

for (const input of ["Escape", "pointer", "wheel", "touch", "resize", "motion"] as const) {
  test(`${input} dismisses a return into the finished List View`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, hasTouch: true });
    const page = await context.newPage();
    await page.addInitScript(() => sessionStorage.setItem("splash-seen", "1"));
    await page.goto("./");
    await enterClimb(page);
    await startPausedReturn(page);
    await seekReturn(page, 200);
    if (input === "Escape") await page.keyboard.press("Escape");
    else if (input === "pointer") await page.mouse.click(10, 200);
    else if (input === "wheel") await page.mouse.wheel(0, 1);
    else if (input === "touch") await page.touchscreen.tap(10, 200);
    else if (input === "resize") await page.setViewportSize({ width: 900, height: 700 });
    else await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page.locator(".splash--list")).toHaveCount(0);
    await expect(page.locator(".climb-list")).toBeVisible();
    await expect(page.locator("#trailhead-title")).toHaveCSS("opacity", "1");
    await expect(page.locator(".climb-stage")).toHaveCSS("translate", "none");
    await context.close();
  });
}

test("reduced motion returns directly to the List View landing page", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./");
  await page.getByRole("button", { name: "Climb view", exact: true }).click();
  await expect(page.locator("#climb")).toBeVisible();
  await page.getByRole("button", { name: "List view", exact: true }).click();
  await expect(page.locator(".splash--list")).toHaveCount(0);
  await expect(page.locator("#trailhead-title")).toBeInViewport();
  await expect(page.locator("#trailhead-title")).toHaveCSS("opacity", "1");
});

test("a camera failure after looking down still restores the complete List View", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await enterClimb(page);
  await page.evaluate(() => {
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (frames, timing) {
      if (this.classList.contains("splash-camera")) throw new Error("Simulated return camera failure");
      return animate.call(this, frames, timing);
    };
  });
  await startPausedReturn(page);
  await seekReturn(page, 900);
  await expect(page.locator(".splash--list")).toHaveCount(0);
  await expect(page.locator(".climb-list")).toBeVisible();
  await expect(page.locator("#trailhead-title")).toHaveCSS("opacity", "1");
  expect(errors).toEqual([]);
});

test("reversing the return and fragment navigation release the previous sequence", async ({ page }) => {
  await page.goto("./");
  await enterClimb(page);
  await startPausedReturn(page);
  await seekReturn(page, 1200);
  await page.getByRole("button", { name: "Climb view", exact: true }).click();
  await expect(page.locator(".splash--list")).toHaveCount(0);
  await expect(page.locator(".splash--climb")).toHaveCount(1);
  await seekTransition(page, 2600);
  await startPausedReturn(page);
  await seekReturn(page, 200);
  await page.evaluate(() => { location.hash = "#work"; });
  await expect(page.locator(".splash--list")).toHaveCount(0);
  await expect(page.locator("#work")).toBeInViewport();
});

test("returning with a Waypoint Panel open clears a prior Case Study target and lands at the hero", async ({ page }) => {
  await page.goto("./#case-veritas");
  await enterClimb(page);
  await page.getByRole("button", { name: "Go to Waypoint 01: MomentumX", exact: true }).click();
  await page.locator('[data-marker="2"]').click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await startPausedReturn(page);
  await seekReturn(page, 900);
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page).toHaveURL(/#list-view$/);
  expect(await page.locator("#trailhead-title").evaluate((el) => el.getClientRects().length)).toBeGreaterThan(0);
  await seekReturn(page, 3100);
  await expect(page.locator("#trailhead-title")).toBeInViewport();
  await expect(page.locator(".inline-case:target")).toHaveCount(0);
});
