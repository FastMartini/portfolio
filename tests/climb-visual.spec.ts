import { expect, test } from "@playwright/test";
import { openClimb } from "./helpers/climb";

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  for (const [index, name] of [[0, "trailhead"], [4, "waypoint-03"], [7, "waypoint-06"], [9, "summit"]] as const) {
    test(`illustrated Climb snapshot: ${name} at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "light" });
      await openClimb(page);
      await expect(page.locator("#climb")).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await page.locator("#climb").evaluate((element, stop) =>
        window.scrollTo(0, stop / 9 * ((element as HTMLElement).offsetHeight - innerHeight)), index);
      await expect(page.locator("#climb")).toHaveAttribute("data-stop", String(index));
      await expect(page.locator("#climb")).toHaveAttribute("data-settled", "true");
      // Freeze SVG SMIL at a named frame; CSS animation disabling doesn't seek
      // SVG timelines, and pausing at hydration time alone is nondeterministic.
      await page.locator("svg.mtn").evaluate((node) => {
        const svg = node as SVGSVGElement; svg.pauseAnimations(); svg.setCurrentTime(0);
      });
      if (index === 0 || index === 9) await expect(page.locator(`[data-card="${index}"]`)).toBeVisible();
      else await expect(page.locator(`[data-marker="${index}"]`)).toBeVisible();
      await expect(page).toHaveScreenshot(`${name}-${viewport.width < 600 ? "mobile" : "desktop"}.png`, { animations: "disabled" });
    });
  }
}
