import { expect, test, type Page } from "@playwright/test";
import { enterClimb, scrollToClimbStop } from "./helpers/climb";

async function settleTrail(page: Page) {
  let previous = Number.NaN, stable = 0;
  await expect.poll(async () => {
    const offset = await page.locator(".journey-trail-line").evaluate(el => Number.parseFloat(getComputedStyle(el).strokeDashoffset));
    stable = Math.abs(offset - previous) < 0.1 ? stable + 1 : 0;
    previous = offset;
    return stable;
  }, { intervals: [50] }).toBeGreaterThanOrEqual(3);
}

test("the trail catches up after a delayed animation frame", async ({ page }) => {
  const epoch = new Date("2026-01-01T00:00:00Z");
  await page.clock.install({ time: epoch });
  await page.goto("./#trailhead");
  await expect(page.locator("#main-content")).toHaveClass(/journey-trail-motion/);
  await page.evaluate(() => document.fonts.ready);
  await page.clock.pauseAt(new Date(epoch.getTime() + 60_000));
  await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight);
    window.dispatchEvent(new Event("scroll"));
  });
  await page.clock.runFor(16);
  // One late frame models a software renderer that cannot paint at 60 Hz.
  await page.clock.fastForward(1000);
  await expect(page.locator(".journey-trail-line")).toHaveCSS("stroke-dashoffset", "0px");
  await expect(page.locator(".about-pitch--teacher")).toHaveCSS("opacity", "1");
});

for (const width of [390, 1440]) {
  test(`pitch fades follow scroll position through pauses and reversals at ${width}px`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height: 900 });
    await page.goto("./#trailhead");
    await expect(page.locator("#main-content")).toHaveClass(/journey-trail-motion/);
    await page.evaluate(() => document.fonts.ready);
    await settleTrail(page);

    for (const pitch of await page.locator(".about-pitch").all()) {
      // Find the middle of the existing lead-in to this pitch's trail pin.
      const range = await pitch.evaluate(el => {
        const index = [...document.querySelectorAll(".about-pitch")].indexOf(el);
        const line = document.querySelector<SVGPathElement>(".journey-trail-line")!;
        const pin = document.querySelectorAll(".trail-pin")[index];
        const y = Number(pin.getAttribute("cy")), length = line.getTotalLength();
        let lo = 0, hi = length;
        for (let i = 0; i < 24; i++) { const mid = (lo + hi) / 2; if (line.getPointAtLength(mid).y < y) lo = mid; else hi = mid; }
        const midpoint = (lo + hi) / 2 - length * 0.0175;
        return { midpoint, y: line.ownerSVGElement!.getBoundingClientRect().top + scrollY + line.getPointAtLength(midpoint).y };
      });
      let low = Math.max(0, range.y - 725), high = range.y - 445;
      for (let i = 0; i < 12; i++) {
        const position = Math.round((low + high) / 2);
        await page.evaluate(y => window.scrollTo(0, y), position);
        await settleTrail(page);
        const shown = await page.locator(".journey-trail-line").evaluate((line: SVGPathElement) => line.getTotalLength() - Number.parseFloat(getComputedStyle(line).strokeDashoffset));
        if (Math.abs(shown - range.midpoint) < 2) break;
        if (shown < range.midpoint) low = position; else high = position;
      }
      const middleY = await page.evaluate(() => scrollY);
      const opacity = () => pitch.evaluate(el => Number(getComputedStyle(el).opacity));
      const middle = await opacity();
      expect(middle).toBeGreaterThan(0.35);
      expect(middle).toBeLessThan(0.85);

      await page.waitForTimeout(650);
      expect(await opacity()).toBeCloseTo(middle, 2);
      for (const delta of [25, -25, 0]) {
        await page.evaluate(y => window.scrollTo(0, y), middleY + delta);
        await settleTrail(page);
        const value = await opacity();
        if (delta > 0) expect(value).toBeGreaterThan(middle);
        else if (delta < 0) expect(value).toBeLessThan(middle);
        else expect(value).toBeCloseTo(middle, 2);
        // A small scroll can cross an endpoint where the trail is nearly horizontal.
        expect(value).toBeGreaterThanOrEqual(0.22);
        expect(value).toBeLessThanOrEqual(1);
      }
    }
  });
}

for (const width of [390, 1440]) {
  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    for (const key of ["ArrowRight", "ArrowLeft"]) {
      test(`ring keeps focus from the video poster at ${width}px with ${reducedMotion} and ${key}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.emulateMedia({ reducedMotion });
        await page.goto("./#about");
        const ring = page.getByRole("region", { name: "Hackathon projects" });
        await expect(ring).toHaveAttribute("data-ring-ready", "true");
        await ring.getByRole("button", { name: "Show project 3: Veritas" }).focus();
        await page.keyboard.press("Enter");
        await expect(ring.locator(".ring-count")).toHaveText("03 / 05");
        const stage = ring.locator(".ring-stage");
        await ring.locator(".ring-poster").focus();
        await expect(ring.locator(".ring-poster")).toBeFocused();

        await page.keyboard.press(key);
        await expect(ring.locator(".ring-count")).toHaveText(key === "ArrowRight" ? "04 / 05" : "02 / 05");
        await expect(stage).toBeFocused();
        await expect(ring.locator(".ring-card").nth(2)).toHaveAttribute("inert", "");
        await page.keyboard.press(key);
        await expect(ring.locator(".ring-count")).toHaveText(key === "ArrowRight" ? "05 / 05" : "01 / 05");
        await expect(stage).toBeFocused();

        const next = ring.getByRole("button", { name: "Next project", exact: true });
        await next.focus();
        await page.keyboard.press("Enter");
        await expect(ring.locator(".ring-count")).toHaveText(key === "ArrowRight" ? "01 / 05" : "02 / 05");
        await expect(next).toBeFocused();
      });
    }
  }

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
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => sessionStorage.setItem("splash-seen", "1"));
    await page.goto("./");
    await page.evaluate(() => document.fonts.ready);
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

for (const width of [390, 1440]) {
  test(`a curved dotted trail connects Waypoint 01 to 02 without a stub above 01 at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" }); await page.goto("./#momentumx");
    const trail = page.locator("#momentumx .waypoint-trail");
    await expect(trail).toBeVisible();
    const connection = await trail.evaluate((svg: SVGSVGElement) => {
      const path = svg.querySelector("path")!, matrix = path.getScreenCTM()!;
      const first = document.querySelector("#momentumx .waypoint-marker")!.getBoundingClientRect();
      const next = document.querySelector("#veritas .waypoint-trail path") as SVGPathElement;
      const start = path.getPointAtLength(0).matrixTransform(matrix), end = path.getPointAtLength(path.getTotalLength()).matrixTransform(matrix);
      const join = next.getPointAtLength(0).matrixTransform(next.getScreenCTM()!);
      return { startGap: Math.hypot(start.x - first.left - first.width / 2, start.y - first.top - first.height / 2), joinGap: Math.hypot(end.x - join.x, end.y - join.y), dashes: getComputedStyle(path).strokeDasharray, curved: (path.getAttribute("d") ?? "").includes("C") };
    });
    expect(connection.startGap).toBeLessThan(2); expect(connection.joinGap).toBeLessThan(2);
    expect(connection.dashes).not.toBe("none"); expect(connection.curved).toBe(true);
  });
}
