import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function seekIntro(page: Page, time: number) {
  await page.evaluate(() => document.fonts.ready);
  await page.locator(".splash").evaluate((element, time) => {
    for (const animation of element.getAnimations({ subtree: true })) {
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
  await expect(splash.locator(".splash-name-line")).toHaveText(["Diego", "Martinez"]);
  await expect(splash.locator(".splash-role")).toHaveText("Software engineer");
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
      await expect(page.locator(".climb-view-toggle")).toBeVisible();
      if (input === "pointer") {
        await page.getByRole("navigation", { name: "Primary navigation" })
          .getByRole("link", { name: "Work", exact: true }).click();
        if (reducedMotion === "reduce") await expect(page).toHaveURL(/#work$/);
        else await expect(page.locator("#climb")).toHaveAttribute("data-stop", "2");
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

test("reduced motion uses a still card and an opacity-only exit", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./");
  const splash = page.locator(".splash");
  await expect(splash).toBeVisible();
  await expect(splash.locator(".splash-climber")).toBeHidden();
  await expect(splash).toHaveCSS("transform", "none");
  for (const selector of [".splash-route-mask", ".splash-glyph", ".splash-flag-pole", ".splash-flag-cloth", ".splash-flag-flutter"]) {
    for (const element of await splash.locator(selector).all()) await expect(element).toHaveCSS("animation-name", "none");
  }
  await expect(splash).toBeHidden({ timeout: 3000 });
  await expect(splash).toHaveCSS("transform", "none");
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
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 844, height: 390 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
]) {
  test(`name, flag and summit stay visible without letter jitter at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("./");
    await seekIntro(page, 1200);
    const initialPositions = await page.locator(".splash-char").evaluateAll((letters) =>
      letters.map((letter) => letter.getBoundingClientRect().left));
    await seekIntro(page, 2700);
    expect(await page.locator(".splash-char").evaluateAll((letters) =>
      letters.map((letter) => letter.getBoundingClientRect().left))).toEqual(initialPositions);
    for (const selector of [".splash-name", ".splash-flag-cloth", ".splash-flag-pole", ".splash-summit-ring"]) {
      const box = await page.locator(selector).boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
    }
  });
}

test("the decorative intro reveals the usable homepage without JavaScript", async ({ browser, browserName, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, reducedMotion: "no-preference" });
  const page = await context.newPage();
  await page.goto("./");
  const splash = page.locator("body > .splash");
  await expect(splash).toBeVisible();
  await expect(splash).toHaveAttribute("aria-hidden", "true");
  await expect(splash).toHaveCSS("pointer-events", "none");
  await expect(splash.locator("a, button, input, select, textarea, [tabindex]")).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await tabToLink(page, browserName);
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await expect(splash).toBeHidden({ timeout: 5000 });
  await page.getByRole("link", { name: "View selected work" }).click();
  await expect(page).toHaveURL(/#momentumx$/);
  await context.close();
});
