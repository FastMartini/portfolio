import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const caseStudyPath = "./work/membership-inference-attack/";
const reportUrl =
  "https://github.com/FastMartini/llm-data-leakage-study/blob/main/Group%231_Membership_Inference_Attack_Report.pdf";

test("membership inference Case Study loads directly and refreshes under the Pages base path", async ({
  page,
}) => {
  const response = await page.goto(caseStudyPath);
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(
    "Membership Inference Attack Study — Classical ML Privacy Research",
  );
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    "A controlled membership-inference experiment using TF-IDF and logistic regression on IMDB reviews.",
  );
  await page.reload();
  await expect(
    page.getByRole("heading", { level: 1, name: "Membership Inference Attack Study" }),
  ).toBeVisible();
});

test("visitor can navigate from the membership Waypoint and return to it", async ({ page }) => {
  await page.goto("./#list-view");
  await page
    .locator('[data-waypoint-slug="membership-inference-attack"]')
    .getByRole("link", { name: "Read case study" })
    .click();
  await expect(page).toHaveURL(/\/portfolio\/work\/membership-inference-attack\/?$/);
  await expect(page.getByRole("heading", { name: "Experiment design" })).toBeVisible();

  await page.getByRole("link", { name: "Back to selected work" }).click();
  await expect(page).toHaveURL(/\/portfolio\/?#membership-inference-attack$/);
  await expect(page.locator("#membership-inference-attack")).toBeVisible();
});

test("study explains classical ML, attack signals, ownership, and collaborators", async ({ page }) => {
  await page.goto(caseStudyPath);
  const main = page.getByRole("main");
  await expect(main).toContainText("classical machine-learning experiment");
  await expect(main).toContainText("TF-IDF");
  await expect(main).toContainText("logistic regression");
  await expect(main).not.toContainText(/\bLLMs?\b|large language model/i);
  await expect(main).toContainText("IMDB’s official training split");
  await expect(main).toContainText("500 non-members from its official test split");
  await expect(main).toContainText("I led the testing and evaluation work");
  await expect(main).toContainText("led the design and execution of testing procedures");
  await expect(main).toContainText("Four-person research team");

  for (const signal of [
    "Maximum confidence",
    "True-class confidence",
    "Loss",
    "Entropy",
    "Correctness",
  ]) {
    await expect(page.getByText(signal, { exact: true })).toBeVisible();
  }
  for (const collaborator of [
    "Diego Martinez",
    "Christian Cevallos",
    "Justin Cardenas",
    "Lucas Ramos",
  ]) {
    await expect(page.getByText(collaborator, { exact: true })).toBeVisible();
  }
  await expect(page.getByRole("heading", { name: "Limitations" })).toBeVisible();
  await expect(main).toContainText("No mitigation evaluation.");
  await expect(main).toContainText("probability outputs and the review’s true sentiment label");
});

test("reported measurements identify the prediction task and evaluation population", async ({ page }) => {
  await page.goto(caseStudyPath);
  const sentiment = page.getByRole("table", { name: "Target sentiment classifier · 1,000 reviews" });
  await expect(sentiment.getByRole("row", { name: "Members 98.2% 500 reviews used to train the target", exact: true })).toBeVisible();
  await expect(sentiment.getByRole("row", { name: "Non-members 76.6% 500 reviews unseen during target training", exact: true })).toBeVisible();

  const attack = page.getByRole("table", { name: "Membership prediction · reported attack metrics" });
  await expect(attack.getByRole("row", { name: "Accuracy 69.2% 70.7%", exact: true })).toBeVisible();
  await expect(attack.getByRole("row", { name: "F1 69.0% 72.3%", exact: true })).toBeVisible();
  await expect(attack.getByRole("row", { name: "ROC-AUC Not reported 0.765", exact: true })).toBeVisible();

  const results = page.getByRole("region", { name: "Results", exact: true });
  await expect(results).toContainText("evaluated on all 1,000 reviews");
  await expect(results).toContainText("trained on 700 rows and was evaluated on the remaining 300");
  await expect(results).toContainText("not a like-for-like estimate of improvement");
  await expect(results).toContainText("0.765 is not 76.5% accuracy");
  await expect(results).toContainText("without confidence intervals or repeated-seed analysis");
});

test("original report evidence loads beneath the base path and sources are linked", async ({ page }) => {
  await page.goto(caseStudyPath);
  const figure = page.getByRole("figure");
  const image = figure.getByRole("img");
  await image.scrollIntoViewIfNeeded();
  await expect(image).toHaveAttribute("src", "/portfolio/work/membership-inference-attack/report-results.png");
  await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
  await expect(figure.getByRole("link", { name: "Read in context" })).toHaveAttribute("href", `${reportUrl}#page=5`);
  await expect(page.getByRole("link", { name: "Read the research report", exact: true })).toHaveAttribute("href", reportUrl);
  await expect(page.getByRole("link", { name: "View source repository", exact: true })).toHaveAttribute("href", "https://github.com/FastMartini/llm-data-leakage-study");
  await expect(page.getByRole("link", { name: "Watch public demo", exact: true })).toHaveAttribute("href", "https://vimeo.com/1182733091/b8a659a24a");
  for (const [name, path] of [
    ["Dataset preparation", "dataset.py"],
    ["Target training", "train.py"],
    ["Attack implementation", "attack.py"],
  ]) {
    await expect(page.getByRole("link", { name, exact: true })).toHaveAttribute("href", `https://github.com/FastMartini/llm-data-leakage-study/blob/main/${path}`);
  }
});

for (const width of [320, 390]) {
  test(`membership inference Case Study is readable and accessible at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(caseStudyPath);
    await expect(page.getByRole("heading", { level: 1, name: "Membership Inference Attack Study" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Limitations" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}
