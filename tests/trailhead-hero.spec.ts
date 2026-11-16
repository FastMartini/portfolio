import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { openClimb } from "./helpers/climb";
import { holdNextTransition, imageDifference, seekIntro } from "./helpers/splash";
import type { SplashElement } from "../components/splash/controller";

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 568 }, { width: 844, height: 390 }]) {
  for (const theme of ["light", "dark"] as const) {
    test(`typographic Trailhead keeps text, trail and actions clear in ${theme} at ${viewport.width}px`, async ({ page }, info) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.addInitScript(theme => localStorage.setItem("portfolio-theme", theme), theme);
      await page.goto("./#trailhead");
      await page.evaluate(() => document.fonts.ready);
      const hero = page.locator("#trailhead"), resume = hero.locator(".resume-link"), contact = hero.getByRole("link", { name: "Contact me", exact: true });
      await expect(hero.locator("img, [data-paper-piece]")).toHaveCount(0);
      await expect(hero.locator("h1")).toHaveText("Howdy, I'm Diego.");
      await expect(hero.locator("h1 .trailhead-title-line")).toHaveCount(2);
      await expect(hero.getByText("Engineer’s field kit")).toHaveCount(0);
      await expect(resume).toHaveCount(1);
      await expect(resume).toHaveClass(/button-primary/);
      await expect(resume).toBeInViewport();
      await expect(contact).toBeInViewport();
      const a = (await resume.boundingBox())!, b = (await contact.boundingBox())!;
      expect(a.height).toBeGreaterThanOrEqual(44);
      expect(a.height).toBe(b.height);
      expect(a.y).toBeCloseTo(b.y, 0);
      expect(b.x - a.x - a.width).toBeGreaterThanOrEqual(11);
      await resume.focus();
      await expect(resume).toHaveCSS("outline-style", "solid");
      await page.keyboard.press(browserTab(info.project.name));
      await expect(contact).toBeFocused();
      await expect(contact).toHaveCSS("outline-style", "solid");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const crossings = await hero.evaluate(el => {
        const svg = [...el.querySelectorAll<SVGSVGElement>(".trailhead-route")].find(svg => getComputedStyle(svg).display !== "none")!;
        const path = svg.querySelector<SVGPathElement>("path")!, matrix = path.getScreenCTM()!;
        const boxes = [...el.querySelectorAll("h1, .trailhead-lead, .trailhead-actions .button, .scroll-cue")].filter(el => el.getClientRects().length).map(el => el.getBoundingClientRect());
        return Array.from({ length: 301 }, (_, i) => path.getPointAtLength(path.getTotalLength() * i / 300).matrixTransform(matrix))
          .filter(p => boxes.some(r => p.x > r.left - 5 && p.x < r.right + 5 && p.y > r.top - 5 && p.y < r.bottom + 5)).length;
      });
      expect(crossings, "the copper route must leave text and controls clear").toBe(0);
      const axe = await new AxeBuilder({ page }).include("#trailhead").analyze();
      expect(axe.violations).toEqual([]);
      await hero.screenshot({ path: info.outputPath(`hero-${theme}-${viewport.width}.png`) });
    });
  }
}

function browserTab(project: string) { return project.startsWith("webkit") && process.platform === "darwin" ? "Alt+Tab" : "Tab"; }

for (const width of [1440, 390]) {
  for (const entry of ["opening", "return"] as const) {
    test(`${entry} reveals the fixed greeting then draws the trail once at ${width}px`, async ({ page }, info) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await page.addInitScript(() => { Reflect.set(window, "trailDraws", 0); document.addEventListener("portfolio:hero-ready", () => Reflect.set(window, "trailDraws", Reflect.get(window, "trailDraws") + 1)); });
      const selector = entry === "opening" ? "body > .splash:not(.splash--climb)" : ".splash--list";
      if (entry === "opening") await page.goto("./");
      else {
        await openClimb(page);
        await holdNextTransition(page, selector);
        await page.getByRole("button", { name: "List view", exact: true }).click();
        await seekIntro(page, 1100, selector);
      }
      const offset = entry === "opening" ? 0 : 1820;
      await seekIntro(page, 5200 - offset, selector);
      const heading = page.locator("#trailhead-title"), final = await heading.boundingBox();
      expect(await page.locator(`${selector} .splash-greeting--page`).boundingBox()).toEqual(final);
      await seekIntro(page, 5900 - offset, selector);
      expect(await page.locator(`${selector} .splash-greeting--page`).boundingBox()).toEqual(final);
      await expect(page.locator(".trailhead-route:visible .trailhead-trail")).toHaveCSS("stroke-dashoffset", "1px");
      await page.screenshot({ path: info.outputPath("greeting-before-trail.png") });
      if (entry === "opening") await page.locator(selector).evaluate((el: SplashElement) => {
        el.splashController!.seek(6400);
        el.dispatchEvent(new AnimationEvent("animationend", { animationName: "splash-exit", bubbles: true }));
      });
      else await seekIntro(page, 4581, selector);
      await expect.poll(() => page.evaluate(() => Reflect.get(window, "trailDraws"))).toBe(1);
      await expect.poll(() => page.locator(".trailhead-route:visible .trailhead-trail").evaluate(el => Number.parseFloat(getComputedStyle(el).strokeDashoffset))).toBe(0);
      await expect.poll(() => page.locator(".trailhead-route:visible .trailhead-trail").evaluate(el => el.getAnimations().length)).toBe(0);
      const before = await page.screenshot();
      const style = await page.addStyleTag({ content: ".trailhead-trail {stroke-dasharray:none!important;}" });
      const after = await page.screenshot();
      expect((await imageDifference(page, before, after)).max, "the entire route must be painted when drawing ends").toBeLessThanOrEqual(1);
      await style.evaluate(el => el.parentNode?.removeChild(el));
      await page.mouse.wheel(0, 100);
      expect(await page.evaluate(() => Reflect.get(window, "trailDraws"))).toBe(1);
      await expect(heading).toHaveCSS("opacity", "1");
      await page.screenshot({ path: info.outputPath("finished-trail.png") });
    });
  }

  test(`reduced motion shows the final hero and trail immediately at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("./");
    await expect(page.locator(".splash")).toBeHidden();
    await expect(page.locator("#trailhead-title")).toHaveCSS("opacity", "1");
    await expect(page.locator(".trailhead-route:visible .trailhead-trail")).toHaveCSS("stroke-dashoffset", "0px");
    await page.getByRole("button", { name: "Climb view", exact: true }).click();
    await page.getByRole("button", { name: "List view", exact: true }).click();
    expect(await page.locator("#trailhead").evaluate(el => el.getAnimations({ subtree: true }).length)).toBe(0);
  });
}

for (const input of ["mouse", "touch", "keyboard"] as const) {
  test(`primary Resume opens the existing PDF with ${input}`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, hasTouch: input === "touch", viewport: { width: input === "touch" ? 320 : 1440, height: 900 }, reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("./");
    const resume = page.locator("#trailhead .resume-link");
    await expect(resume).toHaveAttribute("target", "_blank");
    await expect(resume).toHaveAttribute("rel", "noopener noreferrer");
    const href = (await resume.getAttribute("href"))!;
    const pdf = await page.request.get(href);
    expect(pdf.status()).toBe(200);
    expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");
    const request = context.waitForEvent("request", request => request.url().endsWith("/resume/Martinez_Diego_2026.pdf"));
    if (input === "keyboard") { await resume.focus(); await page.keyboard.press("Enter"); }
    else if (input === "touch") await resume.tap();
    else await resume.click();
    await request;
    await expect(page).toHaveURL(/\/portfolio\/$/);
    await context.close();
  });
}
