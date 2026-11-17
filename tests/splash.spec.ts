import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { OPEN } from "../components/splash/controller";
import { holdOpening, imageDifference, seekIntro } from "./helpers/splash";

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

test("reduced-motion keyboard input reaches the finished page without trapping focus", async ({ page, browserName }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./");
  const splash = page.locator(".splash");
  await expect(splash).toBeHidden();
  await expect(page.getByRole("button", { name: "Climb view", exact: true })).toBeVisible();
  await tabToLink(page, browserName);
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
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
  await expect(splash.locator(".splash-pane")).toHaveCount(2);
  await expect(splash.locator(".splash-hand")).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Howdy, I'm Diego.");
  await expect(splash.locator(".wordmark-mark")).toHaveCount(0);
  await expect(splash).toBeHidden({ timeout: 9000 });
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
      if (reducedMotion === "no-preference") {
        await expect(splash).toBeVisible();
        await seekIntro(page, 1200);
      } else await expect(splash).toBeHidden();
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
      if (reducedMotion === "no-preference") await expect(splash).toHaveCSS("animation-name", "none", { timeout: 750 });
      await expect(splash).toBeHidden({ timeout: 750 });
      await context.close();
    });
  }
}

test("reduced motion shows the completed hero immediately", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./");
  await expect(page.locator("html")).toHaveAttribute("data-splash", "seen");
  await expect(page.locator(".splash")).toBeHidden();
  await expect(page.locator("#trailhead-title")).toHaveCSS("opacity", "1");
  await expect(page.locator("[data-paper-piece]")).toHaveCount(0);
  await expect(page.locator(".trailhead-trail").first()).toHaveCSS("stroke-dashoffset", "0px");
  expect(await page.locator("#trailhead").evaluate(el => el.getAnimations({ subtree: true }).length)).toBe(0);
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
  await expect(page.locator(".splash")).toBeHidden({ timeout: 9500 });
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
  { width: 320, height: 568 }, { width: 390, height: 844 }, { width: 844, height: 390 },
  { width: 768, height: 1024 }, { width: 1024, height: 768 }, { width: 1440, height: 900 },
]) {
  test(`map handling, blank paper and aligned greeting at ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
    if (testInfo.project.name === "webkit-adaptive") test.slow();
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await holdOpening(page);
    await page.goto("./");
    await seekIntro(page, 1400);
    const folded = await page.screenshot({ path: testInfo.outputPath("01-folded.png") });
    const cover = (await page.locator(".splash-row--top .splash-pane .splash-face--back").boundingBox())!;
    const coverCenter = { x: cover.x + cover.width * 0.1, y: cover.y + cover.height * 0.15, width: cover.width * 0.8, height: cover.height * 0.7 };
    const isolateCover = await page.addStyleTag({ content: ".splash-face:not(.splash-row--top .splash-pane .splash-face--back) { visibility: hidden !important; }" });
    const coverDifference = await imageDifference(page, folded, await page.screenshot(), coverCenter);
    expect(coverDifference.mean, "the folded packet's cover must paint above the inside legends").toBeLessThan(0.1);
    expect(coverDifference.changedRatio).toBeLessThan(0.001);
    await isolateCover.evaluate((style) => style.parentNode?.removeChild(style));
    await seekIntro(page, 3500);
    const unfolded = await page.screenshot({ path: testInfo.outputPath("02-unfolded.png") });
    // An open sheet must show its front print. This also catches WebKit painting
    // reversed covers/legends through backface-visibility during 3D folds.
    const hideBacks = await page.addStyleTag({ content: ".splash-face--back { visibility: hidden !important; }" });
    const faceDifference = await imageDifference(page, unfolded, await page.screenshot());
    await testInfo.attach("Unfolded face comparison", { body: JSON.stringify(faceDifference), contentType: "application/json" });
    // Permit tiny rasterisation differences when WebKit recomposes the layer.
    // Showing a reversed cover/legend changes a large part of the sheet.
    expect(faceDifference.mean, "reverse-side artwork must not paint on the unfolded map").toBeLessThan(0.1);
    expect(faceDifference.changedRatio).toBeLessThan(0.001);
    await hideBacks.evaluate((style) => style.parentNode?.removeChild(style));
    await expect(page.locator(".splash-hand")).toHaveCount(0);
    await seekIntro(page, 4420);
    await page.screenshot({ path: testInfo.outputPath("03-paper.png") });
    const panes = await page.locator(".splash-pane .splash-face--front").evaluateAll((faces) => faces.map((face) => {
      const box = face.getBoundingClientRect();
      return { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
    }));
    // Inspect the transformed paper itself, including the two joined rows.
    expect(Math.min(...panes.map((box) => box.left))).toBeLessThan(0);
    expect(Math.max(...panes.map((box) => box.right))).toBeGreaterThan(viewport.width);
    expect(Math.min(...panes.map((box) => box.top))).toBeLessThan(0);
    expect(Math.max(...panes.map((box) => box.bottom))).toBeGreaterThan(viewport.height);
    await seekIntro(page, 5800);
    const heading = page.locator("#trailhead-title");
    const box = await heading.boundingBox();
    for (const copy of ["paper", "page"]) expect(await page.locator(`.splash-greeting--${copy}`).boundingBox()).toEqual(box);
    await expect(heading).toHaveCSS("opacity", "0");
    await page.screenshot({ path: testInfo.outputPath("04-greeting.png") });
    await page.keyboard.press("Escape");
    expect(await heading.boundingBox()).toEqual(box);
    await expect(heading).toHaveCSS("opacity", "1");
    await expect(heading).toHaveCSS("animation-name", "none");
    await expect(page.locator(".climb-list")).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("05-trailhead.png") });
  });
}

test.describe("rendered map opening recordings", () => {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    test(`continuous opening at ${viewport.width}x${viewport.height}`, async ({ browser, baseURL }, testInfo) => {
      const context = await browser.newContext({ baseURL, viewport, reducedMotion: "no-preference", recordVideo: { dir: testInfo.outputPath("recording"), size: viewport } });
      const page = await context.newPage();
      await page.goto("./");
      await expect(page.locator(".splash")).toBeVisible();
      await expect(page.locator(".splash")).toBeHidden({ timeout: 9000 });
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Howdy, I'm Diego.");
      await expect(page.getByRole("heading", { level: 1 })).toHaveCSS("opacity", "1");
      await context.close();
      await page.video()!.saveAs(testInfo.outputPath("video.webm"));
      await testInfo.attach("Map opening", { path: testInfo.outputPath("video.webm"), contentType: "video/webm" });
    });
  }
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
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: "Work", exact: true }).click();
  await expect(page).toHaveURL(/#work$/);
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
  await expect(page.locator(".splash")).toBeHidden({ timeout: 9000 });
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: "Work", exact: true }).click();
  await expect(page).toHaveURL(/#work$/);
});


test("live reduced motion hides the opening before client hydration", async ({ page }) => {
  await page.route("**/_next/static/**/*.js", route => route.abort());
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("./");
  await expect(page.locator(".splash")).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(() => page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
  await expect(page.locator(".splash")).toBeHidden();
});

test("switching to reduced motion during the zoom restores the reading view immediately", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await holdOpening(page);
  await page.goto("./");
  await expect(page.locator(".climb-view-toggle")).toBeVisible();
  await seekIntro(page, 4050);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".splash")).toBeHidden({ timeout: 750 });
  await expect(page.getByRole("heading", { level: 1 })).toHaveCSS("opacity", "1");
  await expect(page.locator(".climb-list")).toBeVisible();
});

for (const motion of ["no-preference"] as const) {
for (const theme of ["light", "dark"] as const) {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
    test(`${theme} ${motion} heading swaps in one frame at ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: motion });
      const swap = OPEN.swap;
      await page.addInitScript((theme) => localStorage.setItem("portfolio-theme", theme), theme);
      await page.goto("./");
      await seekIntro(page, swap - 5);
      const heading = page.locator("#trailhead-title");
      await expect(heading).toHaveCSS("opacity", "0");
      await expect(page.locator(".splash-greeting--page")).toHaveCSS("visibility", "visible");
      const box = (await heading.boundingBox())!;
      const clip = { x: Math.floor(box.x), y: Math.floor(box.y), width: Math.ceil(box.width), height: Math.ceil(box.height) };
      const before = await page.screenshot();
      await seekIntro(page, swap + 5);
      await expect(heading).toHaveCSS("opacity", "1");
      await expect(page.locator(".splash-greeting--page")).toHaveCSS("visibility", "hidden");
      const after = await page.screenshot();
      const difference = await page.evaluate(async ({ before, after, clip, viewport }) => {
        const read = async (png: string) => {
          const image = new Image(); image.src = `data:image/png;base64,${png}`; await image.decode();
          const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height;
          const ctx = canvas.getContext("2d")!; ctx.drawImage(image, 0, 0);
          const scale = image.width / viewport.width;
          return ctx.getImageData(Math.round(clip.x * scale), Math.round(clip.y * scale), Math.round(clip.width * scale), Math.round(clip.height * scale)).data;
        };
        const a = await read(before), b = await read(after);
        let max = 0, total = 0;
        for (let i = 0; i < a.length; i++) {
          const delta = Math.abs(a[i] - b[i]); max = Math.max(max, delta); total += delta;
        }
        return { max, mean: total / a.length };
      }, { before: before.toString("base64"), after: after.toString("base64"), clip, viewport });
      await testInfo.attach("Before heading swap", { body: before, contentType: "image/png" });
      await testInfo.attach("After heading swap", { body: after, contentType: "image/png" });
      // Permit subpixel rounding of the deboss while rejecting any heading jump.
      expect(difference.max).toBeLessThanOrEqual(3);
      expect(difference.mean).toBeLessThan(0.1);
      await seekIntro(page, OPEN.end - 1);
      await page.keyboard.press("Escape");
      await expect(page.locator("body > .splash")).toBeHidden();
      await expect(page.locator("html")).toHaveAttribute("data-splash", "seen");
    });
  }
}
}
