import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

// Render against a built portfolio to use its self-hosted Newsreader/Manrope fonts.
// These are editorial title cards, not screenshots or representations of project UI.
const previewUrl = process.env.SOCIAL_PREVIEW_URL ?? "http://127.0.0.1:4173/portfolio/";
const cards = [
  { file: "portfolio", label: "Software Engineer", title: "Diego Martinez", subtitle: "Intelligent, data-driven products.<br>From research and systems to polished user experiences." },
  { file: "momentumx", label: "Case Study · MomentumX", title: "Market signals.<br>Inspectable trades.", subtitle: "A tokenized U.S. equity trading demonstration on Solana devnet." },
  { file: "veritas", label: "Case Study · Veritas", title: "A second look<br>at political news.", subtitle: "A Chrome extension for examining source, language, and framing." },
  { file: "membership-inference-attack", label: "Case Study · Privacy Research", title: "Membership Inference<br>Attack Study", subtitle: "Testing membership leakage in classical text classification.<br>TF-IDF · Logistic regression · IMDB reviews" },
];

const style = `<style>
  body { margin: 0; background: #f3eedd; color: #1f2621; }
  .social-card { box-sizing: border-box; height: 630px; overflow: hidden; padding: 62px 72px; position: relative; width: 1200px; }
  .social-card svg { position: absolute; inset: 0; height: 100%; width: 100%; z-index: -1; }
  .social-card .label { color: #8b4428; font: 700 17px var(--font-manrope), sans-serif; letter-spacing: .12em; text-transform: uppercase; }
  .social-card h1 { color: #173f35; font: 450 76px/.98 var(--font-newsreader), serif; letter-spacing: -.035em; margin: 45px 0 24px; max-width: 100%; }
  .social-card .subtitle { font: 400 23px/1.5 var(--font-manrope), sans-serif; margin: 0; max-width: 870px; }
  .social-card .signature { bottom: 48px; color: #fffbed; display: flex; font: 600 17px var(--font-manrope), sans-serif; justify-content: space-between; left: 72px; position: absolute; right: 72px; }
</style>`;
const ridge = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" aria-hidden="true">
  <path d="M770 0 845 85 925 35 1060 170 1200 85" fill="none" stroke="#d8d4c4" stroke-width="1.5"/>
  <path d="M845 0 915 65 1000 15 1120 140 1200 95" fill="none" stroke="#d8d4c4"/>
  <path d="M0 530 180 487 290 520 440 462 580 510 740 442 890 482 1040 407 1200 468V630H0Z" fill="#d8d4c4"/>
  <path d="M0 575 150 535 300 560 460 504 610 555 785 487 920 539 1075 466 1200 514V630H0Z" fill="#173f35"/>
  <path d="M0 572 150 532 300 557 460 501 610 552 785 484 920 536 1075 463 1200 511" fill="none" stroke="#b5653b" stroke-width="3"/>
</svg>`;

await mkdir("public/social", { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1, javaScriptEnabled: false });
  await page.goto(previewUrl);
  for (const card of cards) {
    await page.evaluate((markup) => { document.body.innerHTML = markup; },
      `${style}<main class="social-card" style="isolation:isolate">${ridge}<div class="label">${card.label}</div><h1>${card.title}</h1><p class="subtitle">${card.subtitle}</p><div class="signature"><span>Diego Martinez</span><span>Portfolio / Selected work</span></div></main>`);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `public/social/${card.file}.png`, animations: "disabled" });
    console.log(`Wrote public/social/${card.file}.png (1200×630)`);
  }
} finally {
  await browser.close();
}
