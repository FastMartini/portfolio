import { expect, test } from "@playwright/test";
import { openClimb, scrollToClimbStop } from "./helpers/climb";

test("external links preserve the portfolio in its tab without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  await context.route("https://devpost.com/**", (route) => route.fulfill({ contentType: "text/html", body: "<title>Devpost profile</title>" }));
  const page = await context.newPage();
  await page.goto("./#summit");
  const originalURL = page.url();
  const devpost = page.getByRole("link", { name: /Devpost/ });
  await expect(devpost).toHaveAttribute("target", "_blank");
  const popupPromise = page.waitForEvent("popup");
  await devpost.click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL(/devpost\.com\/FastMartini/);
  await expect(page).toHaveURL(originalURL);
  await expect(page.getByRole("heading", { name: "Let's build what comes next." })).toBeVisible();
  await context.close();
});

for (const destination of ["./#list-view", "./work/momentumx/", "./work/veritas/", "./work/membership-inference-attack/"]) {
  test(`public source and profile links open safely in new tabs: ${destination}`, async ({ page }) => {
    await page.goto(destination);
    const links = await page.locator('a[href^="https://"], a[href^="http://"]').evaluateAll((links) =>
      links.map((link) => ({ href: link.getAttribute("href"), target: link.getAttribute("target"), rel: link.getAttribute("rel") })));
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link.target, link.href ?? "external link").toBe("_blank");
      expect(link.rel?.split(/\s+/)).toEqual(expect.arrayContaining(["noopener", "noreferrer"]));
    }
    const internal = await page.locator('a[href^="#"], a[href^="/portfolio/"], a[href^="mailto:"]').evaluateAll((links) => links.map((link) => link.getAttribute("target")));
    expect(internal.length).toBeGreaterThan(0);
    expect(internal).not.toContain("_blank");
  });
}

test("Climb contact links open a new tab without losing the Summit", async ({ page, context }) => {
  await context.route("https://devpost.com/**", (route) => route.fulfill({ contentType: "text/html", body: "<title>Devpost profile</title>" }));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openClimb(page);
  await scrollToClimbStop(page, 9);
  const originalURL = page.url();
  const devpost = page.getByRole("link", { name: /Devpost/ });
  await expect(devpost).toHaveAttribute("target", "_blank");
  const popupPromise = page.waitForEvent("popup");
  await devpost.click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL(/devpost\.com\/FastMartini/);
  await expect(page).toHaveURL(originalURL);
  await expect(page.locator("#climb")).toHaveAttribute("data-stop", "9");
  expect(await popup.evaluate(() => window.opener)).toBeNull();
  await popup.close();
});
