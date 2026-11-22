import { summitStopIndex } from "../content/journey";
import { expect, test } from "@playwright/test";
import { openClimb, scrollToClimbStop } from "./helpers/climb";
test("List View has a portrait-free typographic opening without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("./");
  await expect(page.locator("#trailhead img, #trailhead [data-paper-piece]")).toHaveCount(0);
  await expect(page.locator("#trailhead .resume-link")).toHaveCount(1);
  await expect(page.locator("#trailhead .resume-link")).toHaveAttribute("href", "/portfolio/resume/Martinez_Diego_2026.pdf");
  await context.close();
});

for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 568 }]) {
  test(`Climb shares the List View introduction without a portrait at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openClimb(page);
    await scrollToClimbStop(page, 0);
    const intro = page.locator('[data-card="0"]');
    await expect(page.locator('[data-card="0"] img, [data-photo-stop]')).toHaveCount(0);
    await expect(intro.locator("h1")).toHaveText(await page.locator("#trailhead-title").textContent() ?? "");
    const listLead = await page.locator("#trailhead .trailhead-lead").evaluate(element =>
      [...element.childNodes].filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent).join("").trim());
    await expect(intro.locator(".trailhead-lead")).toHaveText(listLead);
    await expect(page.locator('[data-card="0"]').getByRole("link", { name: "View résumé (PDF, opens in a new tab)" })).toBeVisible();
    await page.getByRole("button", { name: "List view", exact: true }).click();
    await page.goto("./#trailhead");
    await expect(page.locator("#trailhead img[alt='Diego Martinez']")).toHaveCount(0);
    await expect(page.locator("#trailhead .resume-link")).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test("the portrait-free Climb introduction fades and returns with the Trailhead", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openClimb(page);
  await scrollToClimbStop(page, 0);
  const intro = page.locator('[data-card="0"]');
  await expect(intro).toBeVisible();
  await expect(page.locator('[data-card="0"] img, [data-photo-stop]')).toHaveCount(0);

  await page.locator("#climb").evaluate((element: HTMLElement, intervals) => {
    window.scrollTo(0, 0.32 / intervals * (element.offsetHeight - innerHeight));
  }, summitStopIndex);
  await expect(intro).toHaveCSS("opacity", /^0\.3[0-5]\d*$/);
  await scrollToClimbStop(page, 1);
  await expect(intro).toBeHidden();
  await scrollToClimbStop(page, 0);
  await expect(intro).toBeVisible();
  await expect(intro).toHaveCSS("opacity", "1");
  await expect(page.locator('[data-card="0"] img, [data-photo-stop]')).toHaveCount(0);
});
