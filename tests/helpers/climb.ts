import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

export async function scrollToClimbStop(page: Page, index: number) {
  await page.locator("#climb").evaluate((element, i) =>
    window.scrollTo(0, i / 9 * ((element as HTMLElement).offsetHeight - innerHeight)), index);
  await expect(page.locator("#climb")).toHaveAttribute("data-stop", String(index));
  await expect(page.locator("#climb")).toHaveAttribute("data-settled", "true");
}
