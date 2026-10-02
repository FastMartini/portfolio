import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { settledScrollY } from "./helpers/native-scroll";

test("conventional navigation reaches sections and updates the Route Indicator on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./#list-view");
  const navigation = page.getByRole("navigation", { name: "Primary navigation" });
  const route = page.getByRole("navigation", { name: "Route Indicator" });

  for (const [label, id, location] of [
    ["About", "about", "About"],
    ["Work", "work", "Selected Work"],
    ["Beyond Work", "beyond-work", "Beyond Work"],
    ["Contact", "summit", "Contact"],
  ]) {
    const link = navigation.getByRole("link", { name: label, exact: true });
    await expect(link).toBeInViewport();
    await link.click();
    await expect(page).toHaveURL(new RegExp(`#${id}$`));
    await expect(link).toHaveAttribute("aria-current", "location");
    await expect(route.getByRole("link", { name: `Go to ${location}`, exact: true })).toHaveAttribute("aria-current", "location");
    await expect(page.locator(`#${id}`)).toBeInViewport();
  }
});

test("Trailhead actions reach MomentumX and the Summit with named elevations", async ({ page }) => {
  await page.goto("./#list-view");
  const location = page.getByRole("complementary", { name: "Mountain Journey location" });
  await expect(location).toContainText("Starting ground");
  await page.getByRole("link", { name: "View selected work" }).click();
  await expect(page).toHaveURL(/#momentumx$/);
  await expect(location).toContainText("MomentumX");
  await expect(location).toContainText("ElevationFirst ridge");
  await expect(page.getByRole("link", { name: "Go to Waypoint 01: MomentumX" })).toHaveAttribute("aria-current", "location");

  await page.getByRole("navigation", { name: "Route Indicator" })
    .getByRole("link", { name: "Go to Trailhead", exact: true }).click();
  await page.getByRole("link", { name: "Contact me" }).click();
  await expect(page).toHaveURL(/#summit$/);
  await expect(location).toContainText("Summit · Looking ahead");
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

test("Route Indicator follows manual scrolling, deep links, and viewport changes", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./#veritas");
  const route = page.getByRole("navigation", { name: "Route Indicator" });
  await expect(route.getByRole("link", { name: "Go to Veritas", exact: true })).toHaveAttribute("aria-current", "location");
  for (const [id, label] of [
    ["membership-inference-attack", "Membership Inference Attack Study"],
    ["high-momentum-scanner", "High-Momentum Scanner"],
    ["medvoyage", "MedVoyage"],
    ["hari", "HaRi"],
  ]) {
    await page.locator(`#${id}`).evaluate((element) => element.scrollIntoView());
    await expect(route.getByRole("link", { name: `Go to ${label}`, exact: true })).toHaveAttribute("aria-current", "location");
    await expect(route.locator('[aria-current="location"]')).toHaveCount(1);
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
  await expect(route.getByRole("link", { name: "Go to HaRi", exact: true })).toHaveAttribute("aria-current", "location");
  await route.getByRole("link", { name: "Go to HaRi", exact: true }).click();
  await expect(page).toHaveURL(/#hari$/);
  await page.reload();
  await expect(route.getByRole("link", { name: "Go to HaRi", exact: true })).toHaveAttribute("aria-current", "location");
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
    await expect(page.getByRole("navigation", { name: "Route Indicator" })).toBeInViewport();
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
  await page.getByRole("navigation", { name: "Route Indicator" }).getByRole("link", { name: "Go to MomentumX", exact: true }).click();
  await expect(page).toHaveURL(/#momentumx$/);
  await page.locator("#momentumx").getByRole("link", { name: "Read case study" }).click();
  await expect(page).toHaveURL(/\/portfolio\/work\/momentumx\/$/);
  await expect(page.getByRole("heading", { level: 1, name: "MomentumX" })).toBeVisible();
  await context.close();
});

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
    await expect(page.getByRole("navigation", { name: "Route Indicator" }).locator('[aria-current="location"]')).toHaveAttribute("href", `#${id}`);
    // Keep these legacy snapshots focused on the unchanged durable List View.
    // The illustrated scene receives its own baselines in phase 7.
    await page.addStyleTag({ content: ".climb-view-toggle { visibility: hidden; }" });
    await expect(page).toHaveScreenshot(`${name}.png`, { animations: "disabled" });
  });
}
