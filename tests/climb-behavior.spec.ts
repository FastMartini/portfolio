import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { openClimb } from "./helpers/climb";
import type { Page } from "@playwright/test";
import { journeyStops } from "../content/journey";
import { readClimbProgress } from "../components/climb/progress";
import { colorCss, weather } from "../components/climb/weather";
import { settledScrollY } from "./helpers/native-scroll";

async function scrollToStop(page: Page, index: number) {
  await page.locator("#climb").evaluate((element, stop) => {
    const top = element.getBoundingClientRect().top + window.scrollY;
    window.scrollTo(0, top + stop / 9 * ((element as HTMLElement).offsetHeight - window.innerHeight));
  }, index);
  await expect(page.locator("#climb")).toHaveAttribute("data-stop", String(index));
  await expect(page.locator("#climb")).toHaveAttribute("data-settled", "true");
}

test("scroll mapping preserves equal shares, exact stops, and the reference dwell", () => {
  expect(readClimbProgress(-1).position).toBe(0);
  expect(readClimbProgress(2).position).toBe(1);
  journeyStops.forEach((stop, index) => {
    expect(readClimbProgress(index / 9).position).toBeCloseTo(stop.trailPosition, 12);
    if (index < 9) {
      expect(readClimbProgress((index + 0.17) / 9).position).toBe(stop.trailPosition);
      expect(readClimbProgress((index + 0.83) / 9).position).toBe(journeyStops[index + 1].trailPosition);
      expect(readClimbProgress((index + 0.5) / 9).position).toBeCloseTo((stop.trailPosition + journeyStops[index + 1].trailPosition) / 2, 12);
    }
  });
});

test("altitude weather preserves morning, snowfall, white-out, and clear summit keyframes", () => {
  expect(colorCss(weather(0).top)).toBe("rgb(231,220,192)");
  expect(colorCss(weather(0.7).top)).toBe("rgb(143,154,161)");
  expect(weather(0.5).snow).toBe(0);
  expect(weather(0.7).snow).toBe(1);
  expect(weather(0.88).snow).toBe(0);
  expect(weather(0.88).haze).toBe(0.85);
  expect(weather(1).haze).toBe(0);
  expect(weather(1).sun).toBe(1);
  expect(colorCss(weather(1).top)).toBe("rgb(43,120,204)");
});

test("all ten stops show their card or Trail Sign and update the bottom-to-top Trail Rail", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openClimb(page);
  const root = page.locator("#climb");
  await expect(root).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Software engineer building intelligent, data-driven products.");
  await expect(page.locator(".climb-stage")).toHaveCSS("position", "sticky");
  const rail = page.getByRole("navigation", { name: "Trail stops" });
  expect(await rail.locator("button").evaluateAll((buttons) => buttons.map((button) => Number((button as HTMLElement).dataset.rail)))).toEqual([9, 8, 7, 6, 5, 4, 3, 2, 1, 0]);
  const svg = await page.locator("svg.mtn").elementHandle();
  for (let index = 0; index < 10; index++) {
    await scrollToStop(page, index);
    await expect(rail.locator('[aria-current="step"]')).toHaveAttribute("data-rail", String(index));
    expect(Number(await root.getAttribute("data-position"))).toBeCloseTo(journeyStops[index].trailPosition, 4);
    if ([0, 1, 8, 9].includes(index)) {
      await expect(page.locator(`[data-card="${index}"]`)).toBeVisible();
      await expect(page.locator('.climb-card[data-active="true"]')).toHaveCount(1);
      await expect(page.locator(".climb-trail-sign")).toBeHidden();
    } else {
      await expect(page.locator('.climb-card[data-active="true"]')).toHaveCount(0);
      await expect(page.locator(".climb-sign-name")).toHaveText(journeyStops[index].label);
      await expect(page.getByRole("button", { name: "Open Waypoint →", exact: true })).toHaveAttribute("data-open-stop", String(index));
    }
  }
  expect(await svg!.evaluate((element) => element === document.querySelector("svg.mtn"))).toBe(true);
  await expect(page.locator(".climb-stage")).toHaveCSS("--sky-top", "rgb(43,120,204)");
  await expect(page.locator(".climb-stage")).toHaveCSS("--sun", "1.000");
  await expect(page.getByRole("link", { name: "Email Diego" })).toHaveAttribute("href", "mailto:diegommart2004@gmail.com");
  await rail.getByRole("button", { name: "Go to Trailhead", exact: true }).click();
  await expect(root).toHaveAttribute("data-stop", "0");
  await rail.getByRole("button", { name: "Go to Waypoint 02: Veritas", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(root).toHaveAttribute("data-stop", "3");
});

test("wheel and page keys remain native, reversible, and leave the URL unchanged", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openClimb(page);
  await expect(page.locator("#climb")).toBeVisible();
  const url = page.url();
  await settledScrollY(page);
  await page.mouse.move(1100, 500);
  await page.mouse.wheel(0, 800);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(500);
  const lower = await settledScrollY(page);
  await page.mouse.wheel(0, -400);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(lower);
  const before = await settledScrollY(page);
  await page.keyboard.press("PageDown");
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before);
  const after = await settledScrollY(page);
  await page.keyboard.press("PageUp");
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(after);
  expect(page.url()).toBe(url);
  expect(await page.locator(".climb-stage").evaluate((element) => element.getBoundingClientRect().top)).toBe(0);
});

test("List View toggle and Waypoint hashes preserve full text, focus, routes, and climb position", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openClimb(page);
  await expect(page.locator("#climb")).toBeVisible();
  await scrollToStop(page, 3);
  const before = await page.evaluate(() => window.scrollY);
  await page.evaluate(() => { location.hash = "veritas"; });
  await expect(page).toHaveURL(/#veritas$/);
  await expect(page.locator("#veritas")).toBeInViewport();
  await expect(page.locator("#list-view")).toBeFocused();
  await expect(page.locator("#climb")).toBeHidden();
  await page.getByRole("button", { name: "Climb view", exact: true }).click();
  await expect(page).toHaveURL(/\/portfolio\/$/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeCloseTo(before, 0);
  await expect(page.locator("#climb")).toHaveAttribute("data-stop", "3");
  await page.getByRole("button", { name: "List view", exact: true }).click();
  await expect(page).toHaveURL(/#list-view$/);
  await expect(page.locator("#list-view")).toBeFocused();
  await expect(page.locator("#veritas h3")).toBeVisible();
  await page.goto("./#veritas");
  await expect(page.locator("#veritas")).toBeInViewport();
  await expect(page.getByRole("button", { name: "Climb view", exact: true })).toBeVisible();
  await page.locator("#veritas").getByRole("link", { name: "Read case study" }).click();
  await expect(page).toHaveURL(/#case-veritas$/);
  await expect(page.locator("#case-veritas")).toBeVisible();
  await page.getByRole("link", { name: "Standalone Case Study" }).click();
  await expect(page).toHaveURL(/\/portfolio\/work\/veritas\/$/);
  await page.getByRole("link", { name: "Back to selected work" }).click();
  await expect(page).toHaveURL(/\/portfolio\/#veritas$/);
  await expect(page.locator("#veritas")).toBeInViewport();
});

test("snow starts at altitude, clears on live reduced-motion changes, and stops outside Climb view", async ({ page }) => {
  await openClimb(page);
  await expect(page.locator("#climb")).toBeVisible();
  await scrollToStop(page, 6);
  const snow = page.locator(".climb-snow");
  await expect(snow).toHaveAttribute("data-flakes", "320");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(snow).toHaveAttribute("data-flakes", "0");
  expect(await snow.evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    return canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height).data.some((channel) => channel !== 0);
  })).toBe(false);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator("#list-view")).toBeVisible();
  await page.getByRole("button", { name: "Climb view", exact: true }).click();
  await expect(snow).toHaveAttribute("data-flakes", "320");
  await page.getByRole("button", { name: "List view", exact: true }).click();
  await expect(snow).toHaveAttribute("data-flakes", "0");
});

for (const width of [390, 1440]) {
  for (const index of [0, 1, 8, 9]) {
    test(`${journeyStops[index].label} card is accessible at ${width}px in either theme`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "light" });
      await openClimb(page);
      await expect(page.locator("#climb")).toBeVisible();
      await scrollToStop(page, index);
      const card = page.locator(`[data-card="${index}"]`);
      await expect(card).toBeInViewport();
      expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]);
      const sky = await page.locator(".climb-stage").evaluate((element) => getComputedStyle(element).getPropertyValue("--sky-top"));
      await page.emulateMedia({ colorScheme: "dark" });
      await expect(card).toHaveCSS("background-color", "rgb(37, 47, 41)");
      expect(await page.locator(".climb-stage").evaluate((element) => getComputedStyle(element).getPropertyValue("--sky-top"))).toBe(sky);
      expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
    });
  }
  test(`every Waypoint Trail Sign and action fit at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openClimb(page);
    await expect(page.locator("#climb")).toBeVisible();
    for (let index = 2; index <= 7; index++) {
      await scrollToStop(page, index);
      await expect(page.locator(".climb-sign-name")).toHaveText(journeyStops[index].label);
      await expect(page.getByRole("button", { name: "Open Waypoint →", exact: true })).toBeInViewport();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  });
  test(`dark List View is accessible at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "dark" });
    await openClimb(page);
    await expect(page.locator("#climb")).toBeVisible();
    await page.getByRole("button", { name: "List view", exact: true }).click();
    await expect(page.locator(".climb-list")).toHaveCSS("background-color", "rgb(26, 33, 29)");
    await page.locator("#momentumx").evaluate((element) => element.scrollIntoView());
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]);
  });
}

test("without JavaScript only the complete List View is mounted", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("./");
  await expect(page.locator("#list-view")).toBeVisible();
  await expect(page.locator("#climb")).toHaveCount(0);
  await expect(page.locator("#list-view [data-waypoint-slug]")).toHaveCount(6);
  await expect(page.getByRole("heading", { name: "Let's build what comes next." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Climb view" })).toHaveCount(0);
  await context.close();
});
