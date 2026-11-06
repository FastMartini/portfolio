import { expect, test } from "@playwright/test";
import { buildScenery } from "../components/climb/mountain/scenery";
import sceneryBeforeTrees from "./fixtures/scenery-before-trees.json";

test("Alpine spruce preserves cloud, terrain, and shading data without redundant cloud clips", () => {
  const scenery = buildScenery();
  for (const key of ["distant", "backdrop", "bands", "shade", "cloudsFront"] as const) {
    // Theme class hooks and the removed no-op clip leave all original geometry
    // and paint attributes byte-identical to the approved daytime fixture.
    expect(scenery[key].replace(/ class="(?:far-a|far-b|clouds|cb|ct)"/g, ""), key).toBe(sceneryBeforeTrees[key].replaceAll(' clip-path="url(#cloud-base)"', ""));
  }
});

test("seeded clouds fit entirely inside the removed clip rectangle", async ({ page }) => {
  await page.goto("./climb-preview/");
  await expect(page.locator(".climb-mountain")).toHaveAttribute("data-ready", "true");
  const bounds = await page.locator('.climb-vector-camera g[transform="translate(0 0)"]').evaluateAll((clouds) =>
    clouds.map((cloud) => {
      const box = (cloud as SVGGraphicsElement).getBBox();
      return { left: box.x, top: box.y, right: box.x + box.width, bottom: box.y + box.height };
    }));
  expect(bounds).toHaveLength(46);
  expect(bounds.every((box) => box.left >= -4000 && box.top >= -4000 && box.right <= 5000 && box.bottom <= 5000)).toBe(true);
});

test("Alpine spruce generation is deterministic and every tree references a defined variant", () => {
  const scenery = buildScenery();
  expect(buildScenery()).toEqual(scenery);
  const ids = [...scenery.treeDefs.matchAll(/id="(tv-[a-z]+\d+)"/g)].map((match) => match[1]);
  expect(new Set(ids).size).toBe(ids.length);
  expect(ids).toHaveLength(18);
  const trees = scenery.trees.map((tree) => tree.markup).join("") + scenery.hillTrees + scenery.edgeTrees;
  const references = [...trees.matchAll(/href="#(tv-[a-z]+\d+)"/g)].map((match) => match[1]);
  expect(references.length).toBeGreaterThan(500);
  expect(references.some((reference) => reference.startsWith("tv-snow"))).toBe(true);
  expect([...new Set(references)].filter((reference) => !ids.includes(reference))).toEqual([]);
});

test("mountain paint layers render every tree from shared vector definitions", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./climb-preview/");
  await expect(page.locator(".climb-mountain")).toHaveAttribute("data-ready", "true");
  const rendered = await page.locator(".climb-vector-camera").evaluate((svg) => {
    const ids = [...svg.querySelectorAll('defs > g[id^="tv-"]')].map((shape) => shape.id);
    const trees = [...svg.querySelectorAll<SVGUseElement>('use[href^="#tv-"]')];
    return {
      ids,
      count: trees.length,
      unresolved: trees.filter((tree) => {
        const shape = svg.querySelector(tree.getAttribute("href")!);
        const bounds = tree.getBBox();
        return !shape || !svg.contains(shape) || bounds.width <= 0 || bounds.height <= 0;
      }).map((tree) => tree.outerHTML),
    };
  });
  expect(rendered.ids).toHaveLength(18);
  expect(new Set(rendered.ids).size).toBe(18);
  expect(rendered.count).toBeGreaterThan(500);
  expect(rendered.unresolved).toEqual([]);
  expect(errors).toEqual([]);
});
