import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { expect, test } from "@playwright/test";
import type { SplashElement } from "../components/splash/controller";
import { OPEN } from "../components/splash/controller";
import { seekIntro } from "./helpers/splash";

for (const variant of ["wide", "tall"] as const) {
  test(`${variant} printed waypoints and numbers clear the unchanged trail`, async ({ page }) => {
    // Exercise the actual print builder, including its SVG text positions.
    const markup = execFileSync(process.execPath, ["--input-type=module", "-e", `import {insidePrint} from './scripts/splash/print.mjs'; process.stdout.write(insidePrint('${variant}'))`], { encoding: "utf8" });
    const route = markup.match(/<path d="([^"]+)" class="route"/)![1];
    expect(createHash("sha256").update(route).digest("hex")).toBe(variant === "wide"
      ? "c9e9deb438b1310dac27db1b8d84a0d3b1dd37b9a57f03f82036646ae00f5785"
      : "53d70ed9aa217cbd3575a43fe3d5084c180beec3626cf368946ea9c4595806a8");
    await page.goto("./#list-view");
    await page.evaluate(() => document.fonts.ready);
    const gaps = await page.evaluate(markup => {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.innerHTML = markup;
      svg.style.cssText = "position:absolute;left:-10000px;top:0;width:1000px;height:1250px;font-family:var(--font-manrope);font-weight:800";
      document.body.append(svg);
      const route = svg.querySelector<SVGPathElement>("path.route")!;
      const samples = Array.from({ length: Math.ceil(route.getTotalLength()) + 1 }, (_, i) => route.getPointAtLength(i));
      const markers = [...svg.querySelectorAll<SVGCircleElement>(".stop")];
      const labels = [...svg.querySelectorAll<SVGTextElement>(".stopn")];
      const result = markers.map((circle, i) => {
        const box = labels[i].getBBox();
        return {
          marker: Math.min(...samples.map(p => Math.hypot(p.x - circle.cx.baseVal.value, p.y - circle.cy.baseVal.value))) - circle.r.baseVal.value - 2.3,
          label: Math.min(...samples.map(p => Math.hypot(Math.max(box.x - p.x, 0, p.x - box.x - box.width), Math.max(box.y - p.y, 0, p.y - box.y - box.height)))) - 1.3,
        };
      });
      svg.remove();
      return result;
    }, markup);
    expect(gaps).toHaveLength(6);
    for (const gap of gaps) {
      expect(gap.marker).toBeGreaterThan(4);
      expect(gap.label).toBeGreaterThan(4);
    }
  });
}

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`panels reveal continuously and branding heat follows the ink fade at ${viewport.width}px`, async ({ page }, info) => {
    // Allow software WebKit to sample the folds and render each evidence frame.
    if (info.project.name === "webkit-adaptive") test.slow();
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("./");
    await seekIntro(page, 0);
    const changes = await page.locator("body > .splash").evaluate((el: SplashElement) => {
      const faces = [...el.querySelectorAll<HTMLElement>(".splash-face")];
      let previous: { visible: string; normal: number }[] = [];
      const changes: { time: number; normal: number }[] = [];
      for (let t = 1700; t <= 3500; t += 10) {
        el.splashController!.seek(t);
        const state = faces.map(face => ({ visible: getComputedStyle(face).opacity, normal: new DOMMatrix(getComputedStyle(face.parentElement!).transform).m33 }));
        state.forEach((current, i) => {
          if (previous[i] && previous[i].visible !== current.visible) changes.push({ time: t, normal: Math.min(Math.abs(current.normal), Math.abs(previous[i].normal)) });
        });
        previous = state;
      }
      return changes;
    });
    expect(changes.length).toBeGreaterThan(5);
    // A broad panel must never pop in at another panel's fold threshold.
    for (const change of changes) expect(change.normal).toBeLessThan(0.12);
    for (const time of [1400, 2000, 2150, 2350, 2700, 2950, 3200, 3500]) {
      await seekIntro(page, time);
      await page.screenshot({ path: info.outputPath(`fold-${time}.png`) });
    }
    for (const time of [4050, 4200, 4320, OPEN.greeting + 60, 4600]) {
      await seekIntro(page, time);
      const png = await page.screenshot({ path: info.outputPath(`handoff-${time}.png`) });
      const evidence = await page.evaluate(async ({ png }) => {
        const image = new Image(); image.src = `data:image/png;base64,${png}`; await image.decode();
        const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height;
        const ctx = canvas.getContext("2d")!; ctx.drawImage(image, 0, 0);
        const box = document.querySelector("#trailhead-title")!.getBoundingClientRect(), s = image.width / innerWidth;
        const pixels = ctx.getImageData(box.x * s, box.y * s, box.width * s, box.height * s).data;
        let ink = 0, heat = 0;
        for (let i = 0; i < pixels.length; i += 4) {
          if (pixels[i] < 130 && pixels[i + 1] < 140 && pixels[i + 2] < 130) ink++;
          if (pixels[i] > pixels[i + 1] + 10 && pixels[i + 1] > pixels[i + 2] + 10) heat++;
        }
        return { ink, heat, contours: +getComputedStyle(document.querySelector(".splash-print")!).opacity };
      }, { png: png.toString("base64") });
      expect(evidence.contours > 0.15 || evidence.ink > 20 || evidence.heat > 20, `the map ink or branding heat must remain visible at ${time}ms`).toBe(true);
    }
    await page.keyboard.press("Escape");
    await expect(page.locator(".splash")).toBeHidden();
  });
}
