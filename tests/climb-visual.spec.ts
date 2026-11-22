import { summitStopIndex } from "../content/journey";
import { expect, test } from "@playwright/test";
import { openClimb, scrollToClimbStop } from "./helpers/climb";

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  for (const theme of ["light", "dark"] as const) {
    for (const [index, name] of [[0, "trailhead"], [4, "waypoint-03"], [7, "waypoint-06"], [summitStopIndex, "summit"]] as const) {
      test(`illustrated Climb ${theme} snapshot: ${name} at ${viewport.width}px`, async ({ page }) => {
        await page.setViewportSize(viewport);
        // Choose the application theme explicitly; device preference is independent.
        await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "light" });
        await openClimb(page, theme);
        await expect(page.locator("#climb")).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
        await scrollToClimbStop(page, index);
        await expect(page.locator("#climb")).toHaveAttribute("data-stop", String(index));
        await expect(page.locator("#climb")).toHaveAttribute("data-settled", "true");
        // Freeze SVG SMIL at a named frame; CSS animation disabling doesn't seek
        // SVG timelines, and pausing at hydration time alone is nondeterministic.
        await page.locator("svg.climb-layer-svg").evaluateAll((nodes) => {
          nodes.forEach((node) => { const svg = node as SVGSVGElement; svg.pauseAnimations(); svg.setCurrentTime(0); });
        });
        if (index === 0 || index === summitStopIndex) {
          await expect(page.locator(`[data-card="${index}"]`)).toBeVisible();
          await expect(page.locator(`[data-card="${index}"]`)).toHaveCSS("background-color", theme === "light" ? "rgb(255, 251, 237)" : "rgb(37, 47, 41)");
        }
        else await expect(page.locator(`[data-marker="${index}"]`)).toBeVisible();
        if (index === 0) {
          await expect(page.locator('[data-card="0"] img')).toHaveCount(0);
        }
        await expect(page).toHaveScreenshot(`${theme === "dark" ? "dark-" : ""}${name}-${viewport.width < 600 ? "mobile" : "desktop"}.png`, { animations: "disabled" });
      });
    }
  }
}
