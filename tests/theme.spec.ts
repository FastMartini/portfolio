import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { scrollToClimbStop } from "./helpers/climb";

const ground = { dark: "rgb(26, 33, 29)", light: "rgb(243, 238, 221)" };
type Theme = keyof typeof ground;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("splash-seen", "1");
    for (const hint of ["deviceMemory", "hardwareConcurrency"]) Object.defineProperty(navigator, hint, { value: 8, configurable: true });
  });
});

async function ready(page: Page, href = "./#list-view") {
  await page.goto(href);
  await expect(page.getByRole("button", { name: /Switch to (light|dark) theme/ })).toBeVisible();
}
async function select(page: Page, theme: Theme) {
  if (await page.locator("html").getAttribute("data-theme") !== theme) await page.getByRole("button", { name: `Switch to ${theme} theme` }).click();
  await expect(page.getByRole("banner")).toHaveCSS("background-color", ground[theme]);
  await expect(page.getByRole("button", { name: `Switch to ${theme === "light" ? "dark" : "light"} theme` })).toBeVisible();
}

for (const colorScheme of ["light", "dark"] as const) {
  test(`first visit is Dark under ${colorScheme} device preferences`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await ready(page);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.getByRole("banner")).toHaveCSS("background-color", ground.dark);
    expect(await page.evaluate(() => localStorage.getItem("portfolio-theme"))).toBeNull();
  });
}

for (const theme of ["light", "dark"] as const) {
  test(`stored ${theme} is correct from the first painted frame without a splash`, async ({ page }) => {
    await page.addInitScript((saved) => {
      localStorage.setItem("portfolio-theme", saved);
      const paints: { theme: string | undefined; background: string }[] = [];
      Reflect.set(window, "themePaints", paints);
      function sample() {
        if (document.body) paints.push({ theme: document.documentElement.dataset.theme, background: getComputedStyle(document.body).backgroundColor });
        if (paints.length < 5) requestAnimationFrame(sample);
      }
      requestAnimationFrame(sample);
    }, theme);
    await ready(page);
    await expect.poll(() => page.evaluate(() => Reflect.get(window, "themePaints").length)).toBe(5);
    expect(await page.evaluate(() => Reflect.get(window, "themePaints"))).toEqual(Array.from({ length: 5 }, () => ({ theme, background: ground[theme] })));
    await page.reload();
    await expect(page.getByRole("banner")).toHaveCSS("background-color", ground[theme]);
  });
}

for (const restricted of ["invalid", "denied"] as const) {
  test(`${restricted} storage preserves defaults and an in-memory toggle`, async ({ page }) => {
    await page.addInitScript((mode) => {
      if (mode === "invalid") localStorage.setItem("portfolio-theme", "sepia");
      else Object.defineProperty(window, "localStorage", { configurable: true, get() { throw new Error("Storage denied"); } });
    }, restricted);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await ready(page);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await select(page, "light");
    await page.reload();
    await expect(page.getByRole("banner")).toHaveCSS("background-color", ground.dark);
    expect(errors).toEqual([]);
  });
}

test("refresh during an unfinished change restores its destination without replay", async ({ page }) => {
  await ready(page);
  await page.getByRole("button", { name: "Switch to light theme" }).click();
  expect(await page.evaluate(() => localStorage.getItem("portfolio-theme"))).toBe("light");
  await page.reload();
  await expect(page.getByRole("banner")).toHaveCSS("background-color", ground.light);
  await expect(page.locator(".climb-list")).toHaveCSS("background-color", ground.light);
});

for (const feature of ["MutationObserver", "requestAnimationFrame"] as const) {
  test(`missing ${feature} preserves List View and manual theme selection`, async ({ page }) => {
    await page.addInitScript((name) => Object.defineProperty(window, name, { value: undefined, configurable: true }), feature);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await ready(page, "./#case-veritas");
    await expect(page.locator("#case-veritas")).toBeVisible();
    await expect(page.getByRole("button", { name: "Climb view", exact: true })).toBeHidden();
    await select(page, "light");
    await expect(page.locator("#case-veritas")).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test("rapid reversals keep rendered surfaces and text continuous and honor the last choice", async ({ page }) => {
  await ready(page);
  // Exercise real browser colors on a reproducible 60 Hz clock. Sparse native
  // software painting is checked separately by the moving-frame paint tests.
  await page.clock.install();
  await page.evaluate(() => {
    const header = document.querySelector(".site-header")!, heading = document.querySelector(".climb-list h1")!;
    const button = document.querySelector<HTMLButtonElement>(".theme-toggle")!;
    const result: { time: number; background: number[]; ink: number[] }[] = [];
    Reflect.set(window, "themeSamples", result);
    const rgb = (value: string) => value.match(/[\d.]+/g)!.slice(0, 3).map(Number);
    const start = performance.now();
    [0, 320, 560].forEach((ms) => setTimeout(() => button.click(), ms));
    function frame(now: number) {
      result.push({ time: now - start, background: rgb(getComputedStyle(header).backgroundColor), ink: rgb(getComputedStyle(heading).color) });
      if (now - start < 2200) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
  await page.clock.runFor(2300);
  const samples: { time: number; background: number[]; ink: number[] }[] = await page.evaluate(() => Reflect.get(window, "themeSamples"));
  expect(samples.length).toBeGreaterThan(20);
  for (const key of ["background", "ink"] as const) {
    const rates = samples.slice(1).map((sample, i) => Math.hypot(...sample[key].map((v, axis) => v - samples[i][key][axis])) * 16.67 / Math.max(8, sample.time - samples[i].time));
    expect(Math.max(...rates), `${key}: RGB distance per 60 Hz frame`).toBeLessThan(65);
  }
  await expect(page.getByRole("banner")).toHaveCSS("background-color", ground.light);
});

test("view switches inherit the in-flight palette without leaking palette tokens into vectors", async ({ page }) => {
  await ready(page);
  await page.getByRole("button", { name: "Switch to light theme" }).click();
  await page.waitForTimeout(350);
  await page.getByRole("button", { name: "Climb view", exact: true }).click();
  await expect(page.locator("#climb")).toBeVisible();
  const colors = await page.evaluate(() => {
    const rgb = (selector: string) => getComputedStyle(document.querySelector(selector)!).backgroundColor.match(/[\d.]+/g)!.slice(0, 3).map(Number);
    return { header: rgb(".site-header"), card: rgb(".climb-card"), vector: getComputedStyle(document.querySelector("svg.mtn")!).getPropertyValue("--bg").trim() };
  });
  expect(Math.hypot(...colors.card.map((v, i) => v - colors.header[i]))).toBeLessThan(45);
  expect(colors.vector).toBe("");
  await expect(page.locator('.climb-card[data-card="0"]')).toHaveCSS("background-color", "rgb(255, 251, 237)");
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await page.waitForTimeout(350);
  await page.getByRole("button", { name: "List view", exact: true }).click();
  await expect(page.getByRole("banner")).toHaveCSS("background-color", ground.dark);
  await expect(page.locator(".climb-list")).toHaveCSS("background-color", ground.dark);
});

test("stationary snow-stage toggles finish, cloud hides celestial light, and four Light cards are cream", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await ready(page);
  await page.getByRole("button", { name: "Climb view", exact: true }).click();
  await scrollToClimbStop(page, 6);
  await expect(page.locator(".climb-moon")).toHaveCSS("opacity", "0");
  await expect(page.locator(".climb-stars")).toHaveCSS("opacity", "0");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await select(page, "light");
  await expect(page.locator("#night-veil")).toHaveCSS("opacity", "0");
  expect(await page.locator(".climb-card").evaluateAll((cards) => cards.map((card) => getComputedStyle(card).backgroundColor))).toEqual(Array(4).fill("rgb(255, 251, 237)"));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Climb view", exact: true }).click();
  await scrollToClimbStop(page, 9);
  await select(page, "dark");
  await expect(page.locator(".climb-moon")).toHaveCSS("opacity", "1");
  expect(await page.locator(".climb-moon").boundingBox()).toEqual(await page.locator(".climb-sun").boundingBox());
});

test("reduced motion fades briefly without twilight and live preference changes settle immediately", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await ready(page);
  await page.getByRole("button", { name: "Climb view", exact: true }).click();
  await expect(page.locator("#climb")).toHaveAttribute("data-settled", "true", { timeout: 15000 });
  // Verify the designed duration against rendered styles on a controlled
  // browser clock. Native software WebKit can miss entire paint opportunities
  // under parallel load; wall-clock observation measures that scheduler too.
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.evaluate(() => document.querySelector<HTMLButtonElement>(".theme-toggle")!.click());
  await page.clock.runFor(64);
  await expect(page.getByRole("banner")).not.toHaveCSS("background-color", ground.light);
  await page.clock.runFor(112);
  await expect(page.getByRole("banner")).toHaveCSS("background-color", ground.light);
  await expect(page.locator(".climb-twilight")).toHaveCSS("opacity", "0");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.evaluate(() => document.querySelector<HTMLButtonElement>(".theme-toggle")!.click());
  await page.clock.runFor(200);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByRole("banner")).toHaveCSS("background-color", ground.dark);
});

test("same-origin tabs synchronize without a storage write-back loop", async ({ page, context }) => {
  await ready(page);
  const second = await context.newPage();
  await second.goto("./#list-view");
  await expect(second.getByRole("button", { name: "Switch to light theme" })).toBeVisible();
  await second.evaluate(() => {
    Reflect.set(window, "themeWrites", 0);
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "portfolio-theme") Reflect.set(window, "themeWrites", Reflect.get(window, "themeWrites") + 1);
      original.call(this, key, value);
    };
  });
  await select(page, "light");
  await expect(second.getByRole("banner")).toHaveCSS("background-color", ground.light);
  expect(await second.evaluate(() => Reflect.get(window, "themeWrites"))).toBe(0);
  await select(second, "dark");
  await expect(page.getByRole("banner")).toHaveCSS("background-color", ground.dark);
  await second.close();
});

test("hidden-document visibility events settle the destination instead of replaying", async ({ page }) => {
  await ready(page);
  await page.getByRole("button", { name: "Switch to light theme" }).click();
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.getByRole("banner")).toHaveCSS("background-color", ground.light);
  await page.evaluate(() => { Reflect.deleteProperty(document, "hidden"); document.dispatchEvent(new Event("visibilitychange")); });
  await expect(page.getByRole("banner")).toHaveCSS("background-color", ground.light);
});

test("theme changes preserve an open Waypoint's reading position and closing focus", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await ready(page);
  await page.getByRole("button", { name: "Climb view", exact: true }).click();
  await scrollToClimbStop(page, 3);
  const marker = page.locator('[data-marker="3"]');
  await marker.click();
  const panel = page.getByRole("dialog");
  await expect(panel).toBeVisible();
  await panel.locator(".climb-panel-body").evaluate((body) => { body.scrollTop = 80; });
  const position = await panel.locator(".climb-panel-body").evaluate((body) => body.scrollTop);
  await page.getByRole("button", { name: "Switch to light theme" }).focus();
  await page.keyboard.press("Enter");
  await select(page, "light");
  await expect(panel).toBeVisible();
  expect(await panel.locator(".climb-panel-body").evaluate((body) => body.scrollTop)).toBe(position);
  await expect(page.getByRole("button", { name: "Switch to dark theme" })).toBeFocused();
  await panel.getByRole("button", { name: "Close panel" }).click();
  await expect(marker).toBeFocused();
});

for (const theme of ["dark", "light"] as const) {
  test(`all standalone Case Studies retain ${theme} and accessible reading surfaces`, async ({ page }) => {
    await ready(page);
    await select(page, theme);
    for (const slug of ["veritas", "momentumx", "membership-inference-attack"]) {
      await ready(page, `./work/${slug}/`);
      await expect(page.getByRole("banner")).toHaveCSS("background-color", ground[theme]);
      await expect(page.locator("#case-study-content > article")).toHaveCSS("background-color", ground[theme]);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    }
  });
}

test("the exported not-found page restores readable header and content in both themes", async ({ page }) => {
  for (const theme of ["dark", "light"] as const) {
    await ready(page);
    await select(page, theme);
    expect((await page.goto("./work/unpublished-project/"))?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Page not found." })).toBeVisible();
    await expect(page.getByRole("main")).toHaveCSS("background-color", ground[theme]);
    await expect(page.getByRole("banner")).toHaveCSS("color", theme === "dark" ? "rgb(236, 230, 210)" : "rgb(31, 38, 33)");
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  }
});

for (const width of [320, 390, 1280]) {
  test(`controls fit ${width}px in both themes and the standalone header`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await ready(page);
    for (const theme of ["light", "dark"] as const) {
      await select(page, theme);
      const control = page.getByRole("button", { name: `Switch to ${theme === "light" ? "dark" : "light"} theme` });
      const bounds = (await control.boundingBox())!;
      expect(bounds.width).toBeGreaterThanOrEqual(44);
      expect(bounds.height).toBeGreaterThanOrEqual(44);
      await expect(control).toBeInViewport();
      const view = page.getByRole("button", { name: "Climb view", exact: true });
      await expect(view).toBeInViewport();
      expect(bounds.x + bounds.width).toBeLessThanOrEqual((await view.boundingBox())!.x);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    }
    await ready(page, "./work/veritas/");
    await expect(page.getByRole("button", { name: "Switch to light theme" })).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  });
}
