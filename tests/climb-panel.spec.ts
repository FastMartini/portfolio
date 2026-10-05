import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { waypoints } from "../content/waypoints";

async function expectAccessiblePanel(page: Page) {
  // The nonmodal panel leaves the mountain usable. Climb/List View tests audit
  // that background separately; these repeated scans target the reading surface.
  const result = await new AxeBuilder({ page }).include("#waypoint-panel")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(result.violations).toEqual([]);
}

async function stop(page: Page, index: number) {
  await page.locator("#climb").evaluate((element, i) =>
    window.scrollTo(0, i / 9 * ((element as HTMLElement).offsetHeight - innerHeight)), index);
  await expect(page.locator("#climb")).toHaveAttribute("data-stop", String(index));
  await expect(page.locator("#climb")).toHaveAttribute("data-settled", "true");
}

test("each marker and its Landmark open canonical Waypoint content and return focus", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./");
  await expect(page.locator("#climb")).toBeVisible();
  const panel = page.getByRole("dialog");
  for (const waypoint of waypoints) {
    const index = waypoint.order + 1;
    await stop(page, index);
    const marker = page.getByRole("button", { name: `Open Waypoint ${String(waypoint.order).padStart(2, "0")}: ${waypoint.name}`, exact: true });
    await expect(marker).toBeVisible();
    await marker.focus();
    await expect(page.locator(`.lm[data-stop="${index}"]`)).toHaveClass(/is-hot/);
    await page.keyboard.press("Enter");
    await expect(panel).toBeVisible();
    await expect(panel.locator("#panel-title")).toHaveText(waypoint.name);
    for (const copy of [waypoint.summary, waypoint.purpose, waypoint.role, waypoint.team, waypoint.owned, waypoint.evidence.detail])
      await expect(panel).toContainText(copy);
    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
    await expect(marker).toBeFocused();
    const hit = await page.locator(`.lm[data-stop="${index}"] ellipse[fill="transparent"]`).evaluate((element) => {
      const box = element.getBoundingClientRect(); return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    });
    await page.mouse.click(hit.x, hit.y);
    await expect(panel.locator("#panel-title")).toHaveText(waypoint.name);
    await panel.getByRole("button", { name: "Close panel" }).click();
    await expect(marker).toBeFocused();
  }
});

test("visible markers tab in Waypoint order; offscreen markers are not tab stops", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./");
  await expect(page.locator("#climb")).toBeVisible();
  await stop(page, 4);
  const visible = page.locator(".climb-marker:not([hidden])");
  const names = await visible.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("aria-label")!));
  expect(names.length).toBeGreaterThan(1);
  await visible.first().focus();
  for (const name of names.slice(1)) {
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name, exact: true })).toBeFocused();
  }
  for (const marker of await page.locator(".climb-marker[hidden]").all())
    await expect(marker).toHaveAttribute("tabindex", "-1");
  const landmark = page.locator('.lm[data-stop="4"]');
  const hit = await landmark.locator('ellipse[fill="transparent"]').evaluate((element) => {
    const box = element.getBoundingClientRect(); return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  });
  await page.mouse.move(hit.x, hit.y);
  await expect(page.locator('[data-marker="4"]')).toHaveAttribute("data-hot", "true");
  await page.mouse.move(5, 5);
  await page.getByRole("button", { name: "List view", exact: true }).focus();
  await expect(landmark).not.toHaveClass(/is-hot/);
});

for (const width of [390, 1440]) {
  for (const waypoint of waypoints.slice(0, 3)) {
    test(`${waypoint.name} panel and embedded MDX Case Study are accessible at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("./");
      await expect(page.locator("#climb")).toBeVisible();
      await stop(page, waypoint.order + 1);
      await page.locator(`[data-marker="${waypoint.order + 1}"]`).click();
      const panel = page.getByRole("dialog");
      await expect(panel).toBeInViewport();
      await expectAccessiblePanel(page);
      await panel.getByRole("link", { name: "Read case study" }).click();
      await expect(panel.locator("#panel-title")).toHaveText(waypoint.name + " · Case Study");
      await expect(panel.getByRole("heading", { name: "Key decisions", exact: true })).toBeVisible();
      await expectAccessiblePanel(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
      await panel.getByRole("button", { name: "Summary" }).click();
      await expect(panel.locator("#panel-title")).toHaveText(waypoint.name);
      await page.emulateMedia({ colorScheme: "dark" });
      await expectAccessiblePanel(page);
      await panel.getByRole("link", { name: "Read case study" }).click();
      await expectAccessiblePanel(page);
      await page.emulateMedia({ colorScheme: "light" });
      await panel.getByRole("button", { name: "Close panel" }).click();
    });
  }
}

test("direct Case Study hashes reveal complete server content without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto("./#case-veritas");
  await expect(page.locator("#case-veritas")).toBeVisible();
  await expect(page.locator("#case-veritas").getByRole("heading", { name: "Veritas", exact: true })).toBeVisible();
  await expect(page.locator(".list-sections")).toBeHidden();
  await page.getByRole("link", { name: "Back to selected work", exact: false }).click();
  await expect(page.locator("#veritas")).toBeVisible();
  await expect(page.locator("#case-veritas")).toBeHidden();
  await context.close();
});

test("nested Case Study hashes switch to List View and keep unique content anchors", async ({ page }) => {
  await page.goto("./");
  await expect(page.locator("#climb")).toBeVisible();
  await page.evaluate(() => { location.hash = "case-veritas-decisions"; });
  await expect(page.locator("#climb")).toBeHidden();
  await expect(page.locator("#case-veritas")).toBeVisible();
  await expect(page.locator("#case-veritas-decisions")).toBeInViewport();
  const duplicates = await page.locator("[id]").evaluateAll((nodes) => {
    const ids = nodes.map((node) => node.id); return ids.filter((id, index) => ids.indexOf(id) !== index);
  });
  expect(duplicates).toEqual([]);
  await page.getByRole("button", { name: "Climb view", exact: true }).click();
  await expect(page.locator("#climb")).toBeVisible();
  await page.goto("./#%invalid");
  await expect(page.locator("#climb")).toBeVisible();
});
