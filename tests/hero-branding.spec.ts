import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { OPEN } from "../components/splash/controller";
import { BRAND } from "../components/hero/brand";
import { seekIntro } from "./helpers/splash";

for (const theme of ["light", "dark"] as const) {
  for (const width of [1440, 390]) {
    test(`deboss is pressed in and set while hot during both presses in ${theme} at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(theme => localStorage.setItem("portfolio-theme", theme), theme);
      await page.goto("./");
      for (const [line, press] of BRAND.presses.entries()) {
        // Mid-stroke the cut is still deepening, so it must not match the settled edges yet.
        await seekIntro(page, OPEN.greeting + press + 60);
        const copy = page.locator(".splash-greeting--paper");
        const settled = await copy.evaluate(el => getComputedStyle(el).textShadow.split(/,(?![^()]*\))/).slice(0, 2));
        const pressing = await copy.locator(".trailhead-title-line").nth(line).locator(".hero-reveal-letter").first()
          .evaluate(el => getComputedStyle(el).textShadow.split(/,(?![^()]*\))/).slice(0, 2));
        expect(pressing, `line ${line}, 60ms after contact`).not.toEqual(settled);
        // From the relax onward the cut sits exactly on --brand-deboss, while the glow is still running.
        for (const elapsed of [320, 600, 1000]) {
          await seekIntro(page, OPEN.greeting + press + elapsed);
          for (const surface of ["paper", "page"]) {
            const copy = page.locator(`.splash-greeting--${surface}`);
            // Compare the actual cut edges to the settled surface, while the
            // hot glow and cooling sweep are still running on the letters.
            const expected = await copy.evaluate(el => getComputedStyle(el).textShadow.split(/,(?![^()]*\))/).slice(0, 2));
            const edges = await copy.locator(".trailhead-title-line").nth(line).locator(".hero-reveal-letter").evaluateAll(letters =>
              letters.map(el => getComputedStyle(el).textShadow.split(/,(?![^()]*\))/).slice(0, 2)));
            for (const edge of edges) expect(edge, `${surface}, line ${line}, ${elapsed}ms after contact`).toEqual(expected);
          }
        }
      }
    });
  }
}

async function probeAudio(page: Page) {
  await page.addInitScript(() => {
    Reflect.set(window, "guitarNotes", 0);
    Reflect.set(window, "guitarContexts", []);
    const Native = window.AudioContext;
    window.AudioContext = class extends Native {
      constructor(options?: AudioContextOptions) {
        super(options); Reflect.get(window, "guitarContexts").push(this);
      }
    };
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args) {
      Reflect.set(window, "guitarNotes", Reflect.get(window, "guitarNotes") + 1);
      return Reflect.apply(start, this, args);
    };
  });
}

// Sample a visible contour in open paper, clear of the copy and action row.
async function contourPoint(page: Page) {
  return page.locator(".hero-strings").evaluate(canvas => {
    const c = canvas as HTMLCanvasElement, box = c.getBoundingClientRect();
    const data = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
    const sx = c.width / box.width, sy = c.height / box.height;
    for (let y = 620; y < 800; y += 2) for (let x = box.width - 150; x < box.width - 20; x++) {
      if (data[(Math.floor(y * sy) * c.width + Math.floor(x * sx)) * 4 + 3] > 5) return { x: x + box.left, y: y + box.top };
    }
    throw new Error("No contour found in the interaction area");
  });
}

for (const width of [1440, 390]) {
  test(`Branding iron is the default and finishes on paper at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("./");
    await seekIntro(page, OPEN.greeting + 119);
    const paper = page.locator(".splash-greeting--paper");
    const first = paper.locator(".trailhead-title-line").first().locator(".hero-reveal-letter").first();
    const second = paper.locator(".trailhead-title-line").nth(1).locator(".hero-reveal-letter").first();
    await expect(first).toHaveCSS("opacity", "0");
    await seekIntro(page, OPEN.greeting + 200);
    await expect(first).toHaveCSS("opacity", "1");
    await expect(second).toHaveCSS("opacity", "0");
    await seekIntro(page, OPEN.greeting + 1000);
    await expect(second).toHaveCSS("opacity", "1");
    await expect(paper.locator(".hero-brand-spark")).toHaveCount(68);
    await seekIntro(page, OPEN.handoff[0]);
    expect(await paper.locator(".hero-brand-heat, .hero-brand-scorch, .hero-brand-spark, .hero-brand-smoke").evaluateAll(elements => elements.every(el => Number(getComputedStyle(el).opacity) < 0.001))).toBe(true);
    await expect(page.locator(".hero-strings")).toHaveCount(0);
    await expect(page.locator("#trailhead-title")).not.toHaveCSS("text-shadow", "none");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.locator("[data-hero-reveal-controls]")).toHaveCount(0);
  });

  test(`contours vibrate silently and only clicks or taps play at ${width}px`, async ({ browser, baseURL }) => {
    test.slow();
    const context = await browser.newContext({ baseURL, hasTouch: true, viewport: { width, height: 900 } });
    const page = await context.newPage();
    await probeAudio(page);
    await page.goto("./?variant=letterpress#trailhead");
    await expect(page.locator("html")).not.toHaveAttribute("data-reveal-variant");
    await expect(page.locator(".hero-strings")).toHaveCount(1);
    await expect(page.locator(".trailhead-surprise")).toBeVisible();
    const point = await contourPoint(page);
    const pixels = () => page.locator(".hero-strings").evaluate(c => (c as HTMLCanvasElement).toDataURL());
    const before = await pixels();
    await page.mouse.move(point.x - 50, point.y - 50);
    await page.mouse.move(point.x + 15, point.y + 50, { steps: 12 });
    await expect.poll(pixels).not.toBe(before);
    expect(await page.evaluate(() => Reflect.get(window, "guitarContexts").length)).toBe(0);
    await page.keyboard.press("Shift");
    expect(await page.evaluate(() => Reflect.get(window, "guitarContexts").length)).toBe(0);
    if (width < 600) await page.touchscreen.tap(point.x, point.y);
    else await page.mouse.click(point.x, point.y);
    await expect.poll(() => page.evaluate(() => Reflect.get(window, "guitarNotes"))).toBeGreaterThan(0);
    const notes = await page.evaluate(() => Reflect.get(window, "guitarNotes"));
    await page.mouse.move(point.x - 50, point.y - 50, { steps: 12 });
    await page.mouse.move(point.x + 15, point.y + 50, { steps: 12 });
    expect(await page.evaluate(() => Reflect.get(window, "guitarNotes"))).toBe(notes);
    const sound = page.getByRole("button", { name: "Guitar sound", exact: true });
    await sound.click();
    await page.mouse.click(point.x, point.y);
    expect(await page.evaluate(() => Reflect.get(window, "guitarNotes"))).toBe(notes);
    await page.reload();
    await expect(sound).toHaveAttribute("aria-pressed", "false");
    await page.getByRole("button", { name: "Climb view", exact: true }).click();
    // This checks audio ownership through natural view changes. The dedicated
    // transition spec checks authored duration independently of software paint.
    await expect(page.locator(".splash--climb")).toHaveCount(0, { timeout: 15_000 });
    await expect(page.locator(".hero-strings")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Ambient sound", exact: true })).toBeVisible();
    await expect(sound).toHaveCount(0);
    await page.getByRole("button", { name: "List view", exact: true }).click();
    await expect(page.locator(".splash--list")).toHaveCount(0, { timeout: 15_000 });
    await expect(page.locator(".hero-strings")).toHaveCount(1);
    await expect(sound).toHaveAttribute("aria-pressed", "false");
    await context.close();
  });
}

test("a native mobile scroll beginning on a contour stays silent, then a tap plays", async ({ browser, browserName, baseURL }) => {
  test.skip(browserName !== "chromium", "Native touch scrolling uses the Chromium input protocol; pointer cancellation is also covered across engines.");
  const context = await browser.newContext({ baseURL, hasTouch: true, isMobile: true, viewport: { width: 390, height: 900 } });
  const page = await context.newPage();
  await probeAudio(page);
  await page.goto("./#trailhead");
  await expect(page.locator(".hero-strings")).toHaveCount(1);
  const point = await contourPoint(page);
  await page.evaluate(() => {
    Reflect.set(window, "cancelledTouches", 0);
    window.addEventListener("pointercancel", () => Reflect.set(window, "cancelledTouches", Reflect.get(window, "cancelledTouches") + 1));
  });
  const input = await context.newCDPSession(page);
  await input.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point] });
  for (let step = 1; step <= 8; step++) {
    await input.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: point.x, y: point.y - step * 30 }] });
    await page.waitForTimeout(20);
  }
  await input.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(100);
  expect(await page.evaluate(() => Reflect.get(window, "cancelledTouches"))).toBeGreaterThan(0);
  expect(await page.evaluate(() => Reflect.get(window, "guitarNotes"))).toBe(0);
  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await page.touchscreen.tap(point.x, point.y);
  await expect.poll(() => page.evaluate(() => Reflect.get(window, "guitarNotes"))).toBeGreaterThan(0);
  await context.close();
});

test("contour presses stay silent until release and reject dragging, cancellation and secondary clicks", async ({ page }) => {
  await probeAudio(page);
  await page.goto("./#trailhead");
  await expect(page.locator(".hero-strings")).toHaveCount(1);
  const point = await contourPoint(page);
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  expect(await page.evaluate(() => Reflect.get(window, "guitarContexts").length)).toBe(0);
  await page.mouse.move(point.x, point.y - 40, { steps: 4 });
  await page.mouse.move(point.x, point.y, { steps: 4 });
  await page.mouse.up();
  await page.mouse.click(point.x, point.y, { button: "right" });
  await page.keyboard.press("Escape");
  await page.mouse.down();
  await page.evaluate(() => window.dispatchEvent(new PointerEvent("pointercancel")));
  await page.mouse.up();
  expect(await page.evaluate(() => Reflect.get(window, "guitarNotes"))).toBe(0);
  await page.mouse.click(point.x, point.y);
  await expect.poll(() => page.evaluate(() => Reflect.get(window, "guitarNotes"))).toBeGreaterThan(0);
});

test("reduced motion keeps the deboss but skips strings and the discovery note", async ({ page }) => {
  await probeAudio(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./");
  await expect(page.locator("#trailhead-title")).toHaveCSS("opacity", "1");
  await expect(page.locator("#trailhead-title")).not.toHaveCSS("text-shadow", "none");
  await expect(page.locator(".hero-strings")).toHaveCount(0);
  await expect(page.locator(".trailhead-surprise")).toBeHidden();
  await expect(page.getByRole("button", { name: "Guitar sound", exact: true })).toBeHidden();
  expect(await page.evaluate(() => Reflect.get(window, "guitarContexts").length)).toBe(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator(".hero-strings")).toHaveCount(1);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".hero-strings")).toHaveCount(0);
});

test("an idle guitar keeps the native output ready without starting another sound", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "Chromium's native silence-detection trace uses CDP.");
  await page.setViewportSize({ width: 1440, height: 900 }); await probeAudio(page);
  const session = await page.context().newCDPSession(page);
  const events: Record<string, unknown>[] = [];
  session.on("Tracing.dataCollected", payload => { events.push(...payload.value); });
  await session.send("Tracing.start", { categories: "webaudio", transferMode: "ReportEvents" });
  await page.goto("./#trailhead"); await expect(page.locator(".hero-strings")).toHaveCount(1);
  const point = await contourPoint(page); await page.mouse.click(point.x, point.y);
  await expect.poll(() => page.evaluate(() => Reflect.get(window, "guitarNotes"))).toBe(1);
  await page.waitForTimeout(5000);
  const finished = new Promise<void>(resolve => session.once("Tracing.tracingComplete", () => resolve()));
  await session.send("Tracing.end"); await finished;
  // This is the browser's actual idle-device decision, rather than an assertion
  // about a particular graph implementation or a flaky hardware timing limit.
  const decision = events.filter(event => event.name === "AudioDestination::SetDetectSilence").at(-1);
  const args = decision?.args;
  expect(typeof args === "object" && args !== null && "detect_silence" in args && args.detect_silence === false).toBe(true);
  expect(await page.evaluate(() => Reflect.get(window, "guitarNotes"))).toBe(1);
});

test("warm guitar output is silent between clicks and pauses with a hidden page", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 }); await probeAudio(page);
  await page.addInitScript(() => {
    const connect = AudioNode.prototype.connect;
    Object.defineProperty(AudioNode.prototype, "connect", { configurable: true, value: function (this: AudioNode, ...args: unknown[]) {
      if (args[0] === this.context.destination) {
        const meter = this.context.createAnalyser(); Reflect.set(window, "guitarMeter", meter);
        Reflect.apply(connect, this, [meter]); Reflect.apply(connect, meter, args); return args[0];
      }
      return Reflect.apply(connect, this, args);
    } });
  });
  await page.goto("./#trailhead"); await expect(page.locator(".hero-strings")).toHaveCount(1);
  const point = await contourPoint(page); await page.mouse.click(point.x, point.y);
  await expect.poll(() => page.evaluate(() => Reflect.get(window, "guitarNotes"))).toBe(1);
  // Wait for the pluck and room tail to finish; the readiness node adds no sound.
  await page.waitForTimeout(5000);
  const rms = await page.evaluate(() => {
    const meter: AnalyserNode = Reflect.get(window, "guitarMeter"), data = new Float32Array(meter.fftSize);
    meter.getFloatTimeDomainData(data); return Math.sqrt(data.reduce((sum, n) => sum + n * n, 0) / data.length);
  });
  expect(rms).toBeLessThan(1e-8);
  await page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, value: true }); document.dispatchEvent(new Event("visibilitychange")); });
  await expect.poll(() => page.evaluate(() => Reflect.get(window, "guitarContexts")[0].state)).toBe("suspended");
  await page.evaluate(() => { Reflect.deleteProperty(document, "hidden"); document.dispatchEvent(new Event("visibilitychange")); });
  await expect.poll(() => page.evaluate(() => Reflect.get(window, "guitarContexts")[0].state)).toBe("running");
  expect(await page.evaluate(() => Reflect.get(window, "guitarNotes"))).toBe(1);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true }); document.dispatchEvent(new Event("visibilitychange"));
    Reflect.deleteProperty(document, "hidden"); document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForTimeout(100);
  await expect.poll(() => page.evaluate(() => Reflect.get(window, "guitarContexts")[0].state)).toBe("running");
  await page.mouse.click(point.x, point.y);
  await expect.poll(() => page.evaluate(() => Reflect.get(window, "guitarNotes"))).toBe(2);
});

test("each contour click plays the next note of the blues riff, looping after the last", async ({ page }) => {
  test.slow();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() => {
    // Strings are cached per pitch, so a buffer's identity names its pitch.
    const buffers: AudioBuffer[] = [], played: number[] = [];
    Reflect.set(window, "guitarPlayed", played);
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args) {
      if (this.buffer) { let id = buffers.indexOf(this.buffer); if (id < 0) id = buffers.push(this.buffer) - 1; played.push(id); }
      return Reflect.apply(start, this, args);
    };
  });
  await page.goto("./#trailhead");
  await expect(page.locator(".hero-strings")).toHaveCount(1);
  const point = await contourPoint(page);
  const played = () => page.evaluate(() => (Reflect.get(window, "guitarPlayed") as number[]).length);
  // Nine clicks on the same line, faster than a note rings: all eight notes, then the loop.
  for (let click = 1; click <= 9; click++) {
    await page.mouse.click(point.x, point.y);
    await expect.poll(played).toBe(click);
  }
  const notes = await page.evaluate(() => Reflect.get(window, "guitarPlayed") as number[]);
  const [A3, C4, D4, E4, G4] = notes;
  expect(new Set([A3, C4, D4, E4, G4]).size).toBe(5);
  expect(notes).toEqual([A3, C4, D4, E4, G4, E4, C4, A3, A3]);
});

test("a quick sweep silently vibrates every contour it crosses", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 }); await probeAudio(page);
  await page.goto("./#trailhead");
  await expect(page.locator(".hero-strings")).toHaveCount(1);
  const plucks = () => page.locator(".hero-strings").evaluate(c => Number((c as HTMLCanvasElement).dataset.plucks ?? 0));
  const [from, to] = [{ x: 1400, y: 140 }, { x: 260, y: 880 }];
  // Count the separate lines drawn along the sweep before anything moves.
  const lines = await page.locator(".hero-strings").evaluate((canvas, [a, b]) => {
    const c = canvas as HTMLCanvasElement, box = c.getBoundingClientRect(), data = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
    // About 3 samples per pixel; antialiasing can split one line by a pixel or two.
    let runs = 0, lastOn = -Infinity;
    for (let k = 0, n = 4000; k <= n; k++) {
      const x = Math.floor((a.x + ((b.x - a.x) * k) / n - box.left) * (c.width / box.width));
      const y = Math.floor((a.y + ((b.y - a.y) * k) / n - box.top) * (c.height / box.height));
      if (data[(y * c.width + x) * 4 + 3] > 5) { if (k - lastOn > 8) runs++; lastOn = k; }
    }
    return runs;
  }, [from, to]);
  expect(lines, "the sweep must cross more lines than the former limit of eight").toBeGreaterThan(8);
  await page.mouse.move(from.x, from.y);
  const before = await plucks();
  // A single pointer sample across the whole band: every crossing must register.
  await page.mouse.move(to.x, to.y);
  expect(await plucks() - before).toBeGreaterThanOrEqual(lines);
  expect(await page.evaluate(() => Reflect.get(window, "guitarNotes"))).toBe(0);
  expect(await page.evaluate(() => Reflect.get(window, "guitarContexts").length)).toBe(0);
});

test("hovering and dragging never advance the riff, and a click right after a hover still plucks", async ({ page }) => {
  test.slow();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() => {
    const buffers: AudioBuffer[] = [], played: number[] = [];
    Reflect.set(window, "guitarPlayed", played);
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args) {
      if (this.buffer) { let id = buffers.indexOf(this.buffer); if (id < 0) id = buffers.push(this.buffer) - 1; played.push(id); }
      return Reflect.apply(start, this, args);
    };
  });
  await page.goto("./#trailhead");
  await expect(page.locator(".hero-strings")).toHaveCount(1);
  const point = await contourPoint(page);
  const played = () => page.evaluate(() => (Reflect.get(window, "guitarPlayed") as number[]).length);
  const plucks = () => page.locator(".hero-strings").evaluate(c => Number((c as HTMLCanvasElement).dataset.plucks ?? 0));
  // Hover across, slowly and quickly, then drag across the line.
  await page.mouse.move(point.x - 40, point.y - 40);
  await page.mouse.move(point.x + 40, point.y + 40, { steps: 30 });
  await page.mouse.move(point.x - 40, point.y - 40);
  await page.mouse.down(); await page.mouse.move(point.x + 40, point.y + 40, { steps: 6 }); await page.mouse.up();
  expect(await played()).toBe(0);
  for (let click = 1; click <= 8; click++) {
    // Arrive on the line (a hover pluck), then click at once: the click must still pluck.
    await page.mouse.move(point.x, point.y);
    const before = await plucks();
    await page.mouse.down(); await page.mouse.up();
    await expect.poll(played).toBe(click);
    expect(await plucks()).toBeGreaterThan(before);
    await page.mouse.move(point.x - 40, point.y - 40);
  }
  // The riff still starts on A3: A3 C4 D4 E4 G4 E4 C4 A3.
  const notes = await page.evaluate(() => Reflect.get(window, "guitarPlayed") as number[]);
  const [A3, C4, D4, E4, G4] = notes;
  expect(new Set([A3, C4, D4, E4, G4]).size).toBe(5);
  expect(notes).toEqual([A3, C4, D4, E4, G4, E4, C4, A3]);
});
