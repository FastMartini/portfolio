import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { setTheme } from "./helpers/theme";
import { scrollToClimbStop } from "./helpers/climb";

for (const colorScheme of ["light", "dark"] as const) {
  test(`dark is the default on a ${colorScheme} device and a keyboard choice survives reload`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    await page.goto("./#list-view");
    const button = page.getByRole("button", { name: "Dark mode", exact: true });
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await button.focus();
    await page.keyboard.press("Space");
    await expect(button).toHaveAttribute("aria-pressed", "false");
    await page.reload();
    await expect(button).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.emulateMedia({ colorScheme: colorScheme === "dark" ? "light" : "dark" });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await button.focus();
    await page.keyboard.press("Enter");
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await page.reload();
    await expect(button).toHaveAttribute("aria-pressed", "true");
    expect(errors).toEqual([]);
  });
}

test("a saved light preference paints before hydration", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("portfolio-theme", "light"));
  // Only the inline preference script can run when the React bundles are blocked.
  await page.route(/\/_next\/.*\.js(?:\?|$)/, (route) => route.abort());
  await page.goto("./#list-view");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(243, 238, 221)");
  await expect(page.getByRole("banner")).toHaveCSS("color", "rgb(31, 38, 33)");
});

test("unavailable storage leaves the toggle usable for the current visit", async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error("Storage blocked"); };
    Storage.prototype.setItem = () => { throw new Error("Storage blocked"); };
  });
  await page.goto("./#list-view");
  await setTheme(page, "light");
  await expect(page.getByRole("banner")).toHaveCSS("color", "rgb(31, 38, 33)");
  await setTheme(page, "dark");
  await expect(page.getByRole("banner")).toHaveCSS("color", "rgb(236, 230, 210)");
});

test("invalid saved values fall back to dark", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("portfolio-theme", "invalid"));
  await page.goto("./#list-view");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("button", { name: "Dark mode", exact: true })).toHaveAttribute("aria-pressed", "true");
});

test("the selected theme stays synchronized between open tabs", async ({ page, context }) => {
  await page.goto("./#list-view");
  const other = await context.newPage();
  await other.goto("./#list-view");
  await setTheme(page, "light");
  await expect(other.locator("html")).toHaveAttribute("data-theme", "light");
  await setTheme(other, "dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await other.close();
});

for (const width of [320, 390, 1440]) {
  test(`theme controls fit the shared header and preserve the journey at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("./#list-view");
    const header = page.getByRole("banner");
    const button = page.getByRole("button", { name: "Dark mode", exact: true });
    for (const theme of ["dark", "light"] as const) {
      await setTheme(page, theme);
      await expect(header).toHaveCSS("background-color", theme === "dark" ? "rgb(26, 33, 29)" : "rgb(243, 238, 221)");
      const box = (await button.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      const wordmark = (await header.locator(".wordmark").boundingBox())!;
      const view = (await page.getByRole("button", { name: "Climb view", exact: true }).boundingBox())!;
      expect(wordmark.x + wordmark.width).toBeLessThanOrEqual(view.x);
      expect(view.x + view.width).toBeLessThanOrEqual(box.x);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
      expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]);
      if (width !== 320) await page.screenshot({ path: testInfo.outputPath(`list-${theme}-${width}.png`) });
    }
    await page.getByRole("button", { name: "Climb view", exact: true }).click();
    await scrollToClimbStop(page, 3);
    await page.locator('[data-marker="3"]').click();
    const panel = page.getByRole("dialog");
    await expect(panel).toBeVisible();
    for (const theme of ["dark", "light"] as const) {
      await setTheme(page, theme);
      await expect(panel).toHaveCSS("background-color", theme === "dark" ? "rgb(26, 33, 29)" : "rgb(243, 238, 221)");
      await expect(page.locator("#climb")).toHaveAttribute("data-stop", "3");
      await expect(panel).toBeVisible();
    }
  });
}

for (const slug of ["veritas", "momentumx", "membership-inference-attack"]) {
  test(`${slug} keeps the saved theme and accessible reading surfaces`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`./work/${slug}/`);
    for (const theme of ["dark", "light"] as const) {
      await setTheme(page, theme);
      await expect(page.getByRole("banner")).toHaveCSS("background-color", theme === "dark" ? "rgb(26, 33, 29)" : "rgb(243, 238, 221)");
      expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]);
    }
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(page.getByRole("button", { name: "Dark mode", exact: true })).toHaveAttribute("aria-pressed", "false");
  });
}

test("dark content remains readable without JavaScript and inactive controls are hidden", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, colorScheme: "light" });
  const page = await context.newPage();
  await page.goto("./#list-view");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(26, 33, 29)");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator(".theme-toggle")).toBeHidden();
  await context.close();
});
