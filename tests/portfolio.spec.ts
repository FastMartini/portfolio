import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("visitor understands Diego's professional identity at the Trailhead", async ({
  page,
}) => {
  await page.goto("./");

  await expect(page).toHaveTitle("Diego Martinez — Software Engineer");
  await expect(page.getByRole("banner")).toContainText("Diego Martinez");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Software engineer building intelligent, data-driven products.",
    }),
  ).toBeVisible();
});

test("visitor follows the Mountain Journey and reaches direct contact options", async ({
  page,
}) => {
  await page.goto("./");

  await expect(
    page.getByRole("heading", { level: 2, name: "Engineering with intent." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "Beyond the build." }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Contact me" }).click();

  await expect(page).toHaveURL(/#summit$/);
  await expect(
    page.getByRole("heading", { level: 2, name: "Let's build what comes next." }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Email Diego" })).toHaveAttribute(
    "href",
    "mailto:diegommart2004@gmail.com",
  );
  await expect(page.getByRole("link", { name: "LinkedIn" })).toHaveAttribute(
    "href",
    "https://www.linkedin.com/in/diegomartinez30",
  );
  await expect(page.getByRole("link", { name: "GitHub" })).toHaveAttribute(
    "href",
    "https://github.com/FastMartini",
  );
});

test("portfolio remains complete without client-side JavaScript", async ({
  baseURL,
  browser,
}) => {
  const context = await browser.newContext({
    baseURL,
    javaScriptEnabled: false,
  });
  const page = await context.newPage();

  await page.goto("./");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Software engineer building intelligent, data-driven products.",
    }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Engineering with intent." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Beyond the build." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Let's build what comes next." })).toBeVisible();

  const resumeStatus = page.getByText("Résumé — coming soon", { exact: true });
  await expect(resumeStatus).toBeVisible();
  await expect(page.getByRole("link", { name: /résumé/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /résumé/i })).toHaveCount(0);
  await expect(page.locator("form, audio")).toHaveCount(0);

  await context.close();
});

test("keyboard visitor can enter the Mountain Journey", async ({ page }) => {
  await page.goto("./");

  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/#main-content$/);
});

test("Editorial Alpine foundation uses the approved visual tokens", async ({ page }) => {
  await page.goto("./");

  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(243, 238, 221)");
  await expect(page.locator("#about")).toHaveCSS("background-color", "rgb(23, 63, 53)");
  await expect(page.locator("#summit")).toHaveCSS("background-color", "rgb(31, 38, 33)");

  const headingFont = await page.locator("h1").evaluate(
    (element) => getComputedStyle(element).fontFamily,
  );
  const bodyFont = await page.locator("body").evaluate(
    (element) => getComputedStyle(element).fontFamily,
  );

  expect(headingFont).toContain("Newsreader");
  expect(bodyFont).toContain("Manrope");
});

test("mobile visitor receives a stable, readable layout", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./");

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText("Diego Martinez", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Contact", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Email Diego" })).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});

test("page has no detectable WCAG AA violations", async ({ page }) => {
  await page.goto("./");

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  expect(results.violations).toEqual([]);
});
