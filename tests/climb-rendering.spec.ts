import { chromium, expect, test } from "@playwright/test";
import { openClimb, scrollToClimbStop } from "./helpers/climb";
import { mountainView } from "../components/climb/mountain/geometry";

test("a stationary camera does not invalidate the mountain on scroll events", async ({ page }) => {
  await openClimb(page);
  await scrollToClimbStop(page, 3);
  const changes = await page.evaluate(async () => {
    let changes = 0;
    const observer = new MutationObserver((records) => { changes += records.length; });
    for (const selector of [".climb-vector-camera", "#a-walked", "#a-climber"])
      observer.observe(document.querySelector(selector)!, { attributes: true });
    for (let i = 0; i < 5; i++) {
      window.dispatchEvent(new Event("scroll"));
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    }
    observer.disconnect();
    return changes;
  });
  expect(changes).toBe(0);
});

test("repeated native scrolling keeps every scene tile painted with a constrained GPU cache", async ({ browserName, baseURL }) => {
  test.skip(browserName !== "chromium", "GPU cache controls are Chromium-specific");
  test.setTimeout(45_000);
  const browser = await chromium.launch({
    channel: process.env.SCROLL_BROWSER_CHANNEL || undefined,
    args: ["--force-gpu-mem-available-mb=128"],
  });
  try {
    const page = await browser.newPage({ baseURL, viewport: { width: 1512, height: 850 }, deviceScaleFactor: 2, colorScheme: "dark" });
    await openClimb(page);
    await page.locator(".splash").waitFor({ state: "hidden" });
    await scrollToClimbStop(page, 3);
    const session = await page.context().newCDPSession(page);
    const frames: string[] = [];
    session.on("Page.screencastFrame", (event) => {
      frames.push(event.data);
      void session.send("Page.screencastFrameAck", { sessionId: event.sessionId }).catch(() => {});
    });
    await session.send("Page.startScreencast", { format: "jpeg", quality: 85, maxWidth: 1000, maxHeight: 650, everyNthFrame: 1 });
    await page.mouse.move(1250, 700);
    for (let cycle = 0; cycle < 4; cycle++) {
      for (const direction of [1, -1]) {
        for (let i = 0; i < 16; i++) {
          await page.mouse.wheel(0, direction * 180);
          await page.waitForTimeout(25);
        }
      }
    }
    await session.send("Page.stopScreencast");
    await expect(page.locator("#climb")).toBeVisible();
    expect(frames.length).toBeGreaterThan(50);
    // Inspect the captured pixels, rather than DOM visibility: the lost GPU
    // tiles in the recording still had visible elements and valid geometry.
    const missing = await page.evaluate(async (frames) => {
      const canvas = new OffscreenCanvas(1, 1);
      const context = canvas.getContext("2d", { willReadFrequently: true })!;
      let missing = 0;
      for (const frame of frames) {
        const image = new Image();
        image.src = `data:image/jpeg;base64,${frame}`;
        await image.decode();
        canvas.width = image.width; canvas.height = image.height;
        context.drawImage(image, 0, 0);
        const pixels = context.getImageData(0, 0, image.width, image.height).data;
        let blank = false;
        // Check the whole illustrated viewport, below the header/sound control.
        // The opaque sky should always cover the dark page backing (#1a211d).
        for (let y = 80; y < image.height - 32 && !blank; y += 32) {
          for (let x = 0; x < image.width - 32 && !blank; x += 32) {
            let backing = 0;
            for (let dy = 0; dy < 32; dy++) for (let dx = 0; dx < 32; dx++) {
              const p = ((y + dy) * image.width + x + dx) * 4;
              if (Math.abs(pixels[p] - 26) < 6 && Math.abs(pixels[p + 1] - 33) < 6 && Math.abs(pixels[p + 2] - 29) < 6) backing++;
            }
            blank = backing > 980;
          }
        }
        if (blank) missing++;
      }
      return missing;
    }, frames);
    expect(missing, "no part of the scene should expose blank page tiles during repeated scrolling").toBe(0);
  } finally { await browser.close(); }
});

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
  await openClimb(page);
  await expect(page.locator(".climb-sky")).toHaveCSS("--sky-top", "rgb(231,220,192)");
  expect(await page.locator("svg.mtn").evaluate((svg) => getComputedStyle(svg).getPropertyValue("--sky-top"))).toBe("");
});
