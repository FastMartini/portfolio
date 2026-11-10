import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

// Every visitor starts in List View. Scene tests use the real toggle and then
// dismiss its decorative transition with input; sequence tests exercise timing.
export async function enterClimb(page: Page) {
  await page.getByRole("button", { name: "Climb view", exact: true }).click();
  await expect(page.locator("#climb")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".splash--climb")).toHaveCount(0);
}

export async function openClimb(page: Page, theme?: "light" | "dark") {
  if (theme) await page.addInitScript((value) => localStorage.setItem("portfolio-theme", value), theme);
  await page.addInitScript(() => {
    for (const hint of ["deviceMemory", "hardwareConcurrency"]) {
      if (!Object.hasOwn(navigator, hint)) Object.defineProperty(navigator, hint, { value: 8, configurable: true });
    }
  });
  await page.goto("./");
  await enterClimb(page);
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
