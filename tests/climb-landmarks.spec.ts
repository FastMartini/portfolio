import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test } from "@playwright/test";
import { openClimb } from "./helpers/climb";
import { buildLandmarks } from "../components/climb/mountain/landmarks";
import { summitFlag } from "../components/climb/mountain/landmarks/summitFlag";

test("Landmarks and the generated traveling-wave flag are deterministic", () => {
  expect(buildLandmarks()).toEqual(buildLandmarks());
  expect(summitFlag()).toBe(summitFlag());
});

test("all six Landmarks and flag keyframes match approved reference artwork", async ({ page, browser }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openClimb(page);
  await expect(page.locator(".lm")).toHaveCount(6);
  const reference = await browser.newPage({ reducedMotion: "reduce" });
  await reference.route("https://fonts.googleapis.com/**", (route) => route.abort());
  await reference.goto(pathToFileURL(resolve("docs/handoff/reference/climb-reference.html")).href);
  for (const stop of [2, 3, 4, 5, 6, 7]) {
    // The named keyboard control wraps decorative, unchanged reference art.
    expect(await page.locator(`.lm[data-stop="${stop}"] > .lm-art`).innerHTML()).toBe(
      await reference.locator(`.lm[data-stop="${stop}"]`).innerHTML(),
    );
  }
  expect(await page.locator(".summit-flag").innerHTML()).toBe(await reference.locator(".summit-flag").innerHTML());
  await expect(page.locator(".summit-flag > path")).toHaveCount(12);
  const frames = await page.locator(".summit-flag animate").evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute("values")!.split(";")));
  for (const values of frames) {
    expect(values).toHaveLength(31);
    expect(values[0]).toBe(values[30]);
  }
  await reference.close();
});

test("chairs follow one closed loop and the scene pauses on live reduced-motion changes", async ({ page }) => {
  await openClimb(page);
  const svg = page.locator("svg.mtn");
  await expect(svg).toBeAttached();
  await expect(page.locator(".lift animateMotion")).toHaveCount(12);
  const paths = await page.locator(".lift animateMotion").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("path")));
  expect(new Set(paths).size).toBe(1);
  expect(paths[0]).toMatch(/ Z$/);
  expect(paths[0]!.match(/ A/g)).toHaveLength(2);
  const gap = await svg.evaluate((node, d) => {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d!); node.appendChild(path);
    const a = path.getPointAtLength(0), b = path.getPointAtLength(path.getTotalLength() - 0.01);
    path.remove(); return Math.hypot(a.x - b.x, a.y - b.y);
  }, paths[0]);
  expect(gap).toBeLessThan(0.02);
  await expect.poll(() => svg.evaluate((node) => (node as SVGSVGElement).animationsPaused())).toBe(false);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(() => svg.evaluate((node) => (node as SVGSVGElement).animationsPaused())).toBe(true);
  const time = await svg.evaluate((node) => (node as SVGSVGElement).getCurrentTime());
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  expect(await svg.evaluate((node) => (node as SVGSVGElement).getCurrentTime())).toBe(time);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator("#list-view")).toBeVisible();
  await page.getByRole("button", { name: "Climb view", exact: true }).click();
  await expect.poll(() => svg.evaluate((node) => (node as SVGSVGElement).animationsPaused())).toBe(false);
  await page.getByRole("button", { name: "List view", exact: true }).click();
  await expect.poll(() => svg.evaluate((node) => (node as SVGSVGElement).animationsPaused())).toBe(true);
});
