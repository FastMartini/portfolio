import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page, Route } from "@playwright/test";
import { contactEmail, contactFormEndpoint } from "../content/contact";

test.skip(!process.env.TEST_WEB3FORMS_KEY, "Run npm run test:contact-delivery for the key-enabled export.");

async function fillNote(page: Page, name = "Alex García") {
  const form = page.locator("#summit-register");
  await form.getByLabel("From", { exact: true }).fill(name);
  await form.getByLabel("Reply to").fill("alex@example.com");
  await form.getByLabel("Subject").fill("A project & a role?");
  await form.getByLabel("Message").fill("Hello Diego\nLet’s compare notes.");
  return form;
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.setFixedTime(new Date("2026-11-17T12:00:00Z"));
});

test("the signed visual waits for success, focuses the confirmation, and clears the draft", async ({ page }) => {
  let complete: (() => void) | undefined;
  let count = 0;
  const gate = new Promise<void>(resolve => { complete = resolve; });
  await page.route(contactFormEndpoint, async route => {
    count++;
    const request = route.request();
    expect(request.method()).toBe("POST");
    expect(request.headers().accept).toBe("application/json");
    const body = request.postData() ?? "";
    expect(body).toContain('name="access_key"');
    expect(body).toContain(process.env.TEST_WEB3FORMS_KEY);
    expect(body).toContain("Portfolio · Summit register");
    expect(body).toContain("A project & a role?");
    expect(body).not.toContain('name="redirect"');
    await gate;
    await route.fulfill({ json: { success: true } });
  });
  await page.goto("./#summit-register");
  const form = await fillNote(page);
  await form.getByRole("button", { name: "Sign & send" }).click();
  await expect(form.locator(".summit-send")).toHaveText("Sending…");
  await expect(form.locator(".summit-send")).toBeDisabled();
  await expect(form.locator(".summit-send")).toHaveAttribute("aria-busy", "true");
  await expect(form.getByLabel("Message")).toHaveAttribute("readonly");
  await expect(form.locator(".summit-register-confirmation")).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("summit-register-draft"))).not.toBeNull();
  // Repeated Enter/programmatic submits cannot duplicate an in-flight request.
  await form.evaluate((element: HTMLFormElement) => { element.requestSubmit(); element.requestSubmit(); });
  complete!();
  const confirmation = form.getByRole("status");
  await expect(confirmation).toBeFocused();
  await expect(confirmation.getByRole("heading")).toHaveText("Thanks, Alex. It’s in my inbox.");
  await expect(confirmation).toContainText("I’ll reply to alex@example.com.");
  await expect(confirmation.locator(".summit-register-stamp")).toContainText("Signed");
  await expect(confirmation.locator(".summit-register-stamp")).toHaveCSS("animation-name", "none");
  expect(await page.evaluate(() => localStorage.getItem("summit-register-draft"))).toBeNull();
  expect(count).toBe(1);
  await confirmation.getByRole("button", { name: "Write another note" }).click();
  await expect(form.getByLabel("From", { exact: true })).toBeFocused();
  for (const name of ["name", "email", "subject", "message"]) await expect(form.locator(`[name="${name}"]`)).toHaveValue("");
});

test("a note without From or Subject gets the default subject and unnamed confirmation", async ({ page }) => {
  await page.route(contactFormEndpoint, async route => {
    expect(route.request().postData()).toContain("Hello from your portfolio");
    await route.fulfill({ json: { success: true } });
  });
  await page.goto("./#summit-register");
  const form = await fillNote(page, "");
  await form.getByLabel("Subject").fill("");
  await form.getByRole("button", { name: "Sign & send" }).click();
  await expect(form.getByRole("status").getByRole("heading")).toHaveText("Your note is in my inbox.");
});

test("normal motion animates the signed stamp after acknowledgement", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.route(contactFormEndpoint, route => route.fulfill({ json: { success: true } }));
  await page.goto("./#summit-register");
  const form = await fillNote(page);
  await form.getByRole("button", { name: "Sign & send" }).click();
  await expect(form.getByRole("status")).toBeFocused();
  await expect(form.locator(".summit-register-stamp")).toHaveCSS("animation-name", "summit-stamp-press");
});

for (const failure of ["network", "http", "rejected", "malformed", "unconfirmed"] as const) {
  test(`${failure} failure retains the note and offers retry and an encoded email fallback`, async ({ page }) => {
    await page.route(contactFormEndpoint, async route => {
      if (failure === "network") await route.abort();
      else if (failure === "http") await route.fulfill({ status: 500, json: { success: true } });
      else if (failure === "malformed") await route.fulfill({ contentType: "application/json", body: "{broken" });
      else await route.fulfill({ json: { success: failure === "unconfirmed" ? "true" : false } });
    });
    await page.goto("./#summit-register");
    const form = await fillNote(page);
    await form.getByRole("button", { name: "Sign & send" }).click();
    await expect(form.getByRole("alert")).toContainText("That one didn’t reach me.");
    await expect(form.getByRole("button", { name: "Try again" })).toBeEnabled();
    await expect(form.getByLabel("Message")).toBeEditable();
    await expect(form.getByLabel("Message")).toHaveValue("Hello Diego\nLet’s compare notes.");
    await expect(form.getByRole("link", { name: "Open in my email app" })).toHaveAttribute("href", `mailto:${contactEmail}?subject=${encodeURIComponent("A project & a role?")}&body=${encodeURIComponent("Hello Diego\nLet’s compare notes.\n\n— Alex García\nalex@example.com")}`);
    await expect(form.locator(".summit-register-confirmation")).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem("summit-register-draft"))).not.toBeNull();
  });
}

test("retry sends the retained draft and removes the failure alert on success", async ({ page }) => {
  let count = 0;
  await page.route(contactFormEndpoint, route => route.fulfill({ json: { success: ++count > 1 } }));
  await page.goto("./#summit-register");
  const form = await fillNote(page);
  await form.getByRole("button", { name: "Sign & send" }).click();
  await form.getByRole("button", { name: "Try again" }).click();
  await expect(form.getByRole("status")).toBeVisible();
  await expect(form.getByRole("alert")).toHaveCount(0);
  expect(count).toBe(2);
});

test("invalid fields and the honeypot never reach Web3Forms", async ({ page }) => {
  let count = 0;
  await page.route(contactFormEndpoint, async route => { count++; await route.fulfill({ json: { success: true } }); });
  await page.goto("./#summit-register");
  const form = page.locator("#summit-register");
  await form.getByRole("button", { name: "Sign & send" }).click();
  await expect(form.getByLabel("Reply to")).toBeFocused();
  await fillNote(page);
  await form.locator("[name=botcheck]").evaluate((element: HTMLInputElement) => { element.checked = true; });
  await form.getByRole("button", { name: "Sign & send" }).click();
  expect(count).toBe(0);
  await expect(form.locator(".summit-register-confirmation")).toHaveCount(0);
});

for (const theme of ["light", "dark"] as const) {
  test(`sent and failure visuals are accessible and fit a phone in ${theme}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 320, height: 844 });
    await page.addInitScript(theme => localStorage.setItem("portfolio-theme", theme), theme);
    let success = false;
    await page.route(contactFormEndpoint, route => route.fulfill({ json: { success } }));
    await page.goto("./#summit-register");
    const form = await fillNote(page);
    await form.getByRole("button", { name: "Sign & send" }).click();
    await expect(form.getByRole("alert")).toBeVisible();
    const failureAxe = await new AxeBuilder({ page }).include("#summit").analyze();
    expect(failureAxe.violations).toEqual([]);
    await form.screenshot({ path: testInfo.outputPath(`failure-${theme}.png`) });
    success = true;
    await form.getByRole("button", { name: "Try again" }).click();
    await expect(form.getByRole("status")).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
    const sentAxe = await new AxeBuilder({ page }).include("#summit").analyze();
    expect(sentAxe.violations).toEqual([]);
    await form.screenshot({ path: testInfo.outputPath(`sent-${theme}.png`) });
  });
}

test("native POST works without JavaScript and redirects to the base-path-safe success note", async ({ browser, browserName, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, reducedMotion: "reduce" });
  await context.route(contactFormEndpoint, async (route: Route) => {
    const data = new URLSearchParams(route.request().postData() ?? "");
    expect(data.get("access_key")).toBe(process.env.TEST_WEB3FORMS_KEY);
    expect(data.get("email")).toBe("alex@example.com");
    expect(data.get("from_name")).toBe("Portfolio · Summit register");
    expect(data.get("redirect")).toBe(`${baseURL}#summit-sent`);
    if (browserName === "webkit") {
      // Playwright's WebKit interception cannot fulfill 3xx responses. A native
      // HTML redirect exercises the same no-JavaScript return navigation.
      await route.fulfill({ contentType: "text/html", body: `<meta http-equiv="refresh" content="0; url=${data.get("redirect")}">` });
    } else await route.fulfill({ status: 303, headers: { location: data.get("redirect")! } });
  });
  const page = await context.newPage();
  await page.goto("./#summit-register");
  const form = page.locator("#summit-register");
  await expect(form).toHaveAttribute("action", contactFormEndpoint);
  await expect(form).not.toHaveAttribute("novalidate");
  await form.getByRole("button", { name: "Sign & send" }).click();
  await expect(form.getByLabel("Reply to")).toBeFocused();
  await fillNote(page);
  await form.getByRole("button", { name: "Sign & send" }).click();
  await expect(page).toHaveURL(/#summit-sent$/);
  await expect(page.locator("#summit-sent")).toHaveText("Thanks — your note was sent. I’ll reply to the address you left.");
  await expect(page.locator("#summit-sent")).toBeVisible();
  await context.close();
});

test("the native-success hash also reveals List View with JavaScript", async ({ page }) => {
  await page.goto("./#summit-sent");
  await expect(page.locator("#list-view")).toBeVisible();
  await expect(page.locator("#summit-sent")).toBeVisible();
  await expect(page.locator("#climb")).toBeHidden();
});
