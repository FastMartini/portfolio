import { expect, test } from "@playwright/test";
import { buildScenery } from "../components/climb/mountain/scenery";
import sceneryBeforeTrees from "./fixtures/scenery-before-trees.json";

test("Alpine spruce leaves clouds, terrain, and mountain shading byte-identical", () => {
  const scenery = buildScenery();
  for (const key of ["distant", "backdrop", "bands", "shade", "cloudsFront"] as const) {
    expect(scenery[key], key).toBe(sceneryBeforeTrees[key]);
  }
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
