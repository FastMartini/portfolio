import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { summitStopIndex } from "../content/journey";
import { contactEmail } from "../content/contact";
import { openClimb, scrollToClimbStop } from "./helpers/climb";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("empty submit announces errors, focuses Reply to, and validates live", async ({ page }) => {
  await page.goto("./#summit-register");
  const form = page.locator("#summit-register");
  await expect(form).toHaveJSProperty("noValidate", true);
  await form.getByRole("button", { name: "Sign & send" }).click();
  await expect(form.getByLabel("Reply to")).toBeFocused();
  await expect(form.getByLabel("Reply to")).toHaveAttribute("aria-invalid", "true");
  await expect(form.getByLabel("Reply to")).toHaveAccessibleDescription("Add an email so I can write back.");
  await expect(form.getByLabel("Message")).toHaveAccessibleDescription("Write a line or two first.");
  await form.getByLabel("Reply to").fill("incomplete@");
  await expect(form.getByLabel("Reply to")).toHaveAccessibleDescription("That address looks incomplete.");
  await form.getByLabel("Reply to").fill("alex@example.com");
  await expect(form.getByLabel("Reply to")).not.toHaveAttribute("aria-invalid");
  await form.getByLabel("Message").fill("   ");
  await form.getByLabel("Reply to").press("Enter");
  await expect(form.getByLabel("Message")).toBeFocused();
  await form.getByLabel("Message").fill("Hello Diego");
  await expect(form.locator(".summit-field-error")).toHaveCount(0);
});

test("drafts survive reload, including Unicode and line breaks", async ({ page }) => {
  await page.goto("./#summit-register");
  const draft = { name: "Alex García", email: "alex@example.com", subject: "A project & a role?", message: "Hello Diego,\nLet’s build something." };
  for (const [key, value] of Object.entries(draft)) await page.locator(`#summit-register [name="${key}"]`).fill(value);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("summit-register-draft") ?? "null"))).toEqual(draft);
  await page.reload();
  for (const [key, value] of Object.entries(draft)) await expect(page.locator(`#summit-register [name="${key}"]`)).toHaveValue(value);
});

test("a valid keyless submit shows the register confirmation visual", async ({ page }) => {
  await page.goto("./#summit-register");
  const form = page.locator("#summit-register");
  await form.getByLabel("Reply to").fill("alex@example.com");
  await form.getByLabel("Message").fill("Hello Diego");
  await form.getByRole("button", { name: "Sign & send" }).click();
  const confirmation = form.locator(".summit-register-confirmation");
  await expect(confirmation).toBeVisible();
  await expect(confirmation).toBeFocused();
  await expect(confirmation.getByRole("heading")).toHaveText("Your note is ready to send.");
  await expect(confirmation.locator(".summit-register-stamp")).toContainText("Note prepared");
  await expect(confirmation).toContainText("Finish sending it in your email app.");
  await expect(confirmation).not.toContainText("in my inbox");
  await expect(confirmation.locator(".summit-register-stamp")).toHaveCSS("animation-name", "none");
  await expect(form.getByRole("button", { name: "Sign & send" })).toBeHidden();
  await confirmation.getByRole("button", { name: "Back to my note" }).click();
  await expect(form.getByLabel("From", { exact: true })).toBeFocused();
  await expect(form.getByLabel("Reply to")).toHaveValue("alex@example.com");
  await expect(form.getByLabel("Message")).toHaveValue("Hello Diego");
  await expect(form.getByRole("button", { name: "Sign & send" })).toBeVisible();
});

for (const theme of ["light", "dark"] as const) {
  test(`prepared confirmation keeps the draft, remains accessible, and fits a phone in ${theme}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 320, height: 844 });
    await page.addInitScript(theme => localStorage.setItem("portfolio-theme", theme), theme);
    await page.goto("./#summit-register");
    const form = page.locator("#summit-register");
    await form.getByLabel("From", { exact: true }).fill("Alex García");
    await form.getByLabel("Reply to").fill("alex@example.com");
    await form.getByLabel("Subject").fill("A project & a role?");
    await form.getByLabel("Message").fill("Hello Diego\nLet’s compare notes.");
    await form.getByRole("button", { name: "Sign & send" }).click();
    const confirmation = form.getByRole("status");
    await expect(confirmation).toBeFocused();
    await expect(confirmation.getByRole("heading")).toHaveText("Your note is ready, Alex.");
    await expect(confirmation.getByRole("link", { name: "Open email app" })).toHaveAttribute("href", await form.getAttribute("action") ?? "");
    await expect(confirmation.getByRole("link", { name: "Open email app" })).not.toHaveAttribute("target");
    expect(await page.evaluate(() => localStorage.getItem("summit-register-draft"))).not.toBeNull();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
    const results = await new AxeBuilder({ page }).include("#summit").analyze();
    expect(results.violations).toEqual([]);
    await testInfo.attach(`prepared-${theme}`, { body: await confirmation.screenshot(), contentType: "image/png" });
    await confirmation.getByRole("button", { name: "Back to my note" }).click();
    await form.getByLabel("Message").fill("An updated note.");
    await form.getByRole("button", { name: "Sign & send" }).click();
    await expect(confirmation.getByRole("link", { name: "Open email app" })).toHaveAttribute("href", /An%20updated%20note\./);
  });
}

test("keyless submit prepares an encoded email and retains the draft without a service request", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", request => { if (request.url().includes("api.web3forms.com")) requests.push(request.url()); });
  await page.goto("./#summit-register");
  const form = page.locator("#summit-register");
  await expect(form).toHaveAttribute("action", `mailto:${contactEmail}`);
  await expect(form.locator("[name=access_key]")).toHaveCount(0);
  await form.getByLabel("From", { exact: true }).fill("Alex García");
  await form.getByLabel("Reply to").fill("alex@example.com");
  await form.getByLabel("Subject").fill("A project & a role?");
  await form.getByLabel("Message").fill("Hello!\nLet’s compare notes & build.");
  await form.getByRole("button", { name: "Sign & send" }).click();
  await expect(form).toHaveAttribute("action", `mailto:${contactEmail}?subject=${encodeURIComponent("A project & a role?")}&body=${encodeURIComponent("Hello!\nLet’s compare notes & build.\n\n— Alex García\nalex@example.com")}`);
  await expect(form.getByLabel("Message")).toHaveValue("Hello!\nLet’s compare notes & build.");
  expect(await page.evaluate(() => localStorage.getItem("summit-register-draft"))).not.toBeNull();
  await expect(form).toContainText("Opens your email app.");
  expect(requests).toEqual([]);
});

for (const name of ["", "Alex"]) {
  test(`email subject defaults with ${name || "no name"}`, async ({ page }) => {
    await page.goto("./#summit-register");
    const form = page.locator("#summit-register");
    await form.getByLabel("From", { exact: true }).fill(name);
    await form.getByLabel("Reply to").fill("alex@example.com");
    await form.getByLabel("Message").fill("Hello Diego");
    await form.getByRole("button", { name: "Sign & send" }).click();
    await expect(form).toHaveAttribute("action", new RegExp(`subject=${encodeURIComponent(name ? "Hello from Alex" : "Hello from your portfolio")}&body=`));
  });
}

test("copy address reports success and recovers when clipboard access is refused", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (text: string) => { sessionStorage.setItem("copied-address", text); } } });
  });
  await page.goto("./#summit-register");
  await page.getByRole("button", { name: "Copy address", exact: true }).click();
  await expect(page.getByRole("button", { name: "Copied", exact: true })).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem("copied-address"))).toBe(contactEmail);
  await expect(page.getByRole("button", { name: "Copy address", exact: true })).toBeVisible();
  await page.evaluate(() => { navigator.clipboard.writeText = async () => { throw new Error("Denied"); }; });
  await page.getByRole("button", { name: "Copy address", exact: true }).click();
  await expect(page.getByRole("button", { name: contactEmail, exact: true })).toBeVisible();
});

test("unavailable storage and malformed drafts do not break the form", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("summit-register-draft", "{broken");
    Storage.prototype.setItem = () => { throw new Error("Storage unavailable"); };
  });
  await page.goto("./#summit-register");
  await expect(page.locator("#register-name")).toHaveValue("");
  await page.getByLabel("Reply to").fill("alex@example.com");
  await page.getByRole("button", { name: "Sign & send" }).click();
  await expect(page.getByLabel("Message")).toBeFocused();
});

test("the honeypot prevents submission", async ({ page }) => {
  await page.goto("./#summit-register");
  await page.getByLabel("Reply to").fill("alex@example.com");
  await page.getByLabel("Message").fill("Hello Diego");
  await page.locator("[name=botcheck]").evaluate((element: HTMLInputElement) => { element.checked = true; });
  await page.getByRole("button", { name: "Sign & send" }).click();
  await expect(page.locator("#summit-register")).toHaveAttribute("action", `mailto:${contactEmail}`);
});

test("without JavaScript the native form validates and the four destinations remain available", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("./#summit-register");
  const form = page.locator("#summit-register");
  await expect(form).toHaveAttribute("action", `mailto:${contactEmail}`);
  await expect(form).toHaveAttribute("method", "post");
  await expect(form).toHaveAttribute("enctype", "text/plain");
  await expect(form).not.toHaveAttribute("novalidate");
  await expect(page.locator(".summit-register-date")).toHaveCount(0);
  await form.getByRole("button", { name: "Sign & send" }).click();
  await expect(form.getByLabel("Reply to")).toBeFocused();
  expect(await form.evaluate((element: HTMLFormElement) => element.checkValidity())).toBe(false);
  await form.getByLabel("Reply to").fill("alex@example.com");
  await form.getByLabel("Reply to").press("Enter");
  await expect(form.getByLabel("Message")).toBeFocused();
  await form.getByLabel("Message").fill("Hello Diego");
  expect(await form.evaluate((element: HTMLFormElement) => element.checkValidity())).toBe(true);
  await expect(page.getByRole("navigation", { name: "Diego’s profiles and résumé" }).getByRole("link")).toHaveCount(4);
  await expect(page.locator(".summit-direct a")).toHaveAttribute("href", `mailto:${contactEmail}`);
  await expect(page.locator(".summit-direct a")).not.toHaveAttribute("target");
  await context.close();
});

for (const theme of ["light", "dark"] as const) {
  test(`Summit heading order and accessibility in ${theme}`, async ({ page }) => {
    await page.addInitScript(theme => localStorage.setItem("portfolio-theme", theme), theme);
    await page.goto("./#summit");
    await expect(page.locator("#summit").getByRole("heading")).toHaveText([
      "Let's build what comes next.", "Sign the summit register", "Elsewhere on the trail",
    ]);
    await expect(page.locator("#summit-register")).toHaveCSS("background-color", theme === "light" ? "rgb(255, 251, 237)" : "rgb(37, 47, 41)");
    const results = await new AxeBuilder({ page }).include("#summit").analyze();
    expect(results.violations).toEqual([]);
  });
}

for (const [width, height] of [[320, 844], [390, 844], [768, 1024], [1440, 900], [844, 390]]) {
  test(`register and links fit at ${width}×${height}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height });
    await page.goto("./#summit-register");
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    const form = page.locator("#summit-register");
    const bounds = await form.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    const heading = await page.locator(".summit-heading").boundingBox();
    if (width > 1000) expect(bounds!.y).toBeCloseTo(heading!.y, 0);
    else expect(bounds!.y).toBeGreaterThan(heading!.y + heading!.height);
    const links = await page.locator(".contact-list a").all();
    const cells = await Promise.all(links.map(link => link.boundingBox()));
    if (width > 1000) expect(cells.every(cell => Math.abs(cell!.y - cells[0]!.y) < 1)).toBe(true);
    else if (width > 600) expect(cells[2]!.y).toBeGreaterThan(cells[0]!.y);
    else expect(cells[1]!.y).toBeGreaterThan(cells[0]!.y);
    const capture = testInfo.outputPath(`summit-${width}.png`);
    await page.locator("#summit").screenshot({ path: capture, style: ".site-header, .skip-link { visibility: hidden !important; }" });
    await testInfo.attach(`summit-${width}`, { path: capture, contentType: "image/png" });
    await form.getByLabel("Message").fill("Hello Diego");
    await form.getByRole("button", { name: "Sign & send" }).scrollIntoViewIfNeeded();
    await expect(form.getByRole("button", { name: "Sign & send" })).toBeInViewport();
  });
}

test("keyboard follows the register, profiles and direct email in order", async ({ page, browserName }) => {
  await page.goto("./#summit-register");
  await page.getByRole("button", { name: "Copy address", exact: true }).focus();
  for (const locator of [page.locator("#register-name"), page.locator("#register-email"), page.locator("#register-subject"), page.locator("#register-message"), page.locator(".summit-send"), ...await page.locator(".contact-list a").all(), page.locator(".summit-direct a")]) {
    // Safari uses Option-Tab to include buttons and links in keyboard traversal.
    await page.keyboard.press(browserName === "webkit" ? "Alt+Tab" : "Tab");
    await expect(locator).toBeFocused();
    expect(await locator.evaluate(element => getComputedStyle(element).outlineStyle)).toBe("solid");
  }
});

test("long message scrolling stays inside the textarea", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("./#summit-register");
  const message = page.getByLabel("Message");
  await message.fill(Array.from({ length: 50 }, (_, index) => `Message line ${index}`).join("\n"));
  await message.evaluate((element: HTMLTextAreaElement) => { element.scrollTop = 0; });
  await message.hover();
  const before = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, 160);
  await expect.poll(() => message.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  expect(await page.evaluate(() => scrollY)).toBe(before);
});

for (const [width, height] of [[1440, 900], [390, 844]]) {
  for (const reducedMotion of ["reduce", "no-preference"] as const) {
    test(`Climb opens and focuses the register at ${width}px with ${reducedMotion} motion`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.emulateMedia({ reducedMotion });
      await openClimb(page);
      await scrollToClimbStop(page, summitStopIndex);
      const card = page.locator(`[data-card="${summitStopIndex}"]`);
      const lastLink = card.getByRole("link", { name: `Email ${contactEmail}` });
      await lastLink.focus();
      await expect(lastLink).toBeFocused();
      await expect(lastLink).toBeInViewport();
      await card.getByRole("link", { name: "Write to Diego" }).click();
      await expect(page).toHaveURL(/#summit-register$/);
      await expect(page.locator("#summit-register")).toBeFocused();
      await expect(page.locator("#summit-register")).toBeInViewport();
      await expect(page.locator("#climb")).toBeHidden();
    });
  }
}
