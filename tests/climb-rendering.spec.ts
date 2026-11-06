import { chromium, expect, test } from "@playwright/test";
import { openClimb, scrollToClimbStop } from "./helpers/climb";
import { mountainView } from "../components/climb/mountain/geometry";

for (const theme of ["dark", "light"] as const) {
test(`native scrolling across the whole route keeps the ${theme} scene painted with a constrained GPU cache`, async ({ browserName, baseURL }, testInfo) => {
  test.skip(browserName !== "chromium", "GPU cache controls and screencasting require Chromium");
  test.setTimeout(90_000);
  const headed = process.env.SCROLL_BROWSER_HEADED === "1";
  const gpuBudget = process.env.SCROLL_GPU_BUDGET ?? "128";
  const browser = await chromium.launch({
    headless: !headed,
    channel: process.env.SCROLL_BROWSER_CHANNEL || undefined,
    args: gpuBudget === "normal" ? [] : [`--force-gpu-mem-available-mb=${gpuBudget}`],
  });
  try {
    // Visible-window checks use the physical content area; an emulated viewport
    // larger than the window would include pixels Chrome is not displaying.
    const page = await browser.newPage(headed
      ? { baseURL, viewport: null, deviceScaleFactor: undefined }
      : { baseURL, viewport: { width: 1512, height: 850 }, deviceScaleFactor: 2 });
    await openClimb(page, theme);
    await page.locator(".splash").waitFor({ state: "hidden" });
    // This color exists only behind the opaque scene. It catches missing paint
    // independently of the site's theme, unlike checking for a dark background.
    const backing = [253, 3, 217];
    await page.addStyleTag({ content: `html, body { background: rgb(${backing.join(",")}) !important; }` });
    await page.locator("#climb").evaluate(() => window.scrollTo(0, 100));
    await expect(page.locator("#climb")).toHaveAttribute("data-settled", "true", { timeout: 15000 });
    // One complete forward/backward pass reproduces the upper-route failure,
    // while leaving enough time for pixel analysis on the Linux software GPU.
    const travel = await page.locator("#climb").evaluate((root: HTMLElement) => root.offsetHeight - innerHeight - 200);
    const steps = Math.ceil(travel / 500);
    await page.waitForTimeout(1500);
    const session = await page.context().newCDPSession(page);
    const frames: string[] = [];
    session.on("Page.screencastFrame", (event) => {
      frames.push(event.data);
      void session.send("Page.screencastFrameAck", { sessionId: event.sessionId }).catch(() => {});
    });
    const captureStart = Date.now();
    await session.send("Page.startScreencast", { format: "jpeg", quality: 85, maxWidth: 1000, maxHeight: 650, everyNthFrame: 1 });
    const root = page.locator("#climb");
    const endpoints: { position: string; settled: string }[] = [];
    async function captureEndpoint(position: string) {
      await expect(root).toHaveAttribute("data-position", position, { timeout: 15000 });
      await expect(root).toHaveAttribute("data-settled", "true", { timeout: 15000 });
      endpoints.push(await root.evaluate((element) => ({ position: element.dataset.position!, settled: element.dataset.settled! })));
      // An idle compositor need not deliver another screencast event. Capture
      // the settled endpoint explicitly while the screencast is still active.
      frames.push((await session.send("Page.captureScreenshot", { format: "jpeg", quality: 85 })).data);
    }
    await captureEndpoint("0.0000");
    const pointer = await page.evaluate(() => ({ x: innerWidth * 0.75, y: innerHeight * 0.75 }));
    await page.mouse.move(pointer.x, pointer.y);
    for (const direction of [1, -1]) {
      for (let i = 0; i < steps; i++) {
        if (process.env.SCROLL_THEME_TRANSITIONS === "1" && i === Math.floor(steps / 2)) {
          await page.getByRole("button", { name: /Switch to (light|dark) theme/ }).click();
          await page.mouse.move(pointer.x, pointer.y);
        }
        await page.mouse.wheel(0, direction * travel / steps);
        await page.waitForTimeout(25);
      }
      await captureEndpoint(direction === 1 ? "1.0000" : "0.0000");
    }
    await session.send("Page.stopScreencast");
    const captureMs = Date.now() - captureStart;
    expect(endpoints).toEqual([
      { position: "0.0000", settled: "true" },
      { position: "1.0000", settled: "true" },
      { position: "0.0000", settled: "true" },
    ]);
    expect(frames.length).toBeGreaterThan(50);
    // DOM visibility and settled screenshots cannot detect transient lost tiles.
    const analysisStart = Date.now();
    const missing = await page.evaluate(async ({ frames, backing }) => {
      const canvas = new OffscreenCanvas(1, 1);
      const context = canvas.getContext("2d", { willReadFrequently: true })!;
      const [red, green, blue] = backing;
      async function readPixels(blob: Blob) {
        const image = await createImageBitmap(blob);
        const { width, height } = image;
        if (canvas.width !== width) canvas.width = width;
        if (canvas.height !== height) canvas.height = height;
        context.drawImage(image, 0, 0);
        const pixels = context.getImageData(0, 0, width, height).data;
        image.close();
        return { pixels, width, height };
      }
      function exposesBacking({ pixels, width, height }: Awaited<ReturnType<typeof readPixels>>) {
        for (let y = 80; y < height - 32; y += 32) {
          for (let x = 0; x < width - 32; x += 32) {
            let exposed = 0;
            for (let dy = 0; dy < 32; dy++) for (let dx = 0; dx < 32; dx++) {
              const p = ((y + dy) * width + x + dx) * 4;
              if (Math.abs(pixels[p] - red) < 8 && Math.abs(pixels[p + 1] - green) < 8 && Math.abs(pixels[p + 2] - blue) < 8) exposed++;
            }
            if (exposed > 980) return true;
          }
        }
        return false;
      }
      // Both controls use the same JPEG decoder and pixel oracle as captures.
      // This guards against silently accepting every frame after decoder changes.
      const control = new OffscreenCanvas(160, 160);
      const paint = control.getContext("2d")!;
      paint.fillStyle = `rgb(${backing.join(",")})`;
      paint.fillRect(0, 0, 160, 160);
      if (!exposesBacking(await readPixels(await control.convertToBlob({ type: "image/jpeg" })))) throw new Error("Missing-paint oracle failed its exposed-backing control");
      paint.fillStyle = "black";
      paint.fillRect(0, 0, 160, 160);
      if (exposesBacking(await readPixels(await control.convertToBlob({ type: "image/jpeg" })))) throw new Error("Missing-paint oracle failed its opaque control");
      let missing = 0;
      for (const frame of frames) {
        // Close each decoded bitmap before reading the next captured frame.
        const binary = atob(frame), bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        if (exposesBacking(await readPixels(new Blob([bytes], { type: "image/jpeg" })))) missing++;
      }
      return missing;
    }, { frames, backing });
    await testInfo.attach("rendered-route-coverage.json", {
      body: JSON.stringify({ browser: browser.version(), headed, gpuBudget, theme, transitions: process.env.SCROLL_THEME_TRANSITIONS === "1",
        viewport: await page.evaluate(() => ({ width: innerWidth, height: innerHeight, deviceScaleFactor: devicePixelRatio })),
        endpoints, frames: frames.length, missing, captureMs, analysisMs: Date.now() - analysisStart }), contentType: "application/json",
    });
    expect(missing, "no captured frame should expose the page backing through the scene").toBe(0);
  } finally { await browser.close(); }
});

}

for (const samplingDelay of [0, 900]) {
  test(`scrolling keeps sharp artwork and running animations with ${samplingDelay ? "sparse" : "native"} frame samples`, async ({ page }) => {
    await openClimb(page);
    await expect(page.locator("#climb")).toHaveAttribute("data-settled", "true", { timeout: 15000 });
    const state = await page.evaluate(async (samplingDelay) => {
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
      let start: number | undefined, lastSample = -Infinity, raf = 0, timedOut = false;
      await new Promise<void>((resolve) => {
        const finish = () => { cancelAnimationFrame(raf); clearTimeout(deadline); resolve(); };
        // A wall-clock deadline also bounds the test if RAF delivery stops.
        const deadline = setTimeout(() => { timedOut = true; finish(); }, 8000);
        function frame(now: number) {
          start ??= now;
          const elapsed = now - start;
          // Keep scrolling within the mountain for the whole observation window.
          window.scrollTo(0, range * (0.15 + 0.2 * (0.5 - 0.5 * Math.cos(elapsed / 4000 * Math.PI * 2))));
          if (root.dataset.settled === "false" && now - lastSample >= samplingDelay) {
            lastSample = now;
            samples.push({ paused: timelines.some((svg) => svg.animationsPaused()),
              visible: artwork.every((svg) => getComputedStyle(svg).opacity === "1") });
            poses.push(pose());
          }
          if (elapsed >= 700 && samples.length >= 3) finish();
          else raf = requestAnimationFrame(frame);
        }
        raf = requestAnimationFrame(frame);
      });
      Reflect.set(window, "originalArtwork", artwork);
      return { samples, poses, timedOut, timelineCount: timelines.length,
        elapsed: timelines.map((svg, index) => svg.getCurrentTime() - startTimes[index]),
        bitmaps: mountain.querySelectorAll("img, image, canvas").length };
    }, samplingDelay);
    expect(state.timedOut, "collect three moving samples before the wall-clock deadline").toBe(false);
    expect(state.samples.length).toBeGreaterThanOrEqual(3);
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
}

// Give each resize/travel case its own test budget. Combining six stops and
// panel interactions can exhaust the test timeout on WebKit's software painter.
for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 700 }]) {
  for (const stop of [0, 3, 9]) {
    test(`climber and hit targets align at stop ${stop} after resizing to ${viewport.width}px`, async ({ page }) => {
      await openClimb(page);
      await page.setViewportSize(viewport);
      await scrollToClimbStop(page, stop);
      // Stop 0 can already be settled before ResizeObserver renders the new
      // camera. Poll the actual geometry, retaining the one-pixel tolerance.
      await expect.poll(async () => {
        const state = await page.locator(".climb-mountain").evaluate((host) => {
          const person = host.querySelector<SVGGElement>("#a-climber")!;
          const center = new DOMPoint().matrixTransform(person.getScreenCTM()!);
          const origin = host.getBoundingClientRect();
          return { width: host.clientWidth, height: host.clientHeight,
            position: Number(document.querySelector<HTMLElement>("#climb")!.dataset.position),
            x: center.x - origin.left, y: center.y - origin.top };
        });
        const view = mountainView(state.position, state.width, state.height);
        return Math.max(Math.abs(state.x - (view.x + view.point[0] * view.scale)),
          Math.abs(state.y - (view.y + view.point[1] * view.scale)));
      }, { message: "climber aligns with the camera for the current viewport", timeout: 15000 }).toBeLessThan(1);
      if (stop === 3) {
        await page.locator('.lm[data-stop="3"]').click();
        await expect(page.getByRole("dialog").locator("#panel-title")).toHaveText("Veritas");
        await page.getByRole("button", { name: "Close panel", exact: true }).click();
        await expect(page.getByRole("dialog")).toBeHidden();
      }
    });
  }
}

test("weather changes do not inherit through the detailed vectors", async ({ page }) => {
  await openClimb(page, "light");
  await expect(page.locator(".climb-sky")).toHaveCSS("--sky-top", "rgb(231,220,192)");
  expect(await page.locator("svg.mtn").evaluate((svg) => getComputedStyle(svg).getPropertyValue("--sky-top"))).toBe("");
});
