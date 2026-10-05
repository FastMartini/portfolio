import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { campSite, landmarkSites, mountainView, sampleTrail, trailLength, trailPath, trailSamples } from "../components/climb/mountain/geometry";
import { buildMountainMarkup } from "../components/climb/mountain/scene";
import { buildScenery, paintDepth } from "../components/climb/mountain/scenery";

test("pure mountain builders are deterministic and preserve shared depth order", () => {
  expect(buildMountainMarkup()).toBe(buildMountainMarkup());
  const scenery = buildScenery();
  expect(scenery.trees.length).toBeGreaterThan(500);
  expect(paintDepth([{ groundY: 20, markup: "tree" }], [{ groundY: 10, markup: "landmark" }])).toBe("landmarktree");
  expect(landmarkSites).toHaveLength(6);
  expect(campSite.y).toBeGreaterThan(landmarkSites[0].y);
  expect(sampleTrail(-1)).toEqual(sampleTrail(0));
  expect(sampleTrail(2)).toEqual(sampleTrail(1));
  expect(mountainView(0, 390, 844).scale).toBeCloseTo(844 / 1350 * 0.66);
});

for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
  test(`static mountain matches the reference scenery at ${viewport.width}px`, async ({ page, browser }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto("./climb-preview/");
    await expect(page.locator(".climb-mountain")).toHaveAttribute("data-ready", "true");
    await page.locator(".climb-preview-caption").evaluate((element) => element.remove());
    await page.evaluate(() => {
      document.querySelectorAll(".lm, .lift").forEach((element) => element.remove());
      document.querySelectorAll('svg.mtn > g[transform]:not(#a-climber), svg.mtn > g[clip-path="url(#mtn-clip)"] > g[transform]')
        .forEach((element) => element.remove());
    });

    const reference = await browser.newPage({ viewport, reducedMotion: "reduce" });
    await reference.route("https://fonts.googleapis.com/**", (route) => route.abort());
    await reference.goto(pathToFileURL(resolve("docs/handoff/reference/climb-reference.html")).href);
    await expect(reference.locator("svg.mtn")).toBeAttached();
    await reference.evaluate(() => {
      // Phase 2 comparison excludes only artwork/UI scheduled for phases 3–5.
      document.querySelectorAll(".lm, .lift").forEach((element) => element.remove());
      document.querySelectorAll('svg.mtn > g[transform]:not(#a-climber), svg.mtn > g[clip-path="url(#mtn-clip)"] > g[transform]')
        .forEach((element) => element.remove());
      document.querySelectorAll(".climb-header, .cards, .markers, .rail, .trail-sign, .panel, .haze, .sun")
        .forEach((element) => element.remove());
    });
    const native = await reference.locator("#a-trail").evaluate((element) => {
      const path = element as SVGPathElement;
      const length = path.getTotalLength();
      return {
        d: path.getAttribute("d"), length,
        samples: Array.from({ length: 601 }, (_, index) => {
          const point = path.getPointAtLength(length * index / 600);
          return [point.x, point.y];
        }),
      };
    });
    expect(trailPath).toBe(native.d);
    expect(Math.abs(trailLength - native.length)).toBeLessThan(0.25);
    const maxSampleError = Math.max(...trailSamples.map((point, index) =>
      Math.hypot(point[0] - native.samples[index][0], point[1] - native.samples[index][1]),
    ));
    expect(maxSampleError).toBeLessThan(0.25);

    // Compare vector data exactly as well as pixels: small rasterization
    // differences must not conceal changes to seeded trees, bands, or clouds.
    const shapes = (svg: SVGSVGElement) => Array.from(
      svg.querySelectorAll("polygon, path:not(#a-walked), circle, ellipse"),
      (element) => ({
        tag: element.tagName,
        attributes: Array.from(element.attributes, (attribute) => [attribute.name, attribute.value])
          .sort((a, b) => a[0].localeCompare(b[0])),
      }),
    );
    expect(await page.locator("svg.mtn").evaluate(shapes)).toEqual(
      await reference.locator("svg.mtn").evaluate(shapes),
    );

    const before = await reference.locator("#sketch-a").screenshot();
    const after = await page.locator(".climb-preview").screenshot();
    await testInfo.attach("reference-phase2.png", { body: before, contentType: "image/png" });
    await testInfo.attach("ported-phase2.png", { body: after, contentType: "image/png" });
    const difference = await page.evaluate(async ({ a, b }) => {
      async function pixels(base64: string) {
        const image = new Image();
        image.src = `data:image/png;base64,${base64}`;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = image.width; canvas.height = image.height;
        const context = canvas.getContext("2d")!;
        context.drawImage(image, 0, 0);
        return context.getImageData(0, 0, canvas.width, canvas.height).data;
      }
      const first = await pixels(a), second = await pixels(b);
      if (first.length !== second.length) throw new Error("Reference and preview dimensions differ");
      let changed = 0;
      for (let index = 0; index < first.length; index += 4) {
        if (Math.max(...[0, 1, 2].map((channel) => Math.abs(first[index + channel] - second[index + channel]))) > 12) changed++;
      }
      return changed / (first.length / 4);
    }, { a: before.toString("base64"), b: after.toString("base64") });
    await testInfo.attach("comparison.json", {
      body: JSON.stringify({ difference, maxSampleError, viewport }), contentType: "application/json",
    });
    // Same 1% raster tolerance as the repo's existing visual snapshots.
    expect(difference).toBeLessThan(0.01);
    await reference.close();
  });
}

test("resizing the preview reuses the SVG and remains accessible on mobile", async ({ page }) => {
  await page.goto("./climb-preview/");
  const host = page.locator(".climb-mountain");
  await expect(host).toHaveAttribute("data-ready", "true");
  const svg = await page.locator("svg.mtn").elementHandle();
  const initial = await page.locator("svg.mtn").getAttribute("style");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("svg.mtn")).not.toHaveAttribute("style", initial!);
  expect(await svg!.evaluate((element) => element === document.querySelector("svg.mtn"))).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  await expect(page.locator("svg.mtn")).toHaveCSS("max-width", "none");
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]);
  await page.getByRole("link", { name: "Back to the portfolio" }).click();
  await expect(page).toHaveURL(/\/portfolio\/$/);
});
