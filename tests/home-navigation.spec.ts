import { expect, test } from "@playwright/test";
import { openClimb, scrollToClimbStop } from "./helpers/climb";

test("Devpost is available alongside Diego's contact links in both views", async ({ page, browser, baseURL }) => {
  const devpost = "https://devpost.com/FastMartini?ref_content=user-portfolio&ref_feature=portfolio&ref_medium=global-nav";
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openClimb(page);
  await scrollToClimbStop(page, 9);
  await expect(page.getByRole("link", { name: /Devpost/ })).toHaveAttribute("href", devpost);
  await page.getByRole("button", { name: "List view", exact: true }).click();
  await expect(page.getByRole("link", { name: /Devpost/ })).toHaveAttribute("href", devpost);

  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  const staticPage = await context.newPage();
  await staticPage.goto("./#summit");
  await expect(staticPage.getByRole("link", { name: /Devpost/ })).toHaveAttribute("href", devpost);
  await context.close();
});

for (const width of [320, 390, 1440]) {
  for (const colorScheme of ["light", "dark"] as const) {
    test(`List and Climb share a logo-free ${colorScheme} header at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: "reduce", colorScheme });
      await openClimb(page);
      await scrollToClimbStop(page, 0);
      const header = page.getByRole("banner");
      const navigation = page.getByRole("navigation", { name: "Primary navigation" });
      await expect(navigation).toBeVisible();
      await expect(header).toBeInViewport();
      await expect(header.getByText("DM", { exact: true })).toHaveCount(0);
      const bounds = await header.boundingBox();
      const workBounds = await navigation.getByRole("link", { name: "Work", exact: true }).boundingBox();

      for (const [label, stop] of [["About", 1], ["Work", 2], ["Beyond Work", 8], ["Contact", 9]] as const) {
        const link = navigation.getByRole("link", { name: label, exact: true });
        await expect(link).toBeInViewport();
        await link.focus();
        await page.keyboard.press("Enter");
        await expect(page.locator("#climb")).toHaveAttribute("data-stop", String(stop));
        await expect(page.locator("#climb")).toHaveAttribute("data-settled", "true");
        await expect(link).toHaveAttribute("aria-current", "location");
        await expect(page.locator("#climb")).toBeVisible();
      }
      await header.getByRole("link", { name: "Diego Martinez, home", exact: true }).click();
      await expect(page.locator("#climb")).toHaveAttribute("data-stop", "0");
      await page.getByRole("button", { name: "List view", exact: true }).click();
      await expect(page.getByRole("button", { name: "Climb view", exact: true })).toBeInViewport();
      expect(await header.boundingBox()).toEqual(bounds);
      expect(await navigation.getByRole("link", { name: "Work", exact: true }).boundingBox()).toEqual(workBounds);
      await expect(header).toHaveCSS("background-color", colorScheme === "dark" ? "rgb(26, 33, 29)" : "rgb(243, 238, 221)");
      await navigation.getByRole("link", { name: "Work", exact: true }).click();
      await expect(page).toHaveURL(/#work$/);
      await expect(navigation.getByRole("link", { name: "Work", exact: true })).toHaveAttribute("aria-current", "location");
    });
  }
}

test("the logo-free navigation stays usable without JavaScript or mountain capabilities", async ({ page, browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  const staticPage = await context.newPage();
  await staticPage.goto("./");
  const staticHeader = staticPage.getByRole("banner");
  await expect(staticHeader.getByText("DM", { exact: true })).toHaveCount(0);
  await staticHeader.getByRole("link", { name: "Work", exact: true }).click();
  await expect(staticPage).toHaveURL(/#work$/);
  await staticPage.goto("./work/veritas/");
  await expect(staticPage.getByRole("banner").getByText("DM", { exact: true })).toHaveCount(0);
  await context.close();

  await page.addInitScript(() => { Reflect.deleteProperty(window, "ResizeObserver"); });
  await page.goto("./#about");
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: "Contact", exact: true }).click();
  await expect(page).toHaveURL(/#summit$/);
  await expect(page.getByRole("link", { name: /Devpost/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Climb view", exact: true })).toHaveCount(0);
});

test("shared header navigation closes an open reading panel and reaches the requested stop", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openClimb(page);
  await scrollToClimbStop(page, 3);
  await page.locator('[data-marker="3"]').click();
  await expect(page.getByRole("dialog")).toBeVisible();
  const contact = page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: "Contact", exact: true });
  await contact.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.locator("#climb")).toHaveAttribute("data-stop", "9");
  await expect(page.locator("#climb")).toHaveAttribute("data-settled", "true");
  await expect(contact).toBeFocused();
  await expect(contact).toHaveAttribute("aria-current", "location");
  await expect(page.getByRole("link", { name: /Devpost/ })).toBeVisible();
});
