import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { enterClimb, scrollToClimbStop } from "./helpers/climb";

async function audioProbe(page: Page) {
  await page.addInitScript(() => {
    Reflect.set(window, "aboutNotes", 0); Reflect.set(window, "aboutContexts", 0);
    const Native = window.AudioContext;
    window.AudioContext = class extends Native { constructor(options?: AudioContextOptions) { super(options); Reflect.set(window, "aboutContexts", Reflect.get(window, "aboutContexts") + 1); } };
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args) { Reflect.set(window, "aboutNotes", Reflect.get(window, "aboutNotes") + 1); return Reflect.apply(start, this, args); };
  });
}
async function aboutContour(page: Page) {
  await page.locator("#about").evaluate(el => { const rect = el.getBoundingClientRect(); window.scrollTo(0, scrollY + rect.bottom - innerHeight + 10); });
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator(".about-pitch--teacher")).toHaveClass(/is-shown/);
  await expect(page.locator(".about-pitch--teacher")).toHaveCSS("opacity", "1");
  await expect(page.locator(".about-pitch--teacher")).toHaveCSS("transform", "none");
  await page.mouse.move(12, 740);
  await expect(page.locator("#about .hero-strings")).toHaveCount(1);
  return page.locator("#about .hero-strings").evaluate((canvas: HTMLCanvasElement) => {
    const r = canvas.getBoundingClientRect(), data = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height).data;
    const scale = canvas.width / r.width;
    const rings = [...document.querySelectorAll(".photo-ring")].map(el => el.getBoundingClientRect());
    for (let y = 150; y < innerHeight - 8; y += 3) for (let x = 20; x < innerWidth - 20; x += 2) {
      const hit = document.elementFromPoint(x, y);
      if (rings.some(r => x > r.left - 30 && x < r.right + 30 && y > r.top - 30 && y < r.bottom + 30)) continue;
      if (!hit?.closest(".about") || hit.closest(".photo-ring, a, button, .journey-trail")) continue;
      if (data[(Math.floor((y - r.top) * scale) * canvas.width + Math.floor((x - r.left) * scale)) * 4 + 3] > 3) return { x, y };
    }
    throw new Error("No unobstructed About contour in viewport");
  });
}
for (const width of [390, 1440]) {
  test(`About contours and braid share click-only sound and mute at ${width}px`, async ({ browser, browserName, baseURL }) => {
    if (browserName === "webkit") test.slow();
    const context = await browser.newContext({ baseURL, hasTouch: true, viewport: { width, height: 900 } });
    const page = await context.newPage(); await audioProbe(page); await page.goto("./#about");
    const point = await aboutContour(page), notes = () => page.evaluate(() => Reflect.get(window, "aboutNotes"));
    await page.mouse.move(point.x - 15, point.y - 20); await page.mouse.move(point.x + 15, point.y + 20, { steps: 8 });
    expect(await notes()).toBe(0); expect(await page.evaluate(() => Reflect.get(window, "aboutContexts"))).toBe(0);
    await page.touchscreen.tap(point.x, point.y); await expect.poll(notes).toBeGreaterThan(0);
    const played = await notes();
    await page.getByRole("button", { name: "Guitar sound", exact: true }).click();
    await page.touchscreen.tap(point.x, point.y); expect(await notes()).toBe(played);
    await page.getByRole("button", { name: "Guitar sound", exact: true }).click();
    await page.locator(".about-pitch--design").scrollIntoViewIfNeeded();
    // Let the shared trail reveal the complete braid before hit-testing it.
    await page.locator(".braid-string-hit").evaluate((path: SVGPathElement) => {
      const point = path.getPointAtLength(path.getTotalLength() * 0.65).matrixTransform(path.getScreenCTM()!);
      window.scrollTo(0, scrollY + point.y - innerHeight * 0.35);
    });
    const braid = page.locator(".braid-string-hit");
    await expect(braid).toHaveCSS("pointer-events", "stroke");
    const target = await braid.evaluate((path: SVGPathElement) => {
      const matrix = path.getScreenCTM()!;
      for (let i = 10; i < 90; i++) { const p = path.getPointAtLength(path.getTotalLength() * i / 100).matrixTransform(matrix); if (p.x > 10 && p.x < innerWidth - 10 && p.y > 130 && p.y < innerHeight - 20 && document.elementFromPoint(p.x, p.y) === path) return { x: p.x, y: p.y }; }
      return null;
    });
    expect(target).not.toBeNull();
    await page.mouse.move(target!.x, target!.y); expect(await notes()).toBe(played);
    await page.mouse.down(); await page.mouse.move(target!.x + 40, target!.y); await page.mouse.move(target!.x, target!.y); await page.mouse.up(); expect(await notes()).toBe(played);
    await page.mouse.click(target!.x, target!.y); await expect.poll(notes).toBeGreaterThan(played);
    await context.close();
  });

  test(`ring drag, side tap, horizontal wheel and reduced-motion snapping at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 }); await audioProbe(page); await page.goto("./#about");
    const ring = page.getByRole("region", { name: "Hackathon projects" }), stage = ring.locator(".ring-stage");
    await stage.scrollIntoViewIfNeeded();
    const bounds = (await stage.boundingBox())!;
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + 110); await page.mouse.down();
    await page.mouse.move(bounds.x + bounds.width / 2 - 180, bounds.y + 110, { steps: 12 }); await page.mouse.up();
    await expect.poll(() => ring.locator(".ring-text").textContent()).not.toContain("MomentumX");
    expect(await page.evaluate(() => Reflect.get(window, "aboutNotes"))).toBe(0);
    await ring.getByRole("button", { name: "Show project 1: MomentumX" }).click();
    await expect.poll(() => ring.locator(".ring-card").first().evaluate(el => getComputedStyle(el).filter)).toBe("none");
    if (width > 900) {
      const side = await ring.locator(".ring-card").nth(1).boundingBox();
      await page.mouse.click(side!.x + side!.width / 2, side!.y + side!.height / 2);
      await expect(ring.locator(".ring-text")).toContainText("MedVoyage");
    }
    await stage.hover(); await page.mouse.wheel(320, 0);
    await expect.poll(() => ring.locator(".ring-card[aria-hidden='false']").evaluate(el => getComputedStyle(el).filter)).toBe("none");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await ring.getByRole("button", { name: "Show project 5: Grassroots" }).click();
    await expect(ring.locator(".ring-count")).toHaveText("05 / 05");
    await expect(ring.locator(".ring-card").last()).toHaveCSS("filter", "none");
    await expect(page.locator(".hero-strings")).toHaveCount(0);
    const before = await page.evaluate(() => scrollY);
    const prevented = await stage.evaluate(el => !el.dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: 100 })));
    expect(prevented).toBe(false); expect(await page.evaluate(() => scrollY)).toBe(before);
  });
}

test("About mobile native scroll gestures stay silent, and a following tap still plays", async ({ browserName, browser, baseURL }) => {
  test.skip(browserName !== "chromium", "Native touch input uses Chromium's CDP; cancellation remains covered across engines.");
  const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 900 }, hasTouch: true, isMobile: true });
  const page = await context.newPage(); await audioProbe(page); await page.goto("./#about");
  const point = await aboutContour(page), session = await context.newCDPSession(page), before = await page.evaluate(() => scrollY);
  await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: point.x, y: point.y }] });
  for (let i = 1; i <= 6; i++) await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: point.x, y: point.y - 25 * i }] });
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before + 50);
  expect(await page.evaluate(() => Reflect.get(window, "aboutNotes"))).toBe(0);
  const tap = await aboutContour(page); await page.touchscreen.tap(tap.x, tap.y);
  await expect.poll(() => page.evaluate(() => Reflect.get(window, "aboutNotes"))).toBeGreaterThan(0);
  await context.close();
});

for (const theme of ["light", "dark"] as const) test(`About and Base camp retain legibility and accessible controls in ${theme}`, async ({ page }) => {
  await page.addInitScript(theme => localStorage.setItem("portfolio-theme", theme), theme);
  await page.emulateMedia({ reducedMotion: "reduce" }); await page.goto("./#about");
  await expect(page.locator("#about")).toHaveCSS("background-color", theme === "light" ? "rgb(23, 63, 53)" : "rgb(18, 49, 41)");
  const results = await new AxeBuilder({ page }).include("#about").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(results.violations).toEqual([]);
  await enterClimb(page); await scrollToClimbStop(page, 1);
  const baseCamp = await new AxeBuilder({ page }).include('[data-card="1"]').withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(baseCamp.violations).toEqual([]);
});

test("gentle List View wheel scrolling scales notches and yields immediately to keyboard input", async ({ page }) => {
  await page.goto("./#trailhead"); await expect(page.locator("#main-content")).toHaveClass(/has-journey-trail/);
  await page.mouse.move(500, 500); await page.mouse.wheel(0, 400);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(180);
  await expect.poll(() => page.evaluate(() => Math.abs(scrollY - 220))).toBeLessThan(3);
  await page.mouse.wheel(0, 1200); await page.keyboard.press("Shift");
  const stopped = await page.evaluate(() => scrollY);
  await page.waitForTimeout(250); expect(await page.evaluate(() => scrollY)).toBe(stopped);
});

test("ring front cards stay at z=0 and native resolution on a DPR 2 display", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, deviceScaleFactor: 2, viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await context.newPage(); await page.goto("./#about");
  const ring = page.getByRole("region", { name: "Hackathon projects" });
  await expect(ring).toHaveAttribute("data-ring-ready", "true");
  const dimensions = await ring.locator(".ring-card").first().evaluate(el => {
    const card = el as HTMLElement, ring = el.parentElement!, image = el.querySelector("img")!;
    const front = card.getBoundingClientRect();
    return { scale: front.width / card.offsetWidth, z: new DOMMatrix(getComputedStyle(card).transform).m43 + new DOMMatrix(getComputedStyle(ring).transform).m43, filter: getComputedStyle(card).filter, enlargement: image.getBoundingClientRect().width / Number(image.getAttribute("width")), dpr: devicePixelRatio };
  });
  expect(dimensions.dpr).toBe(2); expect(dimensions.scale).toBeCloseTo(1, 3); expect(dimensions.z).toBe(0); expect(dimensions.filter).toBe("none"); expect(dimensions.enlargement).toBeLessThanOrEqual(1.35);
  await context.close();
});

test("the first held touch on About plays without a hover or a previous About canvas", async ({ browserName, browser, baseURL }) => {
  test.skip(browserName !== "chromium", "A real held touch uses Chromium's CDP input.");
  const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 900 }, hasTouch: true, isMobile: true });
  const page = await context.newPage(); await audioProbe(page); await page.goto("./#about");
  await page.evaluate(() => document.fonts.ready);
  await page.locator("#about").evaluate(el => window.scrollTo(0, scrollY + el.getBoundingClientRect().bottom - innerHeight + 10));
  await expect(page.locator(".about-pitch--teacher")).toHaveClass(/is-shown/);
  await expect(page.locator(".about-pitch--teacher")).toHaveCSS("transform", "none");
  const point = await page.evaluate(async () => {
    const layer = document.querySelector(".about-contours")!;
    const source = /url\(["']?(.*?)["']?\)/.exec(getComputedStyle(layer).maskImage)![1];
    const sourceSvg = new DOMParser().parseFromString(await fetch(source).then(r => r.text()), "image/svg+xml").documentElement;
    sourceSvg.setAttribute("style", "position:fixed;left:-9999px;top:0;width:100px;height:100px"); document.body.append(sourceSvg);
    const about = document.querySelector("#about")!.getBoundingClientRect(), scale = about.width / 1440;
    const rings = [...document.querySelectorAll(".photo-ring")].map(el => el.getBoundingClientRect());
    for (const path of sourceSvg.querySelectorAll("path")) for (let i = 0; i <= 400; i++) {
      const p = path.getPointAtLength(path.getTotalLength() * i / 400), point = { x: about.left + p.x * scale, y: about.bottom - (700 - p.y) * scale };
      if (point.x < 20 || point.x > innerWidth - 20 || point.y < 130 || point.y > innerHeight - 10) continue;
      if (rings.some(r => point.x > r.left - 30 && point.x < r.right + 30 && point.y > r.top - 30 && point.y < r.bottom + 30)) continue;
      sourceSvg.remove(); return point;
    }
    sourceSvg.remove(); return null;
  });
  expect(point).not.toBeNull(); await expect(page.locator("#about .hero-strings")).toHaveCount(0);
  const session = await context.newCDPSession(page);
  await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point!] });
  // Allow the canvas's first ResizeObserver notification to run before release.
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => Reflect.get(window, "aboutNotes"))).toBe(0);
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect.poll(() => page.evaluate(() => Reflect.get(window, "aboutNotes"))).toBeGreaterThan(0);
  await context.close();
});
