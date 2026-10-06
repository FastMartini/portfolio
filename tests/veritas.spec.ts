import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("visitor can load the Veritas Case Study under the site base path", async ({
  page,
}) => {
  await page.goto("./work/veritas/");

  await expect(page).toHaveTitle("Veritas — Political-Leaning Analysis Extension");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    "A capstone Chrome extension for examining source, language, and framing signals in political news.",
  );
  await expect(
    page.getByRole("heading", { level: 1, name: "Veritas" }),
  ).toBeVisible();
});

test("visitor can open the Veritas Case Study from its Waypoint", async ({ page }) => {
  await page.goto("./#list-view");

  const veritas = page.locator('[data-waypoint-slug="veritas"]');
  await veritas.getByRole("link", { name: "Read case study" }).click();
  await page.getByRole("link", { name: "Standalone Case Study" }).click();

  await expect(page).toHaveURL(/\/portfolio\/work\/veritas\/?$/);
  await expect(page.getByRole("heading", { level: 1, name: "Veritas" })).toBeVisible();
});

test("Veritas states its purpose, ownership, team, and product boundary", async ({
  page,
}) => {
  await page.goto("./work/veritas/");

  for (const section of [
    "The problem",
    "Users and constraints",
    "Key decisions",
    "Technology",
    "Team and contribution",
    "Outcome",
    "Limitations",
  ]) {
    await expect(page.getByRole("heading", { name: section })).toBeVisible();
  }

  const main = page.locator("main");
  await expect(main).toContainText(
    "estimates the political leaning of news articles from source, language, and framing signals",
  );
  await expect(main).toContainText(
    "I led the architecture and built the backend-to-extension analysis flow",
  );
  await expect(main).toContainText(
    "it is not a fake-news detector or truth-verification system",
  );
  await expect(main).toContainText("No deployment, award, measured accuracy, or business impact is claimed.");

  for (const collaborator of [
    "Diego Martinez",
    "Christian Cevallos",
    "Justin Cardenas",
    "Jhonny Felix",
  ]) {
    await expect(page.getByText(collaborator, { exact: true })).toBeVisible();
  }

  await expect(page.getByRole("link", { name: "View source repository" })).toHaveAttribute(
    "href",
    "https://github.com/FastMartini/Veritas",
  );
  await expect(page.getByRole("list", { name: "Veritas system architecture" })).toBeVisible();
});

test("visitor can return from Veritas to its homepage Waypoint", async ({ page }) => {
  await page.goto("./work/veritas/");

  await page.getByRole("link", { name: "Back to selected work" }).click();

  await expect(page).toHaveURL(/\/portfolio\/?#veritas$/);
  await expect(page.locator("#veritas")).toBeVisible();
});

test("Veritas remains readable and accessible on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./work/veritas/");

  await expect(page.getByRole("heading", { level: 1, name: "Veritas" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Limitations" })).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});
