import { setTheme } from "./helpers/theme";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import ts from "typescript";
import { ambientMix } from "../components/climb/audio/profile";
import { openClimb, scrollToClimbStop } from "./helpers/climb";

async function probeAudio(page: Page) {
  await page.addInitScript(() => {
    const NativeAudioContext = window.AudioContext;
    Reflect.set(window, "ambientContexts", []);
    Reflect.set(window, "ambientMeters", []);
    window.AudioContext = class extends NativeAudioContext {
      constructor(options?: AudioContextOptions) {
        super(options); Reflect.get(window, "ambientContexts").push(this);
      }
    };
    const connect = AudioNode.prototype.connect;
    Object.defineProperty(AudioNode.prototype, "connect", { configurable: true,
      value: function (this: AudioNode, ...args: unknown[]) {
        if (args[0] === this.context.destination) {
          const meter = this.context.createAnalyser(); meter.fftSize = 2048;
          Reflect.get(window, "ambientMeters").push(meter);
          Reflect.apply(connect, this, [meter]);
          Reflect.apply(connect, meter, args);
          return args[0];
        }
        return Reflect.apply(connect, this, args);
      } });
  });
}

async function outputLevel(page: Page) {
  return page.evaluate(() => {
    const meter = Reflect.get(window, "ambientMeters")[0] as AnalyserNode;
    const data = new Float32Array(meter.fftSize); meter.getFloatTimeDomainData(data);
    return Math.sqrt(data.reduce((sum, value) => sum + value * value, 0) / data.length);
  });
}

for (const viewport of [{ width: 1280, height: 600 }, { width: 1280, height: 640 }, { width: 901, height: 640 }]) {
  test(`Trail Rail pointer navigation stays clear of sound controls at ${viewport.width}x${viewport.height}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openClimb(page);
    const climb = page.locator("#climb");
    await expect(climb).toHaveAttribute("data-settled", "true");
    const sound = page.getByRole("button", { name: "Ambient sound", exact: true });
    const buttons = page.getByRole("navigation", { name: "Trail stops" }).getByRole("button");
    await expect(buttons).toHaveCount(10);

    for (let index = 0; index < 10; index++) {
      const button = buttons.nth(index), stop = (await button.getAttribute("data-rail"))!;
      const box = (await button.boundingBox())!;
      // Raw pointer input reproduces overlays intercepting the actual target.
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await expect(climb).toHaveAttribute("data-stop", stop);
      await expect(climb).toHaveAttribute("data-settled", "true");
      await expect(sound).toHaveAttribute("aria-pressed", "false");
    }

    await sound.click();
    await expect(sound).toHaveAttribute("aria-pressed", "true");
    await expect(climb).toHaveAttribute("data-stop", "0");
    await sound.click();
    await expect(sound).toHaveAttribute("aria-pressed", "false");
  });
}

test("fire proximity and upper-mountain storm intensity follow the journey and end in silence", () => {
  expect(ambientMix(0.07).fire).toBeGreaterThan(ambientMix(0).fire);
  expect(ambientMix(0.07).fire).toBeGreaterThan(ambientMix(0.17).fire);
  for (const position of [0.17, 0.28, 0.39]) {
    expect(ambientMix(position)).toMatchObject({ fire: 0, snow: 0 });
  }
  expect(ambientMix(0.5).fire).toBe(0);
  expect(ambientMix(0.39).snow).toBe(0);
  expect(ambientMix(0.61).snow).toBeLessThan(ambientMix(0.71).snow);
  expect(ambientMix(0.71).snow).toBeLessThan(ambientMix(0.84).snow);
  expect(ambientMix(0.9).snow).toBeGreaterThan(ambientMix(0.96).snow);
  expect(ambientMix(0.96).snow).toBeGreaterThan(ambientMix(0.99).snow);
  expect(ambientMix(1)).toMatchObject({ fire: 0, snow: 0 });
  for (let step = 1; step <= 1000; step++) {
    const previous = ambientMix((step - 1) / 1000), next = ambientMix(step / 1000);
    expect(Math.abs(next.fire - previous.fire)).toBeLessThan(0.04);
    expect(Math.abs(next.snow - previous.snow)).toBeLessThan(0.02);
  }
});

test("the real audio graph produces both effects, changes loudness, and renders digital silence", async ({ page }) => {
  // Run the production synthesis module in a real OfflineAudioContext rather
  // than treating AudioParam settings as proof of audible output.
  const javascript = ts.transpileModule(readFileSync(resolve("components/climb/audio/synthesis.ts"), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
  }).outputText;
  await page.route("**/audio-graph-test.js", (route) => route.fulfill({ contentType: "text/javascript", body: javascript }));
  await page.goto("./");
  const levels = await page.evaluate(async () => {
    const moduleUrl = "./audio-graph-test.js";
    const { createAmbientGraph } = await import(moduleUrl);
    const rms: number[] = [];
    let peak = 0;
    for (const mix of [{ fire: 1, snow: 0 }, { fire: 0.15, snow: 0 },
      { fire: 0, snow: 0.4 }, { fire: 0, snow: 1 }, { fire: 0, snow: 0 }]) {
      const context = new OfflineAudioContext(2, 24000, 24000);
      const graph = createAmbientGraph(context);
      graph.setMix({ ...mix, firePan: 0.2 });
      const result = await context.startRendering();
      let sum = 0, count = 0;
      for (let channel = 0; channel < result.numberOfChannels; channel++) {
        const data = result.getChannelData(channel);
        for (let index = 7200; index < 21600; index++) {
          sum += data[index] ** 2; count++; peak = Math.max(peak, Math.abs(data[index]));
        }
      }
      rms.push(Math.sqrt(sum / count));
      graph.dispose();
    }
    return { rms, peak };
  });
  expect(levels.rms[0]).toBeGreaterThan(0.005);
  expect(levels.rms[0]).toBeGreaterThan(levels.rms[1] * 2);
  expect(levels.rms[2]).toBeGreaterThan(0.005);
  expect(levels.rms[3]).toBeGreaterThan(levels.rms[2] * 1.3);
  expect(levels.rms[4]).toBe(0);
  expect(levels.peak).toBeLessThan(0.6);
});

test("sound is opt-in, reuses one audio context, and suspends in reading mode", async ({ page }) => {
  await probeAudio(page);
  await openClimb(page);
  const toggle = page.getByRole("button", { name: "Ambient sound", exact: true });
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  expect(await page.evaluate(() => Reflect.get(window, "ambientContexts").length)).toBe(0);
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => page.evaluate(() => Reflect.get(window, "ambientContexts")[0]?.state)).toBe("running");
  expect(await page.evaluate(() => Reflect.get(window, "ambientContexts").length)).toBe(1);
  await page.getByRole("button", { name: "List view", exact: true }).click();
  await expect(toggle).toBeHidden();
  await expect.poll(() => page.evaluate(() => Reflect.get(window, "ambientContexts")[0].state)).toBe("suspended");
  await page.getByRole("button", { name: "Climb view", exact: true }).click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => page.evaluate(() => Reflect.get(window, "ambientContexts")[0].state)).toBe("running");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await expect.poll(() => page.evaluate(() => Reflect.get(window, "ambientContexts")[0].state)).toBe("suspended");
});

test("the storm reaches the output and the summit is completely silent even with reduced visual motion", async ({ page }) => {
  await probeAudio(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openClimb(page);
  await scrollToClimbStop(page, 8);
  await page.getByRole("button", { name: "Ambient sound", exact: true }).click();
  await expect.poll(() => outputLevel(page)).toBeGreaterThan(0.005);
  await scrollToClimbStop(page, 9);
  await expect.poll(() => outputLevel(page)).toBe(0);
  await scrollToClimbStop(page, 8);
  await expect.poll(() => outputLevel(page)).toBeGreaterThan(0.005);
  expect(await page.evaluate(() => Reflect.get(window, "ambientContexts").length)).toBe(1);
});

test("the campfire is audible nearby, silent in the distance, and returns on descent", async ({ page }) => {
  await probeAudio(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openClimb(page);
  await scrollToClimbStop(page, 1);
  await page.getByRole("button", { name: "Ambient sound", exact: true }).click();
  await expect.poll(() => outputLevel(page)).toBeGreaterThan(0.005);
  await scrollToClimbStop(page, 3);
  await expect.poll(() => outputLevel(page)).toBe(0);
  await scrollToClimbStop(page, 4);
  await expect.poll(() => outputLevel(page)).toBe(0);
  await scrollToClimbStop(page, 1);
  await expect.poll(() => outputLevel(page)).toBeGreaterThan(0.005);
});

test("a hidden tab suspends audio and restores the opted-in sound", async ({ page }) => {
  await probeAudio(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openClimb(page);
  await page.getByRole("button", { name: "Ambient sound", exact: true }).click();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect.poll(() => page.evaluate(() => Reflect.get(window, "ambientContexts")[0].state)).toBe("suspended");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect.poll(() => page.evaluate(() => Reflect.get(window, "ambientContexts")[0].state)).toBe("running");
});

for (const viewport of [{ width: 390, height: 600 }, { width: 390, height: 900 }, { width: 1440, height: 900 }]) {
  test(`sound continues and stays controllable with a Waypoint Panel open at ${viewport.width}x${viewport.height}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await probeAudio(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openClimb(page);
    await scrollToClimbStop(page, 7);
    const toggle = page.getByRole("button", { name: "Ambient sound", exact: true });
    await toggle.click();
    await expect.poll(() => outputLevel(page)).toBeGreaterThan(0.005);
    await page.evaluate(() => {
      Reflect.set(window, "ambientStates", []);
      const context: AudioContext = Reflect.get(window, "ambientContexts")[0];
      context.addEventListener("statechange", () => Reflect.get(window, "ambientStates").push(context.state));
    });

    await page.locator('[data-marker="7"]').click();
    const panel = page.getByRole("dialog");
    await expect(panel).toBeVisible();
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => page.evaluate(() => Reflect.get(window, "ambientContexts")[0].state)).toBe("running");
    await expect.poll(() => outputLevel(page)).toBeGreaterThan(0.005);
    expect(await page.evaluate(() => Reflect.get(window, "ambientStates"))).not.toContain("suspended");
    const box = (await toggle.boundingBox())!;
    expect(box.x + box.width).toBeLessThan(viewport.width / 2);
    const heading = (await panel.locator(".climb-panel-head").boundingBox())!;
    expect(box.x < heading.x + heading.width && box.x + box.width > heading.x &&
      box.y < heading.y + heading.height && box.y + box.height > heading.y).toBe(false);

    // A real pointer click checks that the panel cannot cover the control.
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await expect.poll(() => page.evaluate(() => Reflect.get(window, "ambientContexts")[0].state)).toBe("suspended");
    await expect(panel).toBeVisible();
    await toggle.focus();
    await expect(toggle).toBeFocused();
    await page.keyboard.press("Space");
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => page.evaluate(() => Reflect.get(window, "ambientContexts")[0].state)).toBe("running");
    await expect.poll(() => outputLevel(page)).toBeGreaterThan(0.005);
    await page.keyboard.press("Enter");
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await page.getByRole("button", { name: "Close panel", exact: true }).click();
    await expect(panel).toBeHidden();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await expect.poll(() => page.evaluate(() => Reflect.get(window, "ambientContexts")[0].state)).toBe("suspended");
    expect(await page.evaluate(() => Reflect.get(window, "ambientContexts").length)).toBe(1);
  });
}

test("muting while audio is resuming cannot restart the sound later", async ({ page }) => {
  await probeAudio(page);
  await page.addInitScript(() => {
    const NativeAudioContext = window.AudioContext;
    window.AudioContext = class extends NativeAudioContext {
      resume(): Promise<void> {
        return new Promise((resolve, reject) => {
          Reflect.set(window, "releaseAudioResume", () => super.resume().then(resolve, reject));
        });
      }
    };
  });
  await openClimb(page);
  const toggle = page.getByRole("button", { name: "Ambient sound", exact: true });
  await toggle.click();
  await toggle.click();
  await page.evaluate(() => Reflect.get(window, "releaseAudioResume")());
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await expect.poll(() => page.evaluate(() => Reflect.get(window, "ambientContexts")[0].state)).toBe("suspended");
});

for (const width of [390, 1440]) {
  test(`sound control supports keyboard use and accessible themes at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await openClimb(page);
    const toggle = page.getByRole("button", { name: "Ambient sound", exact: true });
    await toggle.focus();
    await page.keyboard.press("Space");
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("Enter");
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    const box = (await toggle.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    for (const colorScheme of ["light", "dark"] as const) {
      await setTheme(page, colorScheme);
      expect((await new AxeBuilder({ page }).include(".climb-sound-toggle")
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]);
    }
  });
}

for (const failure of ["missing", "resume"] as const) {
  test(`${failure} audio support leaves the Climb and Waypoint reading usable`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript((failure) => {
      if (failure === "missing") Reflect.set(window, "AudioContext", undefined);
      else window.AudioContext = class extends AudioContext {
        resume(): Promise<void> { return Promise.reject(new Error("Audio unavailable")); }
      };
    }, failure);
    await openClimb(page);
    const toggle = page.getByRole("button", { name: "Ambient sound", exact: true });
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByRole("status")).toHaveText("Sound could not start. You can try turning it on again.");
    await expect(page.locator("#climb")).toBeVisible();
    await scrollToClimbStop(page, 3);
    await page.locator('[data-marker="3"]').click();
    await expect(page.getByRole("dialog").locator("#panel-title")).toHaveText("Veritas");
    expect(errors).toEqual([]);
  });
}
