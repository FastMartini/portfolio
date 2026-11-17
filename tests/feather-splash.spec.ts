import { expect, test } from "@playwright/test";
import { seekIntro, imageDifference } from "./helpers/splash";

const paper = "rgb(243, 238, 221)";

for (const theme of ["light", "dark"] as const) {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
    test(`${theme} paper stays uniform as the map drifts, settles and unfolds at ${viewport.width}x${viewport.height}`, async ({ page }, info) => {
      // Software WebKit captures 22 detailed SVG frames in this pixel check.
      if (info.project.name === "webkit-adaptive") test.slow();
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await page.addInitScript(theme => localStorage.setItem("portfolio-theme", theme), theme);
      await page.goto("./");
      await seekIntro(page, 0);
      await expect(page.locator(".splash-hand, .h-sleeve")).toHaveCount(0);
      const cover = page.locator(".splash-row--top .splash-pane .splash-face--back");
      const first = (await cover.boundingBox())!;
      expect(first.y + first.height).toBeLessThan(0);
      await seekIntro(page, 350);
      expect((await cover.boundingBox())!.y + (await cover.boundingBox())!.height).toBeGreaterThan(0);
      const samples: { time: number; x: number; y: number }[] = [];
      for (const time of [0, 650, 1220, 1700, 1930, 2350, 2750, 3100, 3500, 4100, 4420]) {
        await seekIntro(page, time);
        const box = (await page.locator(".splash-rig").boundingBox())!;
        samples.push({ time, x: box.x + box.width / 2, y: box.y + box.height / 2 });
        const colors = await page.locator(".splash-face, .splash-sheet, .splash-pane-cover").evaluateAll(faces => faces.map(face => getComputedStyle(face).backgroundColor));
        expect(colors.every(color => color === paper)).toBe(true);
        // Rendering regression: turning off the former green lighting/grain
        // layers must not change any pixel on the actual map.
        const before = await page.screenshot({ path: info.outputPath(`frame-${time}.png`) });
        const hideTint = await page.addStyleTag({ content: ".splash-shade,.splash-cast,.splash-sheen{display:none!important}.splash-face::before{display:none!important}" });
        const difference = await imageDifference(page, before, await page.screenshot());
        expect(difference.mean).toBeLessThan(0.1);
        await hideTint.evaluate(el => el.parentNode?.removeChild(el));
      }
      const at = (time: number) => samples.find(sample => sample.time === time)!;
      expect(at(650).x).toBeGreaterThan(at(0).x);
      expect(at(1220).x).toBeLessThan(at(650).x);
      expect(at(1930).y).toBeGreaterThan(at(0).y);
      expect(Math.abs(at(1930).x - viewport.width / 2)).toBeLessThan(1);
      expect(Math.abs(at(1930).y - viewport.height / 2)).toBeLessThan(1);
      // Unfold during the tail of the sway, without a motionless beat.
      await seekIntro(page, 1740);
      const closed = await page.locator(".splash-row--top .splash-pane").evaluate(el => getComputedStyle(el).transform);
      await seekIntro(page, 1900);
      expect(await page.locator(".splash-row--top .splash-pane").evaluate(el => getComputedStyle(el).transform)).not.toEqual(closed);
      // At full zoom the center is unprinted, exact navbar-colored paper.
      await seekIntro(page, 4420);
      await expect(page.locator(".splash-sheet")).toHaveCSS("background-color", paper);
      const png = await page.screenshot();
      const unprintedPixels = await page.evaluate(async png => {
        const image = new Image(); image.src = `data:image/png;base64,${png}`; await image.decode();
        const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height;
        const ctx = canvas.getContext("2d")!; ctx.drawImage(image, 0, 0);
        return [[5, 5], [canvas.width - 5, 5], [5, canvas.height - 5], [canvas.width / 2, canvas.height - 5]]
          .map(([x, y]) => [...ctx.getImageData(x, y, 1, 1).data]);
      }, png.toString("base64"));
      expect(unprintedPixels).toEqual(Array(4).fill([243, 238, 221, 255]));
      await page.keyboard.press("Escape");
      await expect(page.locator(".splash")).toBeHidden();
    });
  }
}

test("fresh dark-device visit paints Light immediately and manual choices survive reload", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.addInitScript(() => {
    const paints: { theme?: string; background: string }[] = [];
    Reflect.set(window, "firstThemePaints", paints);
    function sample() {
      if (document.body) paints.push({ theme: document.documentElement.dataset.theme, background: getComputedStyle(document.body).backgroundColor });
      if (paints.length < 8) requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
  });
  await page.goto("./");
  await expect.poll(() => page.evaluate(() => Reflect.get(window, "firstThemePaints").length)).toBe(8);
  expect(await page.evaluate(() => Reflect.get(window, "firstThemePaints"))).toEqual(Array(8).fill({ theme: "light", background: paper }));
  await page.keyboard.press("Escape");
  expect(await page.evaluate(() => localStorage.getItem("portfolio-theme"))).toBeNull();
  for (const theme of ["dark", "light"] as const) {
    await page.getByRole("button", { name: `Switch to ${theme} theme` }).click();
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await expect(page.getByRole("banner")).toHaveCSS("background-color", theme === "light" ? paper : "rgb(26, 33, 29)");
    expect(await page.evaluate(() => localStorage.getItem("portfolio-theme"))).toBe(theme);
  }
});

test("server-rendered homepage is Light with JavaScript disabled", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, colorScheme: "dark" });
  const page = await context.newPage();
  await page.goto("./");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.getByRole("banner")).toHaveCSS("background-color", paper);
  await context.close();
});
