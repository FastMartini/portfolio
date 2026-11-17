import { expect, test } from "@playwright/test";
import { enterClimb, scrollToClimbStop } from "./helpers/climb";

for (const width of [390, 1440]) {
  test(`About pitches and rings work with buttons, dots and keyboard at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("./#about");
    await expect(page.locator("#about h3")).toHaveText(["The Design Idea", "The Builder", "The Teacher"]);
    const ring = page.getByRole("region", { name: "Hackathon projects" });
    await expect(ring).toHaveAttribute("data-ring-ready", "true");
    await ring.getByRole("button", { name: "Next project", exact: true }).click();
    await ring.getByRole("button", { name: "Next project", exact: true }).click();
    await expect(ring.locator(".ring-text")).toHaveText("Veritas · project demo");
    await expect(ring.locator(".ring-link")).toHaveAttribute("href", "https://youtu.be/0gY9chPPP5k");
    await page.route("https://www.youtube-nocookie.com/**", route => route.fulfill({ contentType: "text/html", body: "<title>Veritas player</title>" }));
    const poster = ring.getByRole("link", { name: "Watch the Veritas demo video on YouTube" });
    await poster.click();
    await expect(ring.locator("iframe")).toHaveAttribute("src", "https://www.youtube-nocookie.com/embed/_CG-xtdMhHI?autoplay=1");
    await ring.getByRole("button", { name: "Next project", exact: true }).click();
    await expect(ring.locator("iframe")).toHaveCount(0);
    await expect(ring.locator(".ring-text")).toHaveText("HaRi · ShellHacks 2025");
    await ring.getByRole("button", { name: "Show project 1: MomentumX" }).click();
    await expect(ring.locator(".ring-text")).toContainText("MomentumX");
    await ring.locator(".ring-stage").focus();
    await page.keyboard.press("ArrowLeft");
    await expect(ring.locator(".ring-text")).toContainText("Grassroots");
    await expect.poll(() => ring.locator('.ring-card[aria-hidden="false"]').evaluate(el => ({ filter: getComputedStyle(el).filter, z: new DOMMatrix(getComputedStyle(el).transform).m43 + new DOMMatrix(getComputedStyle(el.parentElement!).transform).m43 }))).toEqual({ filter: "none", z: 0 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });

  test(`Base camp uses the new stats without internal scrolling at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width < 900 ? 844 : 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("./#trailhead"); await enterClimb(page); await scrollToClimbStop(page, 1);
    const card = page.locator('[data-card="1"]');
    await expect(card.locator(".base-camp-stats li")).toHaveText(["2hackathon wins, out of 4 entered", "300+students through CodePath", "30+students in public schools"]);
    expect(await card.evaluate(el => el.scrollHeight <= el.clientHeight + 1)).toBe(true);
  });
}

test("About remains readable with correct heading order, image metadata and every link without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage(); await page.goto("./#about");
  await expect(page.locator("#about h2, #about h3")).toHaveText(["Engineering with intent.", "The Design Idea", "The Builder", "The Teacher"]);
  await expect(page.locator("#about img")).toHaveCount(9);
  await expect(page.getByRole("link", { name: "Watch the Veritas demo video", exact: true })).toHaveAttribute("href", "https://youtu.be/_CG-xtdMhHI");
  await expect(page.getByRole("link", { name: "View Grassroots on Devpost ↗", exact: true })).toBeVisible();
  for (const image of await page.locator("#about img").all()) {
    expect(await image.getAttribute("alt")).toBeTruthy(); expect(await image.getAttribute("width")).toBeTruthy();
    const response = await page.request.get((await image.getAttribute("src"))!); expect(response.ok()).toBe(true);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await context.close();
});

for (const [width, height] of [[320, 900], [390, 900], [768, 900], [900, 900], [1100, 900], [1440, 900], [1920, 900], [3840, 900], [844, 390]]) {
  test(`continuous trail clears About and rejoins Waypoint 01 at ${width}×${height} in both themes`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: "reduce" }); await page.goto("./#about");
    await expect(page.locator("#main-content")).toHaveClass(/has-journey-trail/);
    await page.evaluate(() => document.fonts.ready);
    for (const theme of ["light", "dark"]) {
      if (await page.locator("html").getAttribute("data-theme") !== theme) await page.getByRole("button", { name: `Switch to ${theme} theme` }).click();
      await expect(page.locator(".journey-trail-line")).toHaveCSS("stroke", theme === "light" ? "rgb(181, 101, 59)" : "rgb(227, 169, 131)");
      const result = await page.locator(".journey-trail-line").evaluate((line: SVGPathElement) => {
        const matrix = line.getScreenCTM()!, length = line.getTotalLength();
        const boxes = [...document.querySelectorAll<HTMLElement>("#about h2, #about h3, #about .about-body, #about .about-stat, #about .ring-bar, #about .ring-dots, #about .ring-hint, #about .section-coordinate, #work .work-heading h2, #work .work-heading p")].map(el => ({ name: el.className || el.tagName, box: el.getBoundingClientRect() }));
        // Only card pixels inside the clipped mobile stage are visible obstacles.
        for (const card of document.querySelectorAll<HTMLElement>("#about .ring-card")) {
          if (Number(getComputedStyle(card).opacity) < 0.3) continue;
          const r = card.getBoundingClientRect(), stage = card.closest(".ring-stage")!.getBoundingClientRect();
          boxes.push({ name: "ring-card", box: { left: Math.max(r.left, stage.left), right: Math.min(r.right, stage.right), top: Math.max(r.top, stage.top), bottom: Math.min(r.bottom, stage.bottom) } as DOMRect });
        }
        const collisions = new Set<string>();
        for (let i = 0; i <= 2200; i++) { const p = line.getPointAtLength(length * i / 2200).matrixTransform(matrix); for (const { name, box: r } of boxes) if (p.x > r.left - 2 && p.x < r.right + 2 && p.y > r.top - 2 && p.y < r.bottom + 2) collisions.add(name); }
        const last = line.getPointAtLength(length).matrixTransform(matrix), marker = document.querySelector("#momentumx .waypoint-marker")!.getBoundingClientRect();
        const first = line.getPointAtLength(0).matrixTransform(matrix), hero = [...document.querySelectorAll<SVGPathElement>(".trailhead-trail")].find(p => getComputedStyle(p.ownerSVGElement!).display !== "none")!;
        const original = hero.getPointAtLength(0).matrixTransform(hero.getScreenCTM()!);
        return { collisions: [...collisions], endGap: Math.hypot(last.x - marker.left - marker.width / 2, last.y - marker.top), startGap: Math.hypot(first.x - original.x, first.y - original.y), overflow: document.documentElement.scrollWidth > innerWidth };
      });
      expect(result.collisions).toEqual([]); expect(result.endGap).toBeLessThan(1); expect(result.startGap).toBeLessThan(1); expect(result.overflow).toBe(false);
      await expect(page.locator(".journey-trail-line")).toHaveCSS("stroke-dashoffset", "0px");
      await expect(page.locator(".trail-pin.is-lit")).toHaveCount(3);
      await expect(page.locator(".braid-label")).toHaveCount(width <= 900 ? 0 : 3);
      await expect(page.locator(".braid-code-text")).toContainText(/^[01]+$/);
    }
  });
}

for (const width of [390, 1440]) {
  test(`scroll trail follows fast bursts, lights pitches and completes at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 }); await page.goto("./#trailhead");
    await expect(page.locator("#main-content")).toHaveClass(/journey-trail-motion/);
    // On phones the existing route starts below the first reading line.
    // Native scroll jumps model large trackpad bursts independently of optional wheel glide.
    for (let i = 0; i < 7; i++) {
      await page.evaluate(() => window.scrollBy(0, 450));
      await expect.poll(() => page.locator(".journey-trail-tip").evaluate(el => {
        if (el.getAttribute("opacity") === "0") return true;
        const rect = el.getBoundingClientRect(); return rect.y >= innerHeight * 0.45 && rect.y <= innerHeight * 0.85;
      }), { timeout: 2500 }).toBe(true);
    }
    await page.locator("#momentumx").scrollIntoViewIfNeeded();
    await expect(page.locator("#momentumx .waypoint-marker")).toHaveClass(/is-reached/);
    await expect(page.locator(".about-pitch.is-shown")).toHaveCount(3);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect(page.locator(".journey-trail-line")).toHaveCSS("stroke-dashoffset", "0px");
  });
}
