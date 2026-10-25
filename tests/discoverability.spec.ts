import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const routes = [
  { path: "", image: "portfolio", heading: "Software engineer building intelligent, data-driven products.", title: "Diego Martinez — Software Engineer", description: "Software engineer building intelligent, data-driven products—from research and systems to polished user experiences." },
  { path: "work/momentumx/", image: "momentumx", heading: "MomentumX", title: "MomentumX — Tokenized U.S. Equity Trading Demo", description: "A ShellHacks 2026 team project pairing a momentum scanner and React interface with Solana devnet trading." },
  { path: "work/veritas/", image: "veritas", heading: "Veritas", title: "Veritas — Political-Leaning Analysis Extension", description: "A capstone Chrome extension for examining source, language, and framing signals in political news." },
  { path: "work/membership-inference-attack/", image: "membership-inference-attack", heading: "Membership Inference Attack Study", title: "Membership Inference Attack Study — Classical ML Privacy Research", description: "A controlled membership-inference experiment using TF-IDF and logistic regression on IMDB reviews." },
];

for (const route of routes) {
  test(`${route.image} has truthful metadata and available sharing/browser images before JavaScript`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
    const page = await context.newPage();
    const expectedSite = `${(process.env.TEST_PUBLIC_SITE_URL ?? baseURL!).replace(/\/+$/, "")}/`;
    const canonical = new URL(route.path, expectedSite).href;
    const social = new URL(`social/${route.image}.png`, expectedSite).href;
    const response = await page.goto(`./${route.path}#list-view`);
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(route.title);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", route.description);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", canonical);
    for (const [name, content] of Object.entries({ title: route.title, description: route.description, url: canonical, site_name: "Diego Martinez", type: "website", image: social, "image:width": "1200", "image:height": "630", "image:type": "image/png" }))
      await expect(page.locator(`meta[property="og:${name}"]`)).toHaveAttribute("content", content);
    for (const [name, content] of Object.entries({ card: "summary_large_image", title: route.title, description: route.description, image: social }))
      await expect(page.locator(`meta[name="twitter:${name}"]`)).toHaveAttribute("content", content);
    const alt = await page.locator('meta[property="og:image:alt"]').getAttribute("content");
    expect(alt).toContain("Diego Martinez");
    await expect(page.locator('meta[name="twitter:image:alt"]')).toHaveAttribute("content", alt!);

    // Fetch through this export even when validating an independent custom domain.
    const image = await context.request.get(new URL(social).pathname);
    expect(image.status()).toBe(200);
    expect(image.headers()["content-type"]).toContain("image/png");
    const bytes = await image.body();
    expect(bytes.subarray(1, 4).toString()).toBe("PNG");
    expect(bytes.readUInt32BE(16)).toBe(1200);
    expect(bytes.readUInt32BE(20)).toBe(630);
    expect(bytes.byteLength).toBeLessThan(300_000);

    const favicon = await page.locator('link[rel="icon"]').getAttribute("href");
    expect(new URL(favicon!, baseURL).pathname).toBe(new URL("icon.svg", baseURL).pathname);
    const icon = await context.request.get(favicon!);
    expect(icon.status()).toBe(200);
    expect(icon.headers()["content-type"]).toContain("image/svg+xml");
    expect(await icon.text()).toContain("ridge-line DM monogram");
    await context.close();
  });

  for (const javaScriptEnabled of [false, true]) {
    test(`${route.image} supports direct visits, refreshes, and base-path-safe assets with JavaScript ${javaScriptEnabled}`, async ({ browser, baseURL }) => {
      const context = await browser.newContext({ baseURL, javaScriptEnabled });
      const page = await context.newPage();
      const failures: string[] = [];
      const assets = new Set<string>();
      page.on("request", (request) => {
        if (["stylesheet", "font", "image", "script"].includes(request.resourceType())) assets.add(request.url());
      });
      page.on("response", (response) => {
        if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`);
      });
      expect((await page.goto(`./${route.path}#list-view`))?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1, name: route.heading, exact: true })).toBeVisible();
      await expect(page.getByRole("banner")).toContainText("Diego Martinez");
      expect((await page.reload())?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1, name: route.heading, exact: true })).toBeVisible();
      for (const image of await page.locator("img:visible").all()) {
        await image.scrollIntoViewIfNeeded();
        await expect.poll(() => image.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0)).toBe(true);
        expect(Number(await image.getAttribute("width"))).toBeGreaterThan(0);
        expect(Number(await image.getAttribute("height"))).toBeGreaterThan(0);
      }
      // Firefox can leave document.fonts.ready pending with JavaScript disabled.
      // Observe font requests with a bounded wait, then verify the files below.
      await expect.poll(() => [...assets].some((url) => url.endsWith(".woff2")), { timeout: 5_000 }).toBe(true);
      expect(failures).toEqual([]);
      for (const asset of assets) {
        expect(new URL(asset).origin).toBe(new URL(baseURL!).origin);
        expect(new URL(asset).pathname.startsWith(new URL(baseURL!).pathname)).toBe(true);
        expect(asset).not.toContain("/_next/image?");
        // Browsers can cancel preloads on refresh or with JavaScript disabled.
        // Fetch each referenced asset explicitly so a missing file still fails.
        const response = await context.request.get(asset, { timeout: 5_000 });
        expect(response.status(), asset).toBe(200);
        if (asset.endsWith(".woff2")) {
          expect(response.headers()["content-type"], asset).toContain("font/woff2");
          expect((await response.body()).subarray(0, 4).toString(), asset).toBe("wOF2");
        }
      }
      await context.close();
    });
  }
}

for (const javaScriptEnabled of [false, true]) {
  test(`unknown Case Studies have an exported, usable 404 with JavaScript ${javaScriptEnabled}`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, javaScriptEnabled });
    const page = await context.newPage();
    await page.setViewportSize({ width: 390, height: 844 });
    expect((await page.goto("./work/unpublished-project/"))?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1, name: "Page not found." })).toBeVisible();
    await expect(page).toHaveTitle("Page not found — Diego Martinez");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
    if (javaScriptEnabled)
      expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]);
    expect((await page.reload())?.status()).toBe(404);
    const returnLink = page.getByRole("link", { name: "Return to the portfolio" });
    await returnLink.focus();
    await expect(returnLink).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(`${baseURL}#list-view`);
    await expect(page.getByRole("heading", { level: 1, name: routes[0].heading })).toBeVisible();
    await context.close();
  });
}
