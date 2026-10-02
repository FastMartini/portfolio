import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("visitor can load the MomentumX Case Study under the site base path", async ({
  page,
}) => {
  await page.goto("./work/momentumx/");

  await expect(page).toHaveTitle("MomentumX — Tokenized U.S. Equity Trading Demo");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    "A ShellHacks 2026 team project pairing a momentum scanner and React interface with Solana devnet trading.",
  );
  await expect(
    page.getByRole("heading", { level: 1, name: "MomentumX" }),
  ).toBeVisible();
});

test("visitor can open the MomentumX Case Study from its Waypoint", async ({ page }) => {
  await page.goto("./#list-view");

  const momentumX = page.locator('[data-waypoint-slug="momentumx"]');
  await momentumX.getByRole("link", { name: "Read case study" }).click();

  await expect(page).toHaveURL(/\/portfolio\/work\/momentumx\/?$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "MomentumX" }),
  ).toBeVisible();
});

test("MomentumX tells a truthful, attributed product story", async ({ page }) => {
  await page.goto("./work/momentumx/");

  for (const section of [
    "The problem",
    "Users and constraints",
    "Key decisions",
    "Technology",
    "Outcome",
    "Limitations",
    "Team and contribution",
  ]) {
    await expect(page.getByRole("heading", { name: section })).toBeVisible();
  }

  await expect(
    page.locator("#outcome").getByText("Winner — MLH Best Use of Solana", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("main")).not.toContainText(/first place overall/i);
  await expect(page.locator("main")).toContainText(
    "demonstration of tokenized U.S. equity trading on Solana devnet",
  );
  await expect(page.locator("main")).toContainText("not a production brokerage");
  await expect(page.locator("main")).toContainText(
    "I built the momentum scanner and React frontend",
  );

  for (const collaborator of [
    "Khalil Peguero",
    "Diego Martinez",
    "Matthew",
    "Justin Cardenas",
  ]) {
    await expect(page.getByText(collaborator, { exact: true })).toBeVisible();
  }

  await expect(page.getByRole("link", { name: "View source repository" })).toHaveAttribute(
    "href",
    "https://github.com/FastMartini/Shellhacks-2026",
  );
});

test("visitor can return from MomentumX to its homepage Waypoint", async ({ page }) => {
  await page.goto("./work/momentumx/");

  await page.getByRole("link", { name: "Back to selected work" }).click();

  await expect(page).toHaveURL(/\/portfolio\/?#momentumx$/);
  await expect(page.locator("#momentumx")).toBeVisible();
});

test("MomentumX keeps its complete Case Study navigation at tablet widths", async ({
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto("./work/momentumx/");

  const navigation = page.getByRole("navigation", { name: "Case Study navigation" });
  for (const linkName of ["Decisions", "Evidence", "Outcome"]) {
    await expect(navigation.getByRole("link", { name: linkName })).toBeVisible();
  }
});

test("MomentumX remains readable and accessible on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./work/momentumx/");

  await expect(page.getByRole("heading", { level: 1, name: "MomentumX" })).toBeVisible();
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
