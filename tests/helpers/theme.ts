import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

export async function setTheme(page: Page, theme: "dark" | "light") {
  const button = page.getByRole("button", { name: "Dark mode", exact: true });
  await expect(button).toBeVisible();
  const pressed = theme === "dark" ? "true" : "false";
  if (await button.getAttribute("aria-pressed") !== pressed) await button.click();
  await expect(button).toHaveAttribute("aria-pressed", pressed);
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
}
