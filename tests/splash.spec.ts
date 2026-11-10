import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function seekIntro(page: Page, time: number) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => Boolean(Reflect.get(document.querySelector(".splash")!, Symbol.for("portfolio.splash"))));
  await page.locator("body > .splash").evaluate((element, time) => {
    const controller = Reflect.get(element, Symbol.for("portfolio.splash"));
    controller?.holdFailsafe();
    for (const animation of [...element.getAnimations({ subtree: true }).filter((a) => a instanceof CSSAnimation), ...controller.animations]) {
      animation.pause();
      animation.currentTime = time;
    }
  }, time);
}

async function tabToLink(page: Page, browserName: string) {
  // Safari on macOS uses Option+Tab for links when full keyboard access is off.
  await page.keyboard.press(browserName === "webkit" && process.platform === "darwin" ? "Alt+Tab" : "Tab");
}

test("repeat visits skip the intro even when the first visit reloads before it finishes", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("./");
  await expect(page.locator(".splash")).toBeVisible();
  await page.reload();
  await expect(page.locator(".splash")).toHaveCSS("display", "none");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

for (const destination of ["./#work", "./#case-veritas", "./work/veritas/"]) {
  test(`direct reading links skip the intro: ${destination}`, async ({ page }) => {
    await page.goto(destination);
    await expect(page.locator(".splash")).toHaveCSS("display", "none");
    if (destination === "./#case-veritas") await expect(page.locator("#case-veritas")).toBeVisible();
    else await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
}

test("reduced-motion keyboard input stops the intro without trapping focus", async ({ page, browserName }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./");
  const splash = page.locator(".splash");
  await expect(splash).toBeVisible();
  await seekIntro(page, 1200);
  await expect(page.getByRole("button", { name: "Climb view", exact: true })).toBeVisible();
  await tabToLink(page, browserName);
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await expect(splash).toHaveCSS("animation-name", "none", { timeout: 750 });
  await expect(splash).toBeHidden({ timeout: 750 });
});

test("the full intro exits naturally without console or hydration errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("./");
  const splash = page.locator(".splash");
  await expect(splash).toBeVisible();
  await expect(splash.locator(".splash-greeting--paper")).toHaveText("Howdy, I\'m Diego:");
  await expect(splash.locator(".splash-hand")).toHaveCount(2);
  await expect(splash.locator(".wordmark-mark")).toHaveCount(0);
  await expect(splash).toBeHidden({ timeout: 5000 });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(errors).toEqual([]);
});

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  for (const input of ["pointer", "wheel", "touch"] as const) {
    test(`${input} input dismisses the ${reducedMotion} intro without blocking the page`, async ({ browser, baseURL }) => {
      const context = await browser.newContext({ baseURL, reducedMotion, hasTouch: true });
      const page = await context.newPage();
      await page.goto("./");
      const splash = page.locator(".splash");
      await expect(splash).toBeVisible();
      // Input must interrupt an active intro, even if navigation setup is slow.
      await seekIntro(page, 1200);
      await expect(page.locator(".climb-view-toggle")).toBeVisible();
      if (input === "pointer") {
        await page.getByRole("navigation", { name: "Primary navigation" })
          .getByRole("link", { name: "Work", exact: true }).click();
        await expect(page).toHaveURL(/#work$/);
      } else if (input === "wheel") {
        const before = await page.evaluate(() => scrollY);
        await page.mouse.wheel(0, 400);
        await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before);
      } else {
        await page.touchscreen.tap(20, 400);
      }
      await expect(splash).toHaveCSS("animation-name", "none", { timeout: 750 });
      await expect(splash).toBeHidden({ timeout: 750 });
      await context.close();
    });
  }
}

test("reduced motion uses a still greeting and opacity-only page formation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./");
  const splash = page.locator(".splash");
  await expect(splash).toBeVisible();
  await expect(splash.locator(".splash-world")).toBeHidden();
  await expect(splash).toHaveCSS("transform", "none");
  for (const selector of [".splash-word"]) {
    for (const element of await splash.locator(selector).all()) await expect(element).toHaveCSS("animation-name", "none");
  }
  await expect(splash).toBeHidden({ timeout: 3000 });
  await expect(splash).toHaveCSS("transform", "none");
});

test("input dismisses the intro even when paint-driven transitions cannot advance", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("./");
  const splash = page.locator(".splash");
  await expect(splash).toBeVisible();
  await seekIntro(page, 1200);
  await expect(page.locator(".climb-view-toggle")).toBeVisible();
  await page.evaluate(() => {
    window.addEventListener("keydown", () => {
      const element = document.querySelector<HTMLElement>(".splash")!;
      // Model WebKit delivering input while its paint/transition clock stalls.
      void getComputedStyle(element).visibility;
      element.getAnimations().forEach((animation) => {
        if (animation instanceof CSSTransition) {
          animation.pause();
          animation.currentTime = 0;
        }
      });
    }, { once: true });
  });
  await page.keyboard.press("Escape");
  await expect(splash).toHaveClass(/splash--skipped/);
  await expect(splash).toBeHidden({ timeout: 750 });
});

test("the failsafe dismisses the intro if its CSS animation cannot complete", async ({ page }) => {
  await page.goto("./");
  await page.addStyleTag({ content: ".splash { animation: none !important; }" });
  await expect(page.locator(".splash")).toBeVisible();
  await expect(page.locator(".splash")).toBeHidden({ timeout: 6000 });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("blocked session storage cannot break the intro, skipping or deep links", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "sessionStorage", {
      get() { throw new DOMException("Storage is blocked", "SecurityError"); },
      configurable: true,
    });
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await expect(page.locator(".splash")).toBeVisible();
  await seekIntro(page, 1200);
  await expect(page.locator(".climb-view-toggle")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".splash")).toBeHidden({ timeout: 750 });
  await page.goto("./#work");
  await expect(page.locator(".splash")).toBeHidden();
  // A hash change alone stays in the current document; reload to exercise the
  // pre-paint gate on an actual deep-link page load with storage still blocked.
  await page.reload();
  await expect(page.locator(".splash")).toHaveCSS("display", "none");
  expect(errors).toEqual([]);
});

for (const viewport of [
  { width: 320, height: 568 }, { width: 390, height: 844 },
  { width: 844, height: 390 }, { width: 768, height: 1024 },
  { width: 1024, height: 768 }, { width: 1440, height: 900 },
]) {
  test(`map opens and greeting matches the real heading at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("./");
    await seekIntro(page, 1250);
    for (const side of ["l", "r"]) {
      const hand = await page.locator(`.splash-hand--${side}`).boundingBox();
      expect(hand!.x).toBeLessThan(viewport.width);
      expect(hand!.x + hand!.width).toBeGreaterThan(0);
    }
    await seekIntro(page, 3000);
    const heading = await page.locator("#trailhead-title").boundingBox();
    for (const copy of ["paper", "page"]) {
      const greeting = page.locator(`.splash-greeting--${copy}`);
      expect(await greeting.boundingBox()).toEqual(heading);
      expect(await greeting.evaluate((el) => getComputedStyle(el).fontFamily)).toContain("Newsreader");
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await seekIntro(page, 4401);
    await expect(page.locator(".splash")).toBeHidden();
    await expect(page.locator(".climb-list")).toBeVisible();
    await expect(page.locator("#climb")).toBeHidden();
  });
}

for (const theme of ["light", "dark"] as const) {
  for (const width of [390, 1440]) {
    test(`${theme} greeting swaps once without a pixel jump at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript((theme) => localStorage.setItem("portfolio-theme", theme), theme);
      await page.goto("./");
      await seekIntro(page, 3955);
      await expect(page.locator("#trailhead-title")).toHaveCSS("opacity", "0");
      await expect(page.locator(".splash-greeting--page")).toHaveCSS("visibility", "visible");
      const clip = (await page.locator("#trailhead-title").boundingBox())!;
      const before = await page.screenshot({ clip });
      await seekIntro(page, 3965);
      await expect(page.locator("#trailhead-title")).toHaveCSS("opacity", "1");
      await expect(page.locator(".splash-greeting--page")).toHaveCSS("visibility", "hidden");
      const after = await page.screenshot({ clip });
      const difference = await page.evaluate(async ({ before, after }) => {
        async function pixels(data: string) {
          const image = new Image(); image.src = `data:image/png;base64,${data}`; await image.decode();
          const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height;
          const ctx = canvas.getContext("2d")!; ctx.drawImage(image, 0, 0);
          return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        }
        const a = await pixels(before), b = await pixels(after);
        return a.reduce((max, value, i) => Math.max(max, Math.abs(value - b[i])), 0);
      }, { before: before.toString("base64"), after: after.toString("base64") });
      expect(difference).toBeLessThanOrEqual(1);
    });
  }
}

for (const input of ["resize", "motion"] as const) {
  test(`${input} change dismisses the opening and restores all page animation styles`, async ({ page }) => {
    await page.goto("./");
    await seekIntro(page, 1200);
    if (input === "resize") await page.setViewportSize({ width: 900, height: 700 });
    else await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page.locator(".splash")).toBeHidden();
    await expect(page.locator("#trailhead-title")).toHaveCSS("opacity", "1");
    await expect(page.locator(".site-header")).toHaveCSS("opacity", "1");
  });
}

test("the controller waits for late Trailhead layout before measuring the greeting", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLElement.prototype.getClientRects;
    let firstMeasurement = 0;
    HTMLElement.prototype.getClientRects = function () {
      if (this.id === "trailhead-title") {
        firstMeasurement ||= performance.now();
        if (performance.now() - firstMeasurement < 600) return document.createRange().getClientRects();
      }
      return original.call(this);
    };
  });
  await page.goto("./");
  await expect(page.locator(".splash-greeting--page")).toHaveAttribute("data-aligned", "");
  await seekIntro(page, 3000);
  expect(await page.locator(".splash-greeting--page").boundingBox()).toEqual(await page.locator("#trailhead-title").boundingBox());
});

test("missing animation APIs leave List View available without uncaught errors", async ({ page }) => {
  await page.addInitScript(() => { Reflect.set(Element.prototype, "getAnimations", undefined); });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await expect(page.locator(".splash")).toBeHidden();
  await expect(page.locator("#list-view")).toBeVisible();
  await page.getByRole("link", { name: "Contact me" }).click();
  await expect(page).toHaveURL(/#summit$/);
  expect(errors).toEqual([]);
});


test("without JavaScript the homepage and keyboard focus are immediately unobscured", async ({ browser, browserName, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, reducedMotion: "no-preference" });
  const page = await context.newPage();
  await page.goto("./");
  const splash = page.locator("body > .splash");
  await expect(splash).toHaveCSS("display", "none");
  await expect(splash).toHaveAttribute("aria-hidden", "true");
  await expect(splash).toHaveCSS("pointer-events", "none");
  await expect(splash.locator("a, button, input, select, textarea, [tabindex]")).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await tabToLink(page, browserName);
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeInViewport();
  await page.getByRole("link", { name: "View selected work" }).click();
  await expect(page).toHaveURL(/#momentumx$/);
  await context.close();
});

for (const destination of ["./#case-veritas", "./work/veritas/"]) {
  test(`without JavaScript reading entry and keyboard focus are unobscured: ${destination}`, async ({ browser, browserName, baseURL }) => {
    const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto(destination);
    await expect(page.locator(".splash")).toHaveCSS("display", "none");
    const standalone = destination.includes("/work/");
    if (standalone) await expect(page.getByRole("heading", { level: 1 })).toHaveText("Veritas");
    else await expect(page.locator("#case-veritas")).toBeVisible();
    await tabToLink(page, browserName);
    // Native fragment navigation starts Tab at the targeted inline Case Study;
    // a standalone route starts at its skip link. Both must show visible focus.
    const focused = page.getByRole("link", { name: standalone ? "Skip to Case Study" : "← Back to selected work", exact: true });
    await expect(focused).toBeFocused();
    await expect(focused).toBeInViewport();
    expect(await focused.evaluate((link) => getComputedStyle(link).outlineStyle)).toBe("solid");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(standalone ? /#case-study-content$/ : /#veritas$/);
    await expect(page.locator(".splash")).toHaveCSS("display", "none");
    await context.close();
  });
}

test("an eligible intro still exits in CSS when client bundles cannot hydrate", async ({ page }) => {
  await page.route("**/_next/static/**/*.js", (route) => route.abort());
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("./");
  await expect(page.locator(".splash")).toBeVisible();
  await expect(page.locator(".splash")).toBeHidden({ timeout: 5000 });
  await page.getByRole("link", { name: "View selected work" }).click();
  await expect(page).toHaveURL(/#momentumx$/);
});
