import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { scrollToClimbStop } from "./helpers/climb";

async function expectVisibleTabTargets(page: Page) {
  await expect.poll(() => page.locator('.lm[tabindex="0"], .climb-marker[tabindex="0"]').evaluateAll((nodes) =>
    nodes.filter((node) => {
      const box = node.getBoundingClientRect();
      return box.width === 0 || box.height === 0 || box.right <= 0 || box.left >= innerWidth || box.bottom <= 76 || box.top >= innerHeight;
    }).map((node) => node.getAttribute("aria-label"))), { intervals: [16] }).toEqual([]);
}

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
  const box = (await momentum.boundingBox())!;
  expect(box.x + box.width).toBeLessThan(0);
  await page.locator('.lm[data-stop="3"]').focus();
  await page.keyboard.press("Tab");
  await expect(momentum).not.toBeFocused();
  await expect(page.locator('[data-marker="3"]')).toBeFocused();
  await expect(momentum).toHaveAttribute("tabindex", "-1");
  await expect(momentum).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator('[data-marker="2"]')).toBeHidden();
  await expect(page.locator('[data-marker="2"]')).toHaveAttribute("tabindex", "-1");
  await expect(page.locator('[data-marker="4"]')).toBeHidden();
  await expectVisibleTabTargets(page);
});

test("visibility tracks intermediate scene positions without camera scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 901, height: 900 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("./");
  await expect(page.locator("#climb")).toBeVisible();
  await scrollToClimbStop(page, 5);
  // Seek the real CSS transition to deterministic intermediate frames, rather
  // than racing a 500ms animation on a busy CI runner.
  await page.addStyleTag({ content: ".climb-scene { transition-duration: 10s; }" });
  await page.locator('[data-marker="5"]').click();
  const scene = page.locator(".climb-scene");
  for (const time of [2000, 4000, 8000]) {
    await scene.evaluate((element, time) => {
      const animation = element.getAnimations().find((animation) => animation instanceof CSSTransition && animation.transitionProperty === "transform");
      if (!animation) throw new Error("Panel scene transition did not start");
      animation.pause();
      animation.currentTime = time;
    }, time);
    await expectVisibleTabTargets(page);
  }
  await expect(page.locator('[data-marker="2"]')).toBeHidden();
  await expect(page.locator('.lm[data-stop="2"]')).toHaveAttribute("aria-hidden", "true");
  await scene.evaluate((element) => element.getAnimations().forEach((animation) => animation.finish()));
  await expect(scene).toHaveCSS("transform", "matrix(1, 0, 0, 1, -272, 0)");
  await expectVisibleTabTargets(page);
});

test("open-panel visibility refreshes through breakpoint changes, camera movement, and close", async ({ page }) => {
  await page.setViewportSize({ width: 901, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./");
  await expect(page.locator("#climb")).toBeVisible();
  await scrollToClimbStop(page, 5);
  await page.locator('[data-marker="5"]').click();
  const scene = page.locator(".climb-scene");
  await expect(scene).toHaveCSS("transform", "matrix(1, 0, 0, 1, -272, 0)");
  await expect(page.locator('[data-marker="2"]')).toBeHidden();
  await page.setViewportSize({ width: 900, height: 900 });
  await expect(scene).toHaveCSS("transform", "none");
  await expectVisibleTabTargets(page);
  await page.setViewportSize({ width: 901, height: 900 });
  await expect(scene).toHaveCSS("transform", "matrix(1, 0, 0, 1, -272, 0)");
  await scrollToClimbStop(page, 5);
  await expect(page.locator('[data-marker="2"]')).toBeHidden();
  for (const index of [7, 3, 9]) {
    await scrollToClimbStop(page, index);
    await expectVisibleTabTargets(page);
  }
  await page.getByRole("button", { name: "Close panel" }).click();
  await expect(scene).toHaveCSS("transform", "none");
  await expect(page.locator('[data-marker="5"]')).toBeFocused();
  await expectVisibleTabTargets(page);
});

for (const motion of ["reduce", "no-preference"] as const) {
  test(`List View deep-link startup exposes visible Landmarks to Tab with ${motion} motion`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: motion });
    await page.goto("./#case-veritas");
    await expect(page.locator("#climb")).toBeHidden();
    await page.getByRole("button", { name: "Climb view", exact: true }).click();
    await expect(page.locator("#climb")).toBeVisible();
    await scrollToClimbStop(page, 5);

    const momentum = page.locator('.lm[data-stop="2"]');
    await expect(page.locator('[data-marker="2"]')).toBeVisible();
    const box = (await momentum.boundingBox())!;
    expect(box.width).toBeGreaterThan(0);
    expect(box.height).toBeGreaterThan(0);
    expect(box.x + box.width).toBeGreaterThan(0);
    expect(box.x).toBeLessThan(1440);
    expect(box.y + box.height).toBeGreaterThan(76);
    expect(box.y).toBeLessThan(900);
    // Avoid native SVG focus scrolling: only the real Tab step should change focus.
    await page.locator('.lm[data-stop="3"]').evaluate((element) => element.focus({ preventScroll: true }));
    await page.keyboard.press("Tab");
    await expect(momentum).toBeFocused();
    await expect(momentum).toHaveAttribute("tabindex", "0");
    await expect(momentum).toHaveAttribute("aria-hidden", "false");
    await expect(momentum).toHaveClass(/is-hot/);
    await expect(page.locator('[data-marker="2"]')).toHaveAttribute("data-hot", "true");
    await expectVisibleTabTargets(page);
  });

  test(`dismissal restores a marker clipped by panel movement with ${motion} motion`, async ({ page }) => {
    await page.setViewportSize({ width: 901, height: 900 });
    await page.emulateMedia({ reducedMotion: motion });
    await page.goto("./");
    await expect(page.locator("#climb")).toBeVisible();
    await scrollToClimbStop(page, 5);
    const marker = page.locator('[data-marker="2"]');
    await marker.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.locator(".climb-scene")).toHaveCSS("transform", "matrix(1, 0, 0, 1, -272, 0)");
    await expect(marker).toBeHidden();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(marker).toBeFocused();
    await expectVisibleTabTargets(page);
  });
}
