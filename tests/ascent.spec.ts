import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { settledScrollY } from "./helpers/native-scroll";

test("conventional navigation reaches sections and keeps Climb view in the mobile header", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./#list-view");
  const navigation = page.getByRole("navigation", { name: "Primary navigation" });
  await expect(navigation.getByRole("button", { name: "Climb view" })).toBeInViewport();
  await expect(page.locator(".route-indicator")).toHaveCount(0);

  for (const [label, id] of [
    ["About", "about"],
    ["Work", "work"],
    ["Beyond Work", "beyond-work"],
    ["Contact", "summit"],
  ]) {
    const link = navigation.getByRole("link", { name: label, exact: true });
    await expect(link).toBeInViewport();
    await link.click();
    await expect(page).toHaveURL(new RegExp(`#${id}$`));
    await expect(link).toHaveAttribute("aria-current", "location");
    await expect(navigation.getByRole("button", { name: "Climb view" })).toBeInViewport();
    await expect(page.locator(`#${id}`)).toBeInViewport();
  }
});

test("Trailhead actions reach MomentumX and the Summit without the removed orientation widget", async ({ page }) => {
  await page.goto("./#list-view");
  await expect(page.getByRole("complementary", { name: "Mountain Journey location" })).toHaveCount(0);
  await page.getByRole("link", { name: "View selected work" }).click();
  await expect(page).toHaveURL(/#momentumx$/);
  await expect(page.getByRole("link", { name: "Go to Waypoint 01: MomentumX" })).toHaveAttribute("aria-current", "location");

  await page.getByRole("link", { name: "Diego Martinez, home", exact: true }).click();
  await page.getByRole("link", { name: "Contact me" }).click();
  await expect(page).toHaveURL(/#summit$/);
  await expect(page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: "Contact", exact: true })).toHaveAttribute("aria-current", "location");
  await expect(page.getByRole("progressbar")).toHaveCount(0);
});

test("ordinary wheel and keyboard scrolling moves down and back up without changing the URL", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./#list-view");
  const startingUrl = page.url();
  await settledScrollY(page);
  await page.mouse.move(400, 500);
  await page.mouse.wheel(0, 650);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(300);
  const lowerPosition = await settledScrollY(page);
  await page.mouse.wheel(0, -350);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(lowerPosition);
  const beforePageDown = await settledScrollY(page);
  await page.keyboard.press("PageDown");
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(beforePageDown);
  expect(page.url()).toBe(startingUrl);
  const beforePageUp = await settledScrollY(page);
  await page.keyboard.press("PageUp");
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(beforePageUp);
});

test("Waypoint markers follow manual scrolling, deep links, and viewport changes", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./#veritas");
  await expect(page.locator('[data-waypoint-marker][href="#veritas"]')).toHaveAttribute("aria-current", "location");
  for (const id of ["membership-inference-attack", "high-momentum-scanner", "medvoyage", "hari"]) {
    await page.locator(`#${id}`).evaluate((element) => element.scrollIntoView());
    await expect(page.locator(`[data-waypoint-marker][href="#${id}"]`)).toHaveAttribute("aria-current", "location");
    await expect(page.locator('[data-waypoint-marker][aria-current="location"]')).toHaveCount(1);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  // Let the responsive layout paint before navigating to its new anchor positions.
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
    await document.fonts.ready;
  });
  await page.locator("#hari").evaluate((element) => element.scrollIntoView());
  const hari = page.locator('[data-waypoint-marker][href="#hari"]');
  await expect(hari).toHaveAttribute("aria-current", "location");
  await hari.click();
  await expect(page).toHaveURL(/#hari$/);
  await page.reload();
  await expect(hari).toHaveAttribute("aria-current", "location");
});

test("the navigation view toggle is keyboard reachable and switches both ways", async ({ page }) => {
  await page.goto("./#list-view");
  const navigation = page.getByRole("navigation", { name: "Primary navigation" });
  await navigation.getByRole("link", { name: "Contact", exact: true }).focus();
  await page.keyboard.press("Tab");
  const toggle = navigation.getByRole("button", { name: "Climb view" });
  await expect(toggle).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator(".climb")).toBeVisible();
  await page.getByRole("button", { name: "List view", exact: true }).click();
  await expect(toggle).toBeVisible();
  await expect(page.locator("#list-view")).toBeFocused();
});

test("Waypoint markers provide keyboard navigation and visible focus", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./#list-view");
  const markers = page.getByRole("link", { name: /^Go to Waypoint/ });
  await expect(markers).toHaveCount(6);
  const momentum = page.getByRole("link", { name: "Go to Waypoint 01: MomentumX" });
  await momentum.focus();
  await expect(momentum).toBeFocused();
  await expect(momentum).toBeInViewport();
  expect(await momentum.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe("solid");
  await page.keyboard.press("Tab");
  await expect(page.locator("#momentumx").getByRole("link", { name: "Read case study" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(momentum).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#momentumx$/);

  const veritas = page.getByRole("link", { name: "Go to Waypoint 02: Veritas" });
  await veritas.hover();
  await expect(veritas).toHaveCSS("background-color", "rgb(23, 63, 53)");
});

for (const width of [320, 390, 768, 1440]) {
  test(`SVG Ascent is readable and accessible at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("./#list-view");
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
    const header = page.locator(".site-header");
    const toggle = header.getByRole("button", { name: "Climb view" });
    await expect(toggle).toBeInViewport();
    const buttonBox = await toggle.boundingBox();
    const headerBox = await header.boundingBox();
    expect(buttonBox!.height).toBeGreaterThanOrEqual(44);
    expect(buttonBox!.y + buttonBox!.height).toBeLessThanOrEqual(headerBox!.y + headerBox!.height);
    await expect(page.locator(".route-indicator")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.locator("#momentumx").evaluate((element) => element.scrollIntoView());
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations).toEqual([]);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe("auto");
    expect(await page.locator("#momentumx svg").first().evaluate((element) => getComputedStyle(element).transform)).toBe("none");
  });
}

test("static SVG journey and its native links remain complete without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto("./#list-view");
  await expect(page.getByRole("link", { name: /^Go to Waypoint/ })).toHaveCount(6);
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: "Work", exact: true }).click();
  await expect(page).toHaveURL(/#work$/);
  await expect(page.getByRole("button", { name: "Climb view" })).toHaveCount(0);
  await page.getByRole("link", { name: "Go to Waypoint 01: MomentumX" }).click();
  await expect(page).toHaveURL(/#momentumx$/);
  await page.locator("#momentumx").getByRole("link", { name: "Read case study" }).click();
  await page.getByRole("link", { name: "Standalone Case Study" }).click();
  await expect(page).toHaveURL(/\/portfolio\/work\/momentumx\/$/);
  await expect(page.getByRole("heading", { level: 1, name: "MomentumX" })).toBeVisible();
  await context.close();
});

for (const width of [320, 390, 768, 1440, 1920, 3840]) {
  for (const javaScriptEnabled of [true, false]) {
    test(`Summit artwork fills the section with a complete sun at ${width}px ${javaScriptEnabled ? "with" : "without"} JavaScript`, async ({ browser, baseURL }) => {
      const context = await browser.newContext({ baseURL, javaScriptEnabled, viewport: { width, height: 900 } });
      const page = await context.newPage();
      await page.goto("./#summit");
      await page.evaluate(() => document.fonts.ready);
      const sun = page.locator("#summit .ridge-sun");
      await sun.scrollIntoViewIfNeeded();
      const bounds = await sun.evaluate((element: SVGCircleElement) => {
        const circle = element.getBoundingClientRect();
        const illustration = element.ownerSVGElement!.getBoundingClientRect();
        const landscape = element.ownerSVGElement!.querySelector(".ridge-distance")!.getBoundingClientRect();
        const section = element.closest("section")!.getBoundingClientRect();
        return {
          circle: circle.toJSON(),
          landscape: landscape.toJSON(),
          section: section.toJSON(),
          frames: [illustration.toJSON(), section.toJSON()],
        };
      });
      expect(bounds.landscape.left).toBeLessThanOrEqual(bounds.section.left + 0.5);
      expect(bounds.landscape.right).toBeGreaterThanOrEqual(bounds.section.right - 0.5);
      expect(bounds.circle.width).toBeGreaterThan(0);
      expect(bounds.circle.width).toBeCloseTo(bounds.circle.height, 1);
      for (const frame of bounds.frames) {
        expect(bounds.circle.left).toBeGreaterThanOrEqual(frame.left - 0.5);
        expect(bounds.circle.top).toBeGreaterThanOrEqual(frame.top - 0.5);
        expect(bounds.circle.right).toBeLessThanOrEqual(frame.right + 0.5);
        expect(bounds.circle.bottom).toBeLessThanOrEqual(frame.bottom + 0.5);
      }
      await context.close();
    });
  }
}

for (const [width, id, name] of [
  [1440, "trailhead", "trailhead-desktop"],
  [390, "trailhead", "trailhead-mobile"],
  [1440, "momentumx", "waypoint-desktop"],
  [390, "momentumx", "waypoint-mobile"],
  [1440, "beyond-work", "interlude-desktop"],
  [1440, "summit", "summit-desktop"],
] as const) {
  test(`stable Editorial Alpine snapshot: ${name}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`./#${id}`);
    await page.evaluate(() => document.fonts.ready);
    const target = page.locator(`#${id}`);
    await target.evaluate((element) => element.scrollIntoView());
    await expect(page.locator(".mountain-journey")).toHaveAttribute("data-enhanced", "true");
    await expect(page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "Climb view" })).toBeInViewport();
    if (id === "trailhead") {
      await expect.poll(() => page.getByRole("img", { name: "Diego Martinez" })
        .evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
    }
    await expect(page).toHaveScreenshot(`${name}.png`, { animations: "disabled" });
  });
}
