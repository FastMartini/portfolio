import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

// Native page-key scrolling can animate even with CSS reduced motion. Observe
// its final position before reversing direction, rather than sampling midway.
export async function settledScrollY(page: Page) {
  let previous = Number.NaN, stable = 0;
  await expect.poll(async () => {
    const position = await page.evaluate(() => window.scrollY);
    stable = position === previous ? stable + 1 : 0;
    previous = position;
    return stable;
  }, { intervals: [50] }).toBeGreaterThanOrEqual(4);
  return previous;
}
