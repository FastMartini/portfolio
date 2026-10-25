import { expect, test } from "@playwright/test";
import { openClimb, scrollToClimbStop } from "./helpers/climb";
import { mountainView } from "../components/climb/mountain/geometry";

test("scrolling keeps the same sharp artwork and continuously running animations", async ({ page }) => {
  await openClimb(page);
  await expect(page.locator("#climb")).toHaveAttribute("data-settled", "true", { timeout: 15000 });
  const state = await page.evaluate(async () => {
    const mountain = document.querySelector<HTMLElement>(".climb-mountain")!;
    const artwork = Array.from(mountain.querySelectorAll("svg"));
    const timelines = artwork.filter((svg) => svg.querySelector("animate, animateMotion, animateTransform"));
    const lift = mountain.querySelector("animateMotion")!.parentElement as unknown as SVGGraphicsElement;
    const pose = () => {
      const camera = lift.ownerSVGElement!.getScreenCTM()!;
      const matrix = camera.inverse().multiply(lift.getScreenCTM()!);
      return [matrix.e, matrix.f];
    };
    const poses: number[][] = [], samples: { paused: boolean; visible: boolean }[] = [];
    const startTimes = timelines.map((svg) => svg.getCurrentTime());
    const root = document.querySelector<HTMLElement>("#climb")!;
    const range = root.offsetHeight - innerHeight;
    let start: number | undefined;
    await new Promise<void>((resolve) => {
      function frame(now: number) {
        start ??= now;
        const elapsed = now - start;
        window.scrollTo(0, range * (0.15 + elapsed / 6000));
        if (root.dataset.settled === "false") {
          samples.push({ paused: timelines.some((svg) => svg.animationsPaused()),
            visible: artwork.every((svg) => getComputedStyle(svg).opacity === "1") });
          poses.push(pose());
        }
        if (elapsed < 700) requestAnimationFrame(frame);
        else resolve();
      }
      requestAnimationFrame(frame);
    });
    Reflect.set(window, "originalArtwork", artwork);
    return { samples, poses, timelineCount: timelines.length,
      elapsed: timelines.map((svg, index) => svg.getCurrentTime() - startTimes[index]),
      bitmaps: mountain.querySelectorAll("img, image, canvas").length };
  });
  expect(state.samples.length).toBeGreaterThan(1);
  expect(state.samples.every((sample) => !sample.paused && sample.visible)).toBe(true);
  expect(state.timelineCount).toBeGreaterThan(0);
  expect(state.elapsed.every((elapsed) => elapsed > 0.2)).toBe(true);
  expect(state.poses.some((pose) => Math.hypot(pose[0] - state.poses[0][0], pose[1] - state.poses[0][1]) > 0.1)).toBe(true);
  expect(state.bitmaps).toBe(0);
  await expect(page.locator("#climb")).toHaveAttribute("data-settled", "true", { timeout: 15000 });
  expect(await page.locator(".climb-mountain").evaluate((host) =>
    Array.from(host.querySelectorAll("svg")).every((svg, index) => svg === Reflect.get(window, "originalArtwork")[index]))).toBe(true);
  await scrollToClimbStop(page, 3);
  await page.locator('[data-marker="3"]').click();
  await expect(page.getByRole("dialog").locator("#panel-title")).toHaveText("Veritas");
});

test("climber and hit targets stay aligned through travel and mobile resizing", async ({ page }) => {
  await openClimb(page);
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 700 }]) {
    await page.setViewportSize(viewport);
    for (const stop of [0, 3, 9]) {
      await scrollToClimbStop(page, stop);
      const state = await page.locator(".climb-mountain").evaluate((host) => {
        const person = host.querySelector<SVGGElement>("#a-climber")!;
        const center = new DOMPoint().matrixTransform(person.getScreenCTM()!);
        const origin = host.getBoundingClientRect();
        return { width: host.clientWidth, height: host.clientHeight,
          position: Number(document.querySelector<HTMLElement>("#climb")!.dataset.position),
          x: center.x - origin.left, y: center.y - origin.top };
      });
      const view = mountainView(state.position, state.width, state.height);
      expect(Math.abs(state.x - (view.x + view.point[0] * view.scale))).toBeLessThan(1);
      expect(Math.abs(state.y - (view.y + view.point[1] * view.scale))).toBeLessThan(1);
    }
    await scrollToClimbStop(page, 3);
    await page.locator('.lm[data-stop="3"]').click();
    await expect(page.getByRole("dialog").locator("#panel-title")).toHaveText("Veritas");
    await page.getByRole("button", { name: "Close panel", exact: true }).click();
  }
});

test("weather changes do not inherit through the detailed vectors", async ({ page }) => {
  await openClimb(page);
  await expect(page.locator(".climb-sky")).toHaveCSS("--sky-top", "rgb(231,220,192)");
  expect(await page.locator("svg.mtn").evaluate((svg) => getComputedStyle(svg).getPropertyValue("--sky-top"))).toBe("");
});
