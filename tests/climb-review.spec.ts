import { expect, test } from "@playwright/test";
import { waypoints } from "../content/waypoints";
import { scrollToClimbStop as stop } from "./helpers/climb";

for (const waypoint of waypoints) {
  test(`${waypoint.name} Landmark independently supports named keyboard focus and activation`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("./");
    await expect(page.locator("#climb")).toBeVisible();
    const index = waypoint.order + 1;
    await stop(page, index);
    const landmark = page.locator(`.lm[data-stop="${index}"]`);
    await landmark.focus();
    await expect(landmark).toBeFocused();
    await expect(landmark).toHaveAccessibleName(`Open ${waypoint.name} Landmark`);
    await expect(landmark).toHaveAttribute("role", "button");
    await expect(landmark).toHaveClass(/is-hot/);
    await expect(page.locator(`[data-marker="${index}"]`)).toHaveAttribute("data-hot", "true");
    for (const key of ["Enter", "Space"]) {
      await landmark.focus();
      await page.keyboard.press(key);
      await expect(page.getByRole("dialog").locator("#panel-title")).toHaveText(waypoint.name);
      await expect(landmark).toHaveAttribute("aria-expanded", "true");
      await page.keyboard.press("Escape");
      await expect(page.locator(`[data-marker="${index}"]`)).toBeFocused();
      await expect(landmark).toHaveAttribute("aria-expanded", "false");
    }
  });
}

test("offscreen Landmarks are excluded from keyboard navigation and the accessibility tree", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./");
  await expect(page.locator("#climb")).toBeVisible();
  await stop(page, 4);
  const visible = page.locator('.lm[tabindex="0"]');
  await expect(visible.first()).toHaveAttribute("aria-hidden", "false");
  await visible.first().focus();
  await page.keyboard.press("Tab");
  await expect(visible.nth(1)).toBeFocused();
  await stop(page, 9);
  for (const landmark of await page.locator(".lm").all()) {
    await expect(landmark).toHaveAttribute("tabindex", "-1");
    await expect(landmark).toHaveAttribute("aria-hidden", "true");
  }
});

for (const width of [390, 1440]) {
  test(`List View toggle remains usable from an open panel at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("./");
    await expect(page.locator("#climb")).toBeVisible();
    await stop(page, 3);
    await page.locator('[data-marker="3"]').click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "List view", exact: true }).click();
    await expect(page.locator("#list-view")).toBeVisible();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.locator("#list-view")).toBeFocused();
    await page.getByRole("button", { name: "Climb view", exact: true }).click();
    await expect(page.locator("#climb")).toHaveAttribute("data-stop", "3");
    // Nonmodal panel must not trap keyboard visitors away from the toggle.
    await page.locator('[data-marker="3"]').click();
    await page.getByRole("dialog").locator("a[href], button").last().focus();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "List view", exact: true })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#list-view")).toBeVisible();
  });
}

for (const dismissal of ["Escape", "Close"] as const) {
  for (const reducedMotion of ["reduce", "no-preference"] as const) {
    test(`${dismissal} restores the opening marker after native scroll with ${reducedMotion} motion`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.emulateMedia({ reducedMotion });
      await page.goto("./");
      await expect(page.locator("#climb")).toBeVisible();
      await stop(page, 3);
      const marker = page.locator('[data-marker="3"]');
      await marker.click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.mouse.move(400, 450);
      await page.mouse.wheel(0, 10000);
      await expect(page.locator("#climb")).toHaveAttribute("data-stop", "9");
      await expect(marker).toBeHidden();
      if (dismissal === "Escape") await page.keyboard.press("Escape");
      else await page.getByRole("button", { name: "Close panel" }).click();
      await expect(page.getByRole("dialog")).toBeHidden();
      await expect(marker).toBeFocused();
      await expect(marker).toBeInViewport();
      await expect(page.locator("#climb")).toHaveAttribute("data-stop", "3");
    });
  }
}
