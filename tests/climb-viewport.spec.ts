import { expect, test } from "@playwright/test";
import { scrollToClimbStop } from "./helpers/climb";

test("Tab skips controls clipped by the open panel at the desktop breakpoint", async ({ page }) => {
  await page.setViewportSize({ width: 901, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./");
  await expect(page.locator("#climb")).toBeVisible();
  await scrollToClimbStop(page, 5);
  await page.locator('[data-marker="5"]').click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator(".climb-scene")).toHaveCSS("transform", "matrix(1, 0, 0, 1, -272, 0)");

  const momentum = page.locator('.lm[data-stop="2"]');
  expect((await momentum.boundingBox())!.x + (await momentum.boundingBox())!.width).toBeLessThan(0);
  await page.locator('.lm[data-stop="3"]').focus();
  await page.keyboard.press("Tab");
  await expect(momentum).not.toBeFocused();
  await expect(momentum).toHaveAttribute("tabindex", "-1");
  await expect(momentum).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator('[data-marker="2"]')).toBeHidden();
  await expect(page.locator('[data-marker="2"]')).toHaveAttribute("tabindex", "-1");
});
