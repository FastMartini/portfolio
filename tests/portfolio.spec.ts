import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("visitor understands Diego's professional identity at the Trailhead", async ({
  page,
}) => {
  await page.goto("./#list-view");

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
  await page.goto("./#list-view");

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

  await page.goto("./#list-view");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Software engineer building intelligent, data-driven products.",
    }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Engineering with intent." })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Built, tested, and learned in public." }),
  ).toBeVisible();
  await expect(page.locator("[data-waypoint-slug]")).toHaveCount(6);
  await expect(page.getByRole("heading", { name: "Beyond the build." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Let's build what comes next." })).toBeVisible();

  const resumeStatus = page.getByText("Résumé — coming soon", { exact: true });
  await expect(resumeStatus).toBeVisible();
  await expect(page.getByRole("link", { name: /résumé/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /résumé/i })).toHaveCount(0);
  await expect(page.locator("form, audio")).toHaveCount(0);

  await context.close();
});

test("keyboard visitor can enter the full text from the Climb", async ({ page }) => {
  await page.goto("./");
  await expect(page.locator("#climb")).toBeVisible();

  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to full text" })).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/#list-view$/);
  await expect(page.locator("#list-view")).toBeFocused();
});

test("Editorial Alpine foundation uses the approved visual tokens", async ({ page }) => {
  await page.goto("./#list-view");

  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(243, 238, 221)");
  await expect(page.locator("#about")).toHaveCSS("background-color", "rgb(23, 63, 53)");
  await expect(page.locator("#summit")).toHaveCSS("background-color", "rgb(31, 38, 33)");

  const headingFont = await page.locator("#list-view h1").evaluate(
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
  await page.goto("./#list-view");

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("banner").getByText("Diego Martinez", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Contact", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Email Diego" })).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});

test("page has no detectable WCAG AA violations", async ({ page }) => {
  await page.goto("./#list-view");

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  expect(results.violations).toEqual([]);
});

test("Mountain Journey presents Waypoints strongest first with the approved tiers", async ({
  page,
}) => {
  await page.goto("./#list-view");

  const waypoints = page.locator("[data-waypoint-slug]");
  await expect(waypoints).toHaveCount(6);
  await expect(waypoints.locator("h3")).toHaveText([
    "MomentumX",
    "Veritas",
    "Membership Inference Attack Study",
    "High-Momentum Scanner",
    "MedVoyage",
    "HaRi",
  ]);

  await expect(waypoints.locator(".waypoint-meta span:first-child")).toHaveText([
    "Full Case Study",
    "Full Case Study",
    "Full Case Study",
    "Compact Waypoint",
    "Compact Waypoint",
    "Compact Waypoint",
  ]);
});

test("Waypoint claims preserve attribution and factual boundaries", async ({ page }) => {
  await page.goto("./#list-view");

  const momentumX = page.locator('[data-waypoint-slug="momentumx"]');
  await expect(momentumX).toContainText("Winner — MLH Best Use of Solana");
  await expect(momentumX).toContainText(/scanner and React interface/i);

  const veritas = page.locator('[data-waypoint-slug="veritas"]');
  await expect(veritas.locator(".waypoint-outcomes")).toContainText(
    "Integrated extension and backend analysis flow",
  );
  await expect(veritas).toContainText("political leaning");
  await expect(veritas.locator(".waypoint-evidence")).toContainText(
    "not a fake-news detector or truth-verification system",
  );

  const privacyStudy = page.locator(
    '[data-waypoint-slug="membership-inference-attack"]',
  );
  await expect(privacyStudy).toContainText("TF-IDF and logistic regression");
  await expect(privacyStudy).not.toContainText(/\bLLM\b/i);

  const medVoyage = page.locator('[data-waypoint-slug="medvoyage"]');
  await expect(medVoyage).toContainText("Third Place Overall at ShellHacks 2023");
  await expect(medVoyage).toContainText("not a clinically validated medical system");
});

test("High-Momentum Scanner evidence is useful without exposing private implementation", async ({
  page,
}) => {
  await page.goto("./#list-view");

  const scanner = page.locator('[data-waypoint-slug="high-momentum-scanner"]');
  await expect(scanner).toContainText("Solo project");
  await expect(scanner).toContainText("SUNE");
  await expect(scanner).toContainText("SUNation Energy");
  await expect(scanner).toContainText("private Suniva");
  await expect(scanner).toContainText("scanner-observed");
  await expect(scanner).toContainText("likely catalyst, not proven causation");
  await expect(scanner).toContainText("Private implementation");
  await expect(scanner).not.toContainText(/Alpaca|Finnhub|RVOL formula|source code/i);
});

test("Trailhead reaches the first Waypoint and links every published Case Study", async ({
  page,
}) => {
  await page.goto("./#list-view");

  await page.getByRole("link", { name: "View selected work" }).click();
  await expect(page).toHaveURL(/#momentumx$/);
  await expect(page.locator("#momentumx")).toBeVisible();
  await expect(
    page
      .locator('[data-waypoint-slug="momentumx"]')
      .getByRole("link", { name: "Read case study" }),
  ).toHaveAttribute(
    "href",
    "#case-momentumx",
  );
  await expect(
    page
      .locator('[data-waypoint-slug="veritas"]')
      .getByRole("link", { name: "Read case study" }),
  ).toHaveAttribute(
    "href",
    "#case-veritas",
  );
  await expect(
    page
      .locator('[data-waypoint-slug="membership-inference-attack"]')
      .getByRole("link", { name: "Read case study" }),
  ).toHaveAttribute("href", "#case-membership-inference-attack");
  await expect(page.locator('a[href*="/work/"]')).toHaveCount(3);
  await expect(page.locator("body")).not.toContainText("Grassroots");
});
