import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

// Reduced-motion visitors now start in List View. Scene-specific tests opt in
// through the real toggle; no fixture bypasses the production preference policy.
export async function openClimb(page: Page) {
  await page.addInitScript(() => {
    for (const hint of ["deviceMemory", "hardwareConcurrency"]) {
      if (!Object.hasOwn(navigator, hint)) Object.defineProperty(navigator, hint, { value: 8, configurable: true });
    }
  });
  await page.goto("./");
  if (await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)) {
    await page.getByRole("button", { name: "Climb view", exact: true }).click();
  }
  await expect(page.locator("#climb")).toBeVisible();
}

export async function scrollToClimbStop(page: Page, index: number) {
  // Visible markup can precede the initial view-position effect in WebKit.
  // Wait for the first rendered frame before scrolling so restoration cannot
  // race the test's navigation and send it back to Trailhead.
  await expect(page.locator("#climb")).toHaveAttribute("data-settled", "true", { timeout: 15000 });
  await page.locator("#climb").evaluate((element, i) =>
    window.scrollTo(0, i / 9 * ((element as HTMLElement).offsetHeight - innerHeight)), index);
  await expect(page.locator("#climb")).toHaveAttribute("data-stop", String(index));
  // Normal-motion and controlled-clock checks still need real paint frames on
  // a busy multi-browser runner; wait for the observable settled state.
  await expect(page.locator("#climb")).toHaveAttribute("data-settled", "true", { timeout: 15000 });
}
