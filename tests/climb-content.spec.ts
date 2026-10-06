import { readFileSync } from "node:fs";

import { expect, test } from "@playwright/test";

import { journeyStops } from "../content/journey";
import { waypoints } from "../content/waypoints";

test("the ten Climb stops preserve the reference STOP_T and canonical Waypoint order", () => {
  const reference = readFileSync(
    "docs/handoff/reference/climb.js",
    "utf8",
  );
  const positions = reference.match(/var STOP_T = (\[[^\]]+\]);/);
  if (!positions) throw new Error("The handoff reference must define STOP_T");
  expect(journeyStops.map((stop) => stop.trailPosition)).toEqual(
    JSON.parse(positions[1]),
  );
  expect(journeyStops).toHaveLength(10);
  expect(journeyStops.map((stop) => stop.label)).toEqual([
    "Trailhead", "Base camp", ...waypoints.map((waypoint) => waypoint.name),
    "A quiet overlook", "Summit",
  ]);
  expect(journeyStops.slice(2, 8).map((stop) => stop.id)).toEqual(
    waypoints.map((waypoint) => waypoint.slug),
  );
  expect(new Set(journeyStops.map((stop) => stop.id)).size).toBe(10);
  for (let index = 1; index < journeyStops.length; index++) {
    expect(journeyStops[index].trailPosition).toBeGreaterThan(journeyStops[index - 1].trailPosition);
  }
});

test("the server List View and every published Case Study remain reachable without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("./#list-view");
  const list = page.locator("#list-view");
  await expect(list).toBeVisible();
  await expect(list).toHaveClass("list-view");
  await expect(list.locator("[data-waypoint-slug]")).toHaveCount(6);
  await expect(list.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(list.getByRole("link", { name: "Email Diego" })).toHaveAttribute(
    "href", "mailto:diegommart2004@gmail.com",
  );
  for (const waypoint of waypoints) {
    if (!("caseStudyHref" in waypoint)) continue;
    await page.goto(`./#${waypoint.slug}`);
    const link = page.locator(`#${waypoint.slug}`).getByRole("link", { name: "Read case study" });
    await expect(link).toHaveAttribute("href", `#case-${waypoint.slug}`);
    await link.click();
    await expect(page.locator(`#case-${waypoint.slug}`)).toBeVisible();
    await page.getByRole("link", { name: "Standalone Case Study" }).click();
    await expect(page.getByRole("heading", { level: 1, name: waypoint.name, exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: `Return to the ${waypoint.name} Waypoint` })).toHaveAttribute(
      "href", `/portfolio/#${waypoint.slug}`,
    );
  }
  await context.close();
});
