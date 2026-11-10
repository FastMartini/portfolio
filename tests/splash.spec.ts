import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function seekIntro(page: Page, time: number) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => Reflect.get(document.querySelector(".splash")!, Symbol.for("portfolio.splash"))?.ready);
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
  await page.goto("./", { waitUntil: "domcontentloaded" });
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

test("reduced motion shows the homepage directly without trapping keyboard focus", async ({ page, browserName }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./", { waitUntil: "domcontentloaded" });
  const splash = page.locator(".splash");
  await expect(splash).toBeHidden();
  await expect(page.getByRole("button", { name: "Climb view", exact: true })).toBeVisible();
  await tabToLink(page, browserName);
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await expect(splash).toBeHidden();
});

test("the full intro exits naturally without console or hydration errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("./", { waitUntil: "domcontentloaded" });
  const splash = page.locator(".splash");
  await expect(splash).toBeVisible();
  await expect(splash.locator(".splash-greeting--paper")).toHaveText("Howdy, I\'m Diego:");
  await expect(splash.locator(".splash-hand")).toHaveCount(0);
  await expect(splash.locator(".wordmark-mark")).toHaveCount(0);
  await expect(splash).toBeHidden({ timeout: 5000 });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(errors).toEqual([]);
});

for (const reducedMotion of ["no-preference"] as const) {
  for (const input of ["pointer", "wheel", "touch"] as const) {
    test(`${input} input dismisses the ${reducedMotion} intro without blocking the page`, async ({ browser, baseURL }) => {
      const context = await browser.newContext({ baseURL, reducedMotion, hasTouch: true });
      const page = await context.newPage();
      await page.goto("./", { waitUntil: "domcontentloaded" });
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

test("reduced motion bypasses every opening effect before hydration", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/_next/static/**/*.js", (route) => route.abort());
  await page.goto("./", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".splash")).toHaveCSS("display", "none");
  await expect(page.locator("#trailhead-title")).toHaveCSS("opacity", "1");
  expect(await page.locator(".splash").evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
});

test("input dismisses the intro even when paint-driven transitions cannot advance", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("./", { waitUntil: "domcontentloaded" });
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
  await page.goto("./", { waitUntil: "domcontentloaded" });
  await page.addStyleTag({ content: ".splash { animation: none !important; }" });
  await expect(page.locator(".splash")).toBeVisible();
  await expect(page.locator(".splash")).toBeHidden({ timeout: 8000 });
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
  await page.goto("./", { waitUntil: "domcontentloaded" });
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

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`folded cover stays opaque over the inside print at ${viewport.width}px`, async ({ page, browserName }) => {
    test.skip(browserName === "webkit", "WebKit snapshots flatten 3D layers; projected geometry is covered separately.");
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("./", { waitUntil: "domcontentloaded" });
    for (const time of [0, 275, 350, 419]) {
      await seekIntro(page, time);
      const clip = (await page.locator(".splash-row--top .splash-pane .splash-face--back").boundingBox())!;
      const actual = await page.screenshot({ clip });
      // The cover must paint identically with or without the concealed panels.
      // Restrict comparison to cream cover pixels so exposed paper outside its
      // projected outline cannot count as bleed-through.
      const hidden = await page.addStyleTag({ content: ".splash-row--bottom,.splash-row--top > .splash-door { visibility:hidden!important; }" });
      const isolated = await page.screenshot({ clip });
      await hidden.evaluate((element) => element.parentNode?.removeChild(element));
      const leakingPixels = await page.evaluate(async ({ actual, isolated }) => {
        async function pixels(data: string) {
          const image = new Image(); image.src = `data:image/png;base64,${data}`; await image.decode();
          const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height;
          const ctx = canvas.getContext("2d")!; ctx.drawImage(image, 0, 0);
          return ctx.getImageData(0, 0, canvas.width, canvas.height);
        }
        const a = await pixels(actual), b = await pixels(isolated);
        const paper = (i: number) => b.data[i] > 180 && b.data[i + 1] > 170 && b.data[i + 2] > 130;
        let count = 0;
        for (let y = 2; y < b.height - 2; y++) for (let x = 2; x < b.width - 2; x++) {
          const i = (y * b.width + x) * 4;
          // Erode the mask by two pixels to exclude antialiased paper edges.
          if ([-2, 0, 2].every((dy) => [-2, 0, 2].every((dx) => paper(i + (dy * b.width + dx) * 4))) &&
            [0, 1, 2].some((channel) => Math.abs(a.data[i + channel] - b.data[i + channel]) > 30)) {
            // Hiding the lower layers can re-rasterize the cover's own glyphs.
            // Allow a two-pixel matching neighborhood, while new inside print
            // in a blank cover area must still fail (the original 177° bug).
            const sameCoverInk = [-2, -1, 0, 1, 2].some((dy) => [-2, -1, 0, 1, 2].some((dx) => {
              const j = i + (dy * b.width + dx) * 4;
              return [0, 1, 2].every((channel) => Math.abs(a.data[i + channel] - b.data[j + channel]) <= 30);
            }));
            if (!sameCoverInk) count++;
          }
        }
        return count;
      }, { actual: actual.toString("base64"), isolated: isolated.toString("base64") });
      expect(leakingPixels, `inside print showing through the cover at ${time}ms`).toBe(0);
    }
  });
}

for (const viewport of [
  { width: 320, height: 568 }, { width: 390, height: 844 },
  { width: 844, height: 390 }, { width: 768, height: 1024 },
  { width: 1024, height: 768 }, { width: 1440, height: 900 },
]) {
  test(`map opens and real heading reveals without a replacement at ${viewport.width}x${viewport.height}`, async ({ page, browserName }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("./", { waitUntil: "domcontentloaded" });
    await seekIntro(page, 470);
    const cover = (await page.locator(".splash-row--top .splash-pane .splash-face--back").boundingBox())!;
    const paneWidth = await page.locator(".splash-probe").evaluate((el) => (el as HTMLElement).offsetWidth);
    expect(cover.width).toBeGreaterThan(paneWidth * 1.15);
    await seekIntro(page, 1250);
    // WebKit's snapshotRect capture flattens 3D even in a minimal perspective
    // demo. Use Chromium for face paint and all engines for projected geometry.
    if (browserName === "chromium") {
      const face = (await page.locator(".splash-row--top .splash-door--l .splash-face--front").boundingBox())!;
      const sample = await page.screenshot({ clip: { x: face.x + face.width / 2 - 4, y: face.y + face.height / 3 - 4, width: 8, height: 8 } });
      const brightness = await page.evaluate(async (data) => {
        const image = new Image(); image.src = `data:image/png;base64,${data}`; await image.decode();
        const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height;
        const ctx = canvas.getContext("2d")!; ctx.drawImage(image, 0, 0);
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let sum = 0;
        for (let i = 0; i < pixels.length; i += 4) sum += (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
        return sum / (pixels.length / 4);
      }, sample.toString("base64"));
      expect(brightness).toBeGreaterThan(210);
    }
    await expect(page.locator(".splash-hand")).toHaveCount(0);
    await seekIntro(page, 3400);
    await expect(page.locator("#trailhead-title")).toBeVisible();
    await expect(page.locator(".splash-greeting--paper")).toBeHidden();
    await expect(page.locator(".splash-greeting--page")).toBeHidden();
    expect(await page.locator("#trailhead-title").evaluate((el) => getComputedStyle(el).fontFamily)).toContain("Newsreader");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await seekIntro(page, 3801);
    await expect(page.locator(".splash")).toBeHidden();
    await expect(page.locator(".climb-list")).toBeVisible();
    await expect(page.locator("#climb")).toBeHidden();
  });
}

for (const theme of ["light", "dark"] as const) {
  for (const width of [390, 1440]) {
    test(`${theme} headline stays painted through overlay cleanup at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript((theme) => localStorage.setItem("portfolio-theme", theme), theme);
      await page.goto("./", { waitUntil: "domcontentloaded" });
      await seekIntro(page, 3795);
      await expect(page.locator("#trailhead-title")).toHaveCSS("opacity", "1");
      await expect(page.locator(".splash-greeting--page")).toBeHidden();
      const clip = (await page.locator("#trailhead-title").boundingBox())!;
      const before = await page.screenshot({ clip });
      await seekIntro(page, 3805);
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
    await page.goto("./", { waitUntil: "domcontentloaded" });
    await seekIntro(page, 1200);
    if (input === "resize") await page.setViewportSize({ width: 900, height: 700 });
    else await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page.locator(".splash")).toBeHidden();
    await expect(page.locator("#trailhead-title")).toHaveCSS("opacity", "1");
    await expect(page.locator(".site-header")).toHaveCSS("opacity", "1");
  });
}

test("the controller waits for late Trailhead layout before framing the map", async ({ page }) => {
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
  await page.goto("./", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".splash")).toHaveAttribute("data-zoom", /"S"/);
  await seekIntro(page, 3400);
  await expect(page.locator("#trailhead-title")).toBeVisible();
});

for (const failure of ["getAnimations", "animate"] as const) {
  test(`${failure} failure leaves List View available without uncaught errors`, async ({ page }) => {
    await page.addInitScript((failure) => {
      if (failure === "getAnimations") Reflect.set(Element.prototype, "getAnimations", undefined);
      else {
        const animate = Element.prototype.animate;
        Element.prototype.animate = function (frames, timing) {
          if (this.classList.contains("site-header")) throw new Error("Simulated page animation failure");
          return animate.call(this, frames, timing);
        };
      }
    }, failure);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("./", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".splash")).toBeHidden();
    await expect(page.locator("#list-view")).toBeVisible();
    await expect(page.locator("#trailhead-title")).toHaveCSS("opacity", "1");
    await page.getByRole("link", { name: "Contact me" }).click();
    await expect(page).toHaveURL(/#summit$/);
    expect(errors).toEqual([]);
  });
}


test("without JavaScript the homepage and keyboard focus are immediately unobscured", async ({ browser, browserName, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, reducedMotion: "no-preference" });
  const page = await context.newPage();
  await page.goto("./", { waitUntil: "domcontentloaded" });
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
  await page.goto("./", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".splash")).toBeVisible();
  await expect(page.locator(".splash")).toBeHidden({ timeout: 5000 });
  await page.getByRole("link", { name: "View selected work" }).click();
  await expect(page).toHaveURL(/#momentumx$/);
});

for (const width of [390, 1440]) {
  test(`fully opened map holds for 650ms before expansion at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("./", { waitUntil: "domcontentloaded" });
    const pose = () => page.locator(".splash").evaluate((el) => Object.fromEntries(
      ["camera", "rig", "map", "row--top", "door--l", "door--r"].map((part) =>
        [part, Array.from(new DOMMatrix(getComputedStyle(el.querySelector(`.splash-${part}`)!).transform).toFloat64Array())])));
    await seekIntro(page, 1450);
    const opened = await pose();
    expect(opened.camera).toEqual([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    await seekIntro(page, 2100);
    const held = await pose();
    // CSS percentage-to-time conversion can leave sub-millionth-pixel residue.
    for (const part of Object.keys(opened)) held[part].forEach((value, i) => expect(value).toBeCloseTo(opened[part][i], 5));
    await seekIntro(page, 2400);
    expect((await pose()).camera).not.toEqual(opened.camera);
    // The paper is opaque and matches the actual page before the map is removed.
    await seekIntro(page, 3040);
    await expect(page.locator(".splash-sheet")).toHaveCSS("opacity", "1");
    expect(await page.locator(".splash-sheet").evaluate((el) => getComputedStyle(el).backgroundColor))
      .toBe(await page.locator("body").evaluate((el) => getComputedStyle(el).backgroundColor));
    await seekIntro(page, 3051);
    await expect(page.locator(".splash-world")).toBeHidden();
    expect(Number(await page.locator(".splash-sheet").evaluate((el) => getComputedStyle(el).opacity))).toBeGreaterThan(0.99);
    expect(Number(await page.locator("#trailhead-title").evaluate((el) => getComputedStyle(el).opacity))).toBeLessThan(0.01);
    await seekIntro(page, 3130);
    expect(Number(await page.locator("#trailhead-title").evaluate((el) => getComputedStyle(el).opacity))).toBeGreaterThan(0);
    await expect(page.locator("#trailhead .trailhead-lead")).toHaveCSS("opacity", "0");
    await expect(page.locator("#trailhead .trailhead-portrait")).toHaveCSS("opacity", "0");
  });
}

for (const theme of ["light", "dark"] as const) {
  for (const width of [390, 1440]) {
    test(`${theme} cold load at ${width}px has one continuous map-to-hero sequence with delayed assets`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript((theme) => {
        localStorage.setItem("portfolio-theme", theme);
        const samples: { t: number; heading: number; paper: number; world: string }[] = [];
        const starts: string[] = [];
        Reflect.set(window, "introProbe", { samples, starts });
        document.addEventListener("animationstart", (event) => {
          if ((event.target as Element).classList?.contains("splash")) starts.push(event.animationName);
        }, true);
        const sample = () => {
          const el = document.querySelector("body > .splash");
          const heading = document.getElementById("trailhead-title");
          const clock = el?.getAnimations().find((a) => a instanceof CSSAnimation && a.animationName === "splash-exit");
          if (el && heading && clock?.currentTime != null) samples.push({
            t: Number(clock.currentTime), heading: Number(getComputedStyle(heading).opacity),
            paper: Number(getComputedStyle(el.querySelector(".splash-sheet")!).opacity),
            world: getComputedStyle(el.querySelector(".splash-world")!).visibility,
          });
          if (samples.length < 900) requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      }, theme);
      await page.route("**/*.woff2", async (route) => { await new Promise((resolve) => setTimeout(resolve, 2200)); await route.continue(); });
      await page.route("**/_next/static/**/*.js", async (route) => { await new Promise((resolve) => setTimeout(resolve, 700)); await route.continue(); });
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto("./", { waitUntil: "domcontentloaded" });
      await expect(page.locator(".splash")).toBeHidden({ timeout: 10000 });
      await expect(page.locator("#trailhead-title")).toHaveCSS("opacity", "1");
      const probe = await page.evaluate(() => Reflect.get(window, "introProbe") as {
        starts: string[]; samples: { t: number; heading: number; paper: number; world: string }[];
      });
      expect(probe.starts).toEqual(["splash-exit"]);
      const hero = probe.samples.filter((s) => s.t >= 3050);
      expect(hero.length).toBeGreaterThan(5);
      for (let i = 1; i < hero.length; i++) expect(hero[i].heading + 0.001).toBeGreaterThanOrEqual(hero[i - 1].heading);
      expect(probe.samples.filter((s) => s.t < 3050 && s.world === "hidden" && s.paper < 0.999)).toEqual([]);
      expect(errors).toEqual([]);
    });
  }
}
