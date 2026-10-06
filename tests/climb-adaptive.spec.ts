import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { waypoints } from "../content/waypoints";
import { scrollToClimbStop } from "./helpers/climb";

// Change browser frame timestamps, not the quality controller's internals.
function installFrameClock() {
  if (typeof requestAnimationFrame !== "function") return;
  const nativeFrame = requestAnimationFrame.bind(window);
  let previous = -1, clock = 0;
  Reflect.set(window, "frameGap", 16);
  window.requestAnimationFrame = (callback) => nativeFrame((now) => {
    if (now !== previous) {
      clock = previous < 0 ? now : clock + Reflect.get(window, "frameGap");
      previous = now;
    }
    callback(clock);
  });
}

test("a failed reading-panel enhancement preserves its Waypoint in List View", async ({ page }) => {
  await page.addInitScript(() => {
    HTMLDialogElement.prototype.show = () => { throw new Error("Simulated dialog failure"); };
  });
  await page.goto("./");
  await expect(page.locator("#climb")).toBeVisible();
  await scrollToClimbStop(page, 3);
  await page.locator('[data-marker="3"]').click();
  await expect(page).toHaveURL(/#veritas$/);
  await expect(page.locator("#veritas")).toBeFocused();
  await expect(page.locator("#veritas")).toBeInViewport();
  await expect(page.locator("#climb")).toBeHidden();
  await expect(page.getByRole("button", { name: "Climb view", exact: true })).toBeHidden();
});

test.beforeEach(async ({ page }) => {
  // Fix the baseline device, not the enhancement policy. Individual capability
  // fixtures override these browser hints; host CI core counts must not decide modes.
  await page.addInitScript(() => {
    for (const hint of ["deviceMemory", "hardwareConcurrency"]) {
      if (!Object.hasOwn(navigator, hint)) Object.defineProperty(navigator, hint, { value: 8, configurable: true });
    }
  });
  // Capability checks use a healthy baseline frame budget, independent of
  // headless renderer load. Performance tests change this browser boundary.
  await page.addInitScript(installFrameClock);
});

for (const unavailable of ["missing", "throwing"] as const) {
  test(`${unavailable} optional capability hints do not prevent enhancement`, async ({ page }) => {
    await page.addInitScript((unavailable) => {
      for (const hint of ["connection", "deviceMemory", "hardwareConcurrency"]) {
        Object.defineProperty(navigator, hint, {
          configurable: true,
          get() {
            if (unavailable === "throwing") throw new Error("Simulated privacy restriction");
            return undefined;
          },
        });
      }
    }, unavailable);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("./");
    await expect(page.locator("#climb")).toBeVisible();
    await scrollToClimbStop(page, 3);
    await page.locator('[data-marker="3"]').click();
    await expect(page.getByRole("dialog").locator("#panel-title")).toHaveText("Veritas");
    expect(errors).toEqual([]);
  });
}

test("snow uses a bounded bitmap on a large viewport", async ({ page }) => {
  await page.setViewportSize({ width: 2000, height: 1200 });
  await page.goto("./");
  await expect(page.locator("#climb")).toBeVisible();
  await scrollToClimbStop(page, 6);
  await expect(page.locator(".climb-snow")).toHaveAttribute("data-flakes", "320");
  const pixels = await page.locator(".climb-snow").evaluate((node) => {
    const canvas = node as HTMLCanvasElement;
    return canvas.width * canvas.height;
  });
  expect(pixels).toBeGreaterThan(0);
  expect(pixels).toBeLessThanOrEqual(2000000);
});

test("a snow drawing failure stops only decoration", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await expect(page.locator("#climb")).toBeVisible();
  await scrollToClimbStop(page, 6);
  await expect(page.locator(".climb-snow")).toHaveAttribute("data-flakes", "320");
  await page.locator('[data-marker="6"]').click();
  await page.evaluate(() => {
    CanvasRenderingContext2D.prototype.arc = () => { throw new Error("Simulated painting failure"); };
  });
  await expect(page.locator(".climb-snow")).toBeHidden();
  await expect(page.getByRole("dialog").locator("#panel-title")).toHaveText("MedVoyage");
  await expect(page.locator(".climb-panel-body")).toBeFocused();
  expect(errors).toEqual([]);
});

for (const [hint, value] of [["deviceMemory", 1], ["hardwareConcurrency", 2]] as const) {
  test(`optional ${hint} limits quiet the Climb on a wide screen`, async ({ page }) => {
    await page.addInitScript(([hint, value]) => {
      Object.defineProperty(navigator, hint, { value, configurable: true });
    }, [hint, value]);
    await page.goto("./");
    await expect(page.locator("#climb")).toBeVisible();
    await expect.poll(() => page.locator("svg.mtn").evaluate((svg) => (svg as SVGSVGElement).animationsPaused())).toBe(true);
    await expect(page.locator(".climb-snow")).toBeHidden();
    await scrollToClimbStop(page, 3);
    await page.locator('[data-marker="3"]').click();
    await expect(page.getByRole("dialog").locator("#panel-title")).toHaveText("Veritas");
  });
}

test("losing a running snow context stops decoration without losing the open panel", async ({ page }) => {
  await page.goto("./");
  await expect(page.locator("#climb")).toBeVisible();
  await scrollToClimbStop(page, 6);
  const snow = page.locator(".climb-snow");
  await expect(snow).toHaveAttribute("data-flakes", "320");
  await page.locator('[data-marker="6"]').click();
  await snow.evaluate((canvas) => canvas.dispatchEvent(new Event("contextlost")));
  await expect(snow).toBeHidden();
  await expect(page.getByRole("dialog").locator("#panel-title")).toHaveText("MedVoyage");
  await expect(page.locator(".climb-panel-body")).toBeFocused();
});

test("sustained slow frames first quiet decoration, then preserve the Case Study in List View", async ({ page }) => {
  test.setTimeout(60000); // Drives 240 real browser frames, even on a busy runner.
  await page.goto("./");
  await expect(page.locator("#climb")).toBeVisible();
  await scrollToClimbStop(page, 3);
  await page.locator('[data-marker="3"]').click();
  await page.getByRole("dialog").getByRole("link", { name: "Read case study" }).click();
  await page.evaluate(() => Reflect.set(window, "frameGap", 70));
  await expect(page.locator(".climb-snow")).toBeHidden({ timeout: 20000 });
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator(".climb-panel-body")).toBeFocused();
  await expect(page.locator("#climb")).toHaveAttribute("data-stop", "3");
  await expect(page.locator("#case-veritas")).toBeFocused({ timeout: 20000 });
  await expect(page).toHaveURL(/#case-veritas$/);
  await expect(page.locator("#climb")).toBeHidden();
  await expect(page.getByRole("button", { name: "Climb view", exact: true })).toBeHidden();
});

test("isolated slow frames and suspension gaps do not downgrade a healthy Climb", async ({ page }) => {
  test.setTimeout(60000);
  await page.goto("./");
  await expect(page.locator("#climb")).toBeVisible();
  await scrollToClimbStop(page, 3);
  await page.locator('[data-marker="3"]').click();
  await page.evaluate(async () => {
    async function frames(count: number, gap: number) {
      Reflect.set(window, "frameGap", gap);
      for (let index = 0; index < count; index++) {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      }
    }
    await frames(70, 70); // One poor window alone is insufficient.
    await frames(3, 2000); // A suspension gap discards that evidence.
    await frames(70, 70);
    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    await frames(2, 2000);
    Object.defineProperty(document, "hidden", { value: false, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    await frames(70, 70);
    for (let index = 0; index < 12; index++) {
      await frames(1, 100);
      await frames(10, 16);
    }
  });
  await expect(page.locator(".climb-enhancement")).toHaveAttribute("data-quality", "full");
  await expect(page.getByRole("dialog").locator("#panel-title")).toHaveText("Veritas");
  await expect(page.locator(".climb-panel-body")).toBeFocused();
});

test("a runtime SVG failure preserves the open Case Study and focus", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await expect(page.locator("#climb")).toBeVisible();
  await scrollToClimbStop(page, 3);
  await page.locator('[data-marker="3"]').click();
  await page.getByRole("dialog").getByRole("link", { name: "Read case study" }).click();
  await expect(page.locator(".climb-panel-body")).toBeFocused();
  await page.evaluate(() => {
    document.getElementById("a-climber")!.setAttribute = () => { throw new Error("Simulated SVG rendering failure"); };
    window.dispatchEvent(new Event("resize"));
  });
  await expect(page).toHaveURL(/#case-veritas$/);
  await expect(page.locator("#case-veritas")).toBeFocused();
  await expect(page.locator("#case-veritas")).toBeInViewport();
  await expect(page.locator("#climb")).toBeHidden();
  expect(errors).toEqual([]);
});

test("a live save-data downgrade preserves the reading panel and focus", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "connection", { value: new EventTarget(), configurable: true });
  });
  await page.goto("./");
  await expect(page.locator("#climb")).toBeVisible();
  await scrollToClimbStop(page, 3);
  await page.locator('[data-marker="3"]').click();
  const panelBody = page.locator(".climb-panel-body");
  await expect(panelBody).toBeFocused();
  await page.evaluate(() => {
    const connection = Reflect.get(navigator, "connection");
    connection.saveData = true;
    connection.dispatchEvent(new Event("change"));
  });
  await expect.poll(() => page.locator("svg.mtn").evaluate((svg) => (svg as SVGSVGElement).animationsPaused())).toBe(true);
  await expect(page.locator(".climb-snow")).toBeHidden();
  await expect(panelBody).toBeFocused();
  await expect(page.getByRole("dialog").locator("#panel-title")).toHaveText("Veritas");
  await expect(page.locator("#climb")).toHaveAttribute("data-stop", "3");
  await page.evaluate(() => {
    const connection = Reflect.get(navigator, "connection");
    connection.saveData = false;
    connection.dispatchEvent(new Event("change"));
  });
  await expect(page.locator(".climb-enhancement")).toHaveAttribute("data-quality", "light");
});

test("failed SVG initialization restores complete List View instead of a broken scene", async ({ page }) => {
  await page.addInitScript(() => {
    SVGGraphicsElement.prototype.getBBox = () => { throw new Error("Simulated SVG failure"); };
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await expect(page).toHaveURL(/#trailhead$/);
  await expect(page.locator("#trailhead")).toBeFocused();
  await expect(page.locator("#list-view")).toBeVisible();
  await expect(page.locator("#climb")).toBeHidden();
  await expect(page.getByRole("button", { name: "Climb view", exact: true })).toBeHidden();
  await expect(page.locator("[data-waypoint-slug]")).toHaveCount(6);
  expect(errors).toEqual([]);
});

for (const feature of ["ResizeObserver", "requestAnimationFrame", "DOMPoint", "matchMedia"] as const) {
  test(`missing ${feature} leaves deep-linked List View fully usable`, async ({ page }) => {
    await page.addInitScript((feature) => {
      Object.defineProperty(window, feature, { value: undefined, configurable: true });
    }, feature);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("./#case-veritas");
    await expect(page.locator("#case-veritas")).toBeVisible();
    await expect(page.locator("#climb")).toBeHidden();
    await expect(page.getByRole("button", { name: "Climb view", exact: true })).toBeHidden();
    await page.getByRole("link", { name: "Standalone Case Study" }).click();
    await expect(page).toHaveURL(/\/portfolio\/work\/veritas\/$/);
    expect(errors).toEqual([]);
  });
}

test("throwing required observers restore List View without an error page", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "ResizeObserver", {
      configurable: true,
      value: class {
        constructor() { throw new Error("Simulated observer initialization failure"); }
      },
    });
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await expect(page.locator("#list-view")).toBeVisible();
  await expect(page.locator("#climb")).toBeHidden();
  await expect(page.getByRole("button", { name: "Climb view", exact: true })).toBeHidden();
  await expect(page.locator("[data-waypoint-slug]")).toHaveCount(6);
  expect(errors).toEqual([]);
});

test("a narrow device gets quiet scenery without losing Waypoint navigation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./");
  await expect(page.locator("#climb")).toBeVisible();
  await expect.poll(() => page.locator("svg.mtn").evaluate((svg) => (svg as SVGSVGElement).animationsPaused())).toBe(true);
  await expect(page.locator(".climb-snow")).toBeHidden();
  await scrollToClimbStop(page, 3);
  await page.locator('[data-marker="3"]').click();
  await expect(page.getByRole("dialog").locator("#panel-title")).toHaveText("Veritas");
  await page.getByRole("button", { name: "List view", exact: true }).click();
  await expect(page.locator("#list-view")).toBeFocused();
  await expect(page.locator("[data-waypoint-slug]")).toHaveCount(6);
});

test("reduced-motion visitors start in the complete List View", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./");
  await expect(page.locator("#list-view")).toBeVisible();
  await expect(page.locator("#climb")).toBeHidden();
  await expect(page.locator("[data-waypoint-slug]")).toHaveCount(6);
  await expect(page.getByRole("heading", { name: "Beyond the build." })).toBeVisible();
  await page.getByRole("link", { name: "Contact me" }).click();
  await expect(page).toHaveURL(/#summit$/);
  await expect(page.getByRole("link", { name: "Email Diego" })).toHaveAttribute("href", "mailto:diegommart2004@gmail.com");
});

for (const failure of ["null", "throwing"] as const) {
  test(`a ${failure} optional snow context leaves keyboard Waypoints usable`, async ({ page }) => {
    await page.addInitScript((failure) => {
      HTMLCanvasElement.prototype.getContext = () => {
        if (failure === "throwing") throw new Error("Simulated canvas failure");
        return null;
      };
    }, failure);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("./");
    await expect(page.locator("#climb")).toBeVisible();
    await scrollToClimbStop(page, 3);
    await page.locator('[data-marker="3"]').focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog").locator("#panel-title")).toHaveText("Veritas");
    await page.keyboard.press("Escape");
    await expect(page.locator('[data-marker="3"]')).toBeFocused();
    expect(errors).toEqual([]);
  });
}

test("reduced-motion List View keeps canonical content and accessible reading surfaces", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "light" });
  await page.goto("./");
  await expect(page.locator("#list-view")).toBeVisible();
  expect(await page.locator("[data-waypoint-slug]").evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute("data-waypoint-slug")))).toEqual(waypoints.map((waypoint) => waypoint.slug));
  for (const waypoint of waypoints) {
    if (!("caseStudyHref" in waypoint)) continue;
    await expect(page.locator(`#${waypoint.slug}`).getByRole("link", { name: "Read case study" })).toHaveAttribute("href", `#case-${waypoint.slug}`);
  }
  for (const colorScheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme });
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]);
  }
});

test("a live reduced-motion change preserves the open Case Study in List View", async ({ page }) => {
  await page.goto("./");
  await expect(page.locator("#climb")).toBeVisible();
  await scrollToClimbStop(page, 3);
  await page.locator('[data-marker="3"]').click();
  await page.getByRole("dialog").getByRole("link", { name: "Read case study" }).click();
  await expect(page.locator(".climb-panel-title")).toContainText("Case Study");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("#climb")).toBeHidden();
  await expect(page).toHaveURL(/#case-veritas$/);
  await expect(page.locator("#case-veritas")).toBeFocused();
  await expect(page.locator("#case-veritas")).toBeInViewport();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator("#list-view")).toBeVisible();
  await expect(page.locator("#climb")).toBeHidden();
});
