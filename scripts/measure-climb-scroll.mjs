import { chromium, webkit } from "@playwright/test";

// Run against a served production export. Keep this outside CI: paint cadence
// depends on the host's graphics stack and other workloads.
const browser = await (process.env.SCROLL_BROWSER === "webkit" ? webkit : chromium).launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "hardwareConcurrency", { value: 8, configurable: true });
  });
  await page.goto(process.env.SCROLL_URL ?? "http://127.0.0.1:4173/portfolio/");
  await page.locator('#climb[data-settled="true"]').waitFor();
  await page.locator(".splash").waitFor({ state: "hidden" });
  const result = await page.evaluate(() => new Promise((resolve) => {
    const root = document.querySelector("#climb");
    const range = root.offsetHeight - innerHeight;
    let start, previous;
    const gaps = [];
    function frame(now) {
      start ??= now;
      if (previous !== undefined) gaps.push(now - previous);
      previous = now;
      const elapsed = now - start;
      window.scrollTo(0, range * (0.08 + 0.33 * (0.5 - 0.5 * Math.cos(elapsed / 4000 * Math.PI * 2))));
      if (elapsed < 4000) requestAnimationFrame(frame);
      else {
        gaps.sort((a, b) => a - b);
        resolve({ frames: gaps.length,
          meanMs: Math.round(gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length),
          p95Ms: Math.round(gaps[Math.floor(gaps.length * 0.95)]),
          over50ms: gaps.filter((gap) => gap > 50).length,
          climbVisible: !root.hidden });
      }
    }
    requestAnimationFrame(frame);
  }));
  console.log(JSON.stringify(result));
  const budget = Number(process.env.SCROLL_MEAN_BUDGET_MS);
  if (!result.climbVisible || (budget > 0 && result.meanMs > budget)) process.exitCode = 1;
} finally {
  await browser.close();
}
