# Splash and view transitions — map paint glitch handoff

## Prompt for Claude

Review the current portfolio opening splash and **both** view transitions: List View → illustrated Climb/Ascent, and Climb → List View. The user reports map glitching with green blocks and describes the map paint as “churning.” Package this as an investigation and design/repair planning task. The cause has not been independently established.

Use the supplied working-tree code and actual map print assets as evidence. First map the three animation timelines, DOM ownership, generated asset pipeline, face occlusion rules, and cleanup/switch callbacks. Ground findings in exact files/functions/selectors. Identify which observations are source-backed, which are user-reported, and which need a visible-browser reproduction. Read `issue-evidence.md` alongside this brief when using the ZIP.

Produce a prioritized critique, ranked testable hypotheses, and a concrete investigation plan that compares uninterrupted playback with paused-frame tests. Explain how to distinguish lost paint/tiles, face-occlusion mistakes, image/decode problems, and clock/lifecycle races. Compare viable repair approaches and tradeoffs, recommend the smallest direction supported by evidence, and provide a staged implementation plan with affected files, meaningful regression checks and precise acceptance criteria. Ask for missing environment evidence and open questions. Do not claim a root cause or successful fix from code inspection, an old report, or a headless/settled-frame pass alone.

Preserve these current contracts unless explicitly proposing a design decision:

- The Editorial Alpine map handling, printed artwork, greeting alignment and handoff to the real semantic heading. Preserve legibility, opaque paper, correct cover/legend orientation, and sealed pane edges through movement.
- One clock relationship per sequence, clear ownership of the opening and temporary overlays, once-only view switches, and cancellation of animations/listeners/RAF/timers. No residual overlay or hidden heading/header after finish, skip, resize, navigation, preference changes, unmount, or rapid repeated toggles.
- Native reading/fragment destinations, complete server-rendered List View without JavaScript, session-based opening eligibility, safe blocked-storage behavior, input dismissal and failsafe exits.
- Responsive wide/tall map variants, portrait and landscape, both themes, reduced motion and fonts settling during startup. Keep theme tokens scoped to registered UI roots; do not spread per-frame palette changes onto the detailed SVG world.
- Static Next.js export and GitHub Pages base-path asset URLs. Generated motion/markup/PNG files have generator sources: propose generator changes and regeneration together. Read installed Next.js documentation before eventual code edits as instructed by `AGENTS.md`.

Acceptance criteria should cover: no unexpected green rectangles, paper holes, stale/mirrored faces or one-frame flashes during **uninterrupted** opening and both transitions; matched before/after captures on the reported browser/device; correct alignment and exactly one readable heading; reachable controls and native scroll after every dismissal path; repeated direction switches and fragment interruption; light/dark at desktop, narrow portrait, and short landscape viewports; reduced-motion/no-JavaScript behavior; no browser errors or leaked animations; and base-path-safe assets. Use browser/device measurements to justify any numeric paint/frame budget rather than inventing one. Separate normal GPU conditions from artificial stress and state untested environments.

**Stop at evidence review, investigation/design direction and staged planning. Do not implement until the user requests it.**

## Snapshot

- Project: `diego-martinez-portfolio` at `/Users/diegomartinez/Desktop/portfolio`.
- Capture: 2026-11-18 02:34:56 EST (-0500).
- Branch: `feat/about-continuous-trail`; HEAD `723612c` (`723612c3c81e208ca2d26df78782223a5c8e556a`), “Fix reduced-motion overrides and native-scroll regression setup”.
- Working tree: the only tracked local edit at capture is generated `next-env.d.ts`, whose imports point at `.next/dev/types/` instead of `.next/types/`. It is outside this package. No staged source changes or deletions are present. Selected source is read from the current working tree, not previous handoffs. Pre-existing untracked skills, handoff files/archives and evidence are excluded. New outputs from this task are the Markdown and ZIP only.
- Locally installed versions: next 16.3.7, react 19.3.0, react-dom 19.3.0, @playwright/test 1.63.0. Node requirement: >=22. See the included package and config.
- Scope: homepage eligible opening, real ViewToggle integration, List → Climb and Climb → List. User priority: green blocks and map glitch; no visual redesign preference was supplied.

### Current behavior confirmed in source

`app/layout.tsx` restores theme and splash eligibility before body paint, mounts `Splash`, and imports splash/motion/hero styles. The opening gate skips reduced motion, fragments, non-home paths and repeat visits. Eligible first visits set `data-splash=active`; session storage failures are tolerated. `Splash` delegates to `startSplash`. CSS supplies the physical fold/exit fallback while Web Animations aligns the camera and greeting to the real List View heading.

Current timing constants: physical fold clock 6400 ms, opening `OPEN.end=7550` ms, List → Climb `CLIMB.end=2600` ms (switch cue at 380 ms), Climb → List `LIST.end=5730` ms (switch after 1100 ms tilt, overhead hold 500 ms, reused opening clock offset 1820 ms). These describe authored constants, not measured runtime duration under a stalled renderer. List View is selected initially even after enhancement becomes available; the user enters Climb with ViewToggle.

Climb → List holds the physical folds at the open pose and reuses screen-space opening tracks plus `startSplash` for the landing. List → Climb covers the page with paper, switches modes beneath it, pulls back to the map, then tilts/translates toward the scene. Each transition constructs fresh namespaced overlay markup. Both rely on the same CSS/print assets as the opening. Reduced-motion branches suppress the full map choreography; the List-return factory switches directly, while the Climb transition has an opacity-only path.

Printed shapes are transparent lossless PNGs; lettering stays live SVG. Each face carries an SVG image plus a namespaced `use` to live definitions, with viewBoxes slicing the sheet. Authored normal-based complementary opacity tracks choose visible paper faces; top-pane z-index changes at a fold crossing. The CSS uses flattened transforms, overflow clipping, strict overlay containment, a dark green table backdrop, blurred shadows, and masked paper handoff. Inspection of these mechanisms is evidence of how the implementation works, not proof that any one mechanism causes the user's symptom.

### Evidence and uncertainty

The green blocks are user-reported. Paint churn is the suspected explanation, not a fresh measured finding. No browser session, current screenshot/video, trace, test run, or confirmed reproduction was captured while assembling this package. Exact browser/device, failing sequence, theme, DPR, viewport and recurrence pattern remain open. Existing tests are included as intended regression behavior; passing results are not implied. Prior map/mountain handoffs and old performance claims are excluded as current evidence. The ZIP contains map PNG assets, not screenshots of the reported glitch.

## Source index

Core code is embedded below; the ZIP also contains full originals under `source/`, including full versions of excerpted files.

| Relative path | Role | Markdown coverage |
| --- | --- | --- |
| `components/splash/Splash.tsx` | Opening overlay mount, React ownership, failure handling | Full file |
| `components/splash/gate.ts` | Prepaint eligibility, repeat-visit storage, hash and motion bypass | Full file |
| `components/splash/controller.ts` | Complete shared lifecycle, opening, Climb → List, List → Climb controllers | Full file |
| `components/splash/splash.css` | Complete map, paper, face, shadow, mask, sizing and reduced-motion styles | Full file |
| `components/splash/map/markup.ts` | Shared overlay DOM, SVG reference namespaces, asset base paths | Full file |
| `scripts/generate-splash-motion.mjs` | Authored motion, face opacity tracks, stacking, shadow keyframe generation | Full file |
| `scripts/generate-splash-art.mjs` | Raster/live-letter split, pane SVG viewBoxes and generated runtime markup | Full file |
| `scripts/rasterize-splash-print.mjs` | Chromium PNG generation and transparency | Full file |
| `scripts/splash/geometry.mjs` | Canonical printed map route and annotation layout | Full file |
| `scripts/splash/print.mjs` | Deterministic print, contours, cover and legend source | Full file |
| `app/layout.tsx` | Font loading, prepaint scripts, opening and stylesheet registration | Full file |
| `app/page.tsx` | Homepage composition and Climb entry point | Full file |
| `components/climb/ViewToggle.tsx` | Real user view controls and state context | Full file |
| `components/climb/Climb.tsx` | Opening imports, mode defaults, cancellation, hash recovery, view-switch callbacks and scene roots | Excerpts 1–44, 55–65, 85–114, 189–259, 289–308, 332–365, 434–476 |
| `components/hero/reveal.ts` | Decorative greeting reveal and real heading handoff | Full file |
| `components/hero/brand.ts` | Per-letter branding animation used by the reveal | Full file |
| `components/hero/hero.css` | Greeting styling and animation roots | Full file |
| `components/theme/ThemeProvider.tsx` | Theme propagation and UI-root boundaries | Full file |
| `components/theme/prepaint.ts` | Persisted theme restoration | Full file |
| `app/theme.css` | Current light/dark surface tokens | Full file |
| `content/trailhead.ts` | Canonical heading used by all map overlays | Full file |
| `tests/helpers/splash.ts` | Pause/seek and image-difference helpers; diagnostic limitations | Full file |
| `package.json` | Versions, scripts and runtime requirements | Full file |
| `next.config.ts` | Static export and deployment base path | Full file |
| `docs/adr/0003-static-nextjs-on-github-pages.md` | Static hosting contract, with superseded renderer paragraph | Full file |
| `docs/adr/0004-illustrated-climb-replaces-threejs.md` | Current SVG Ascent and durable List View contracts | Full file |
| `docs/adr/0005-scope-theme-palettes-to-ui-roots.md` | Theme repaint boundary and recorded performance rationale | Full file |
| `AGENTS.md` | Repository and installed Next.js documentation instructions | Full file |

### Additional full files supplied in the ZIP

These files are not embedded in this Markdown; their paths, purposes, and complete bytes are supplied in the ZIP. Generated outputs are included verbatim, not truncated.

| Relative path | Role |
| --- | --- |
| `GLOSSARY.md` | Mountain Journey, Ascent, List View and Trailhead vocabulary |
| `app/ascent.css` | Fixed header, List View section sizing and responsive overrides |
| `app/globals.css` | Global body, font, heading, focus and responsive context |
| `components/about/JourneyTrail.tsx` | Hero-ready event consumer on List View |
| `components/about/about.css` | Shared List View overlay and route styling |
| `components/about/braid.ts` | Adjacent route artwork and repaint context |
| `components/about/trail-geometry.ts` | Route geometry recomputation and page measurement |
| `components/about/trail.ts` | List View route draw, observers and transition-busy checks |
| `components/about/wheel.ts` | List View wheel behavior and transition guards |
| `components/climb/SceneRecovery.tsx` | React recovery boundary |
| `components/climb/climb.css` | Sticky scene, hidden view, navigation and scene-translation styles |
| `components/climb/environment.ts` | Scene palette/weather updates around switching |
| `components/climb/hud.ts` | Underlying card visibility and opacity writes |
| `components/climb/mountain.css` | Underlying SVG paint-root and camera styles |
| `components/climb/mountain/layers.ts` | Underlying SVG paint-root construction |
| `components/climb/mountain/render.ts` | Underlying scene transform renderer |
| `components/climb/progress.ts` | Underlying scene stop progress |
| `components/climb/quality.ts` | Capability and quality lifecycle |
| `components/climb/recovery.ts` | Scene task failure and cleanup wrappers |
| `components/climb/useClimbProgress.ts` | Underlying scene frame scheduling and theme blend interaction |
| `components/list-navigation.tsx` | List View scroll/navigation lifecycle |
| `components/list-view.tsx` | Real Trailhead heading and sections used for geometry and landing |
| `components/portfolio-shell.tsx` | Shared header and controls animated during transitions |
| `components/splash/map/print.generated.ts` | Generated runtime live text and SVG face markup; full file in ZIP |
| `components/splash/motion.generated.css` | Generated runtime keyframes; full file in ZIP, long generated lines omitted from Markdown |
| `components/theme/color.ts` | Theme color calculations |
| `components/theme/controller.ts` | Theme clock, reduced-motion timing, cancellation |
| `components/theme/theme.css` | Focus and shared control styles |
| `components/theme/tokens.json` | Palette source data |
| `components/theme/ui-tokens.ts` | Animated UI palette scoping |
| `components/trailhead-art.tsx` | HERO_READY_EVENT and real hero interaction lifecycle |
| `content/journey.ts` | View navigation data |
| `content/site.ts` | Layout metadata dependency |
| `content/waypoints.ts` | Map generator labels and stop count |
| `docs/agents/domain.md` | Repository domain-doc convention |
| `playwright.config.ts` | Actual static-export browser test configuration |
| `scripts/serve-static-export.mjs` | Static test server and deployment path |
| `tests/climb-transition.spec.ts` | Existing test or helper; review assertions and intended behavior, no new test result implied |
| `tests/feather-splash.spec.ts` | Existing test or helper; review assertions and intended behavior, no new test result implied |
| `tests/helpers/climb.ts` | Existing test or helper; review assertions and intended behavior, no new test result implied |
| `tests/helpers/native-scroll.ts` | Existing test or helper; review assertions and intended behavior, no new test result implied |
| `tests/list-transition.spec.ts` | Existing test or helper; review assertions and intended behavior, no new test result implied |
| `tests/map-polish.spec.ts` | Existing test or helper; review assertions and intended behavior, no new test result implied |
| `tests/splash.spec.ts` | Existing test or helper; review assertions and intended behavior, no new test result implied |
| `tests/theme.spec.ts` | Existing test or helper; review assertions and intended behavior, no new test result implied |
| `tests/trailhead-hero.spec.ts` | Existing test or helper; review assertions and intended behavior, no new test result implied |

### Actual map assets supplied in the ZIP

These PNGs are artwork/texture assets, not failure screenshots. No separate source artwork attachment is needed when the ZIP is attached.

| Asset path | Pixel dimensions |
| --- | --- |
| `public/splash/grain.png` | 192 × 192 |
| `public/splash/print/cover-tall.png` | 650 × 813 |
| `public/splash/print/cover-wide.png` | 900 × 630 |
| `public/splash/print/lg-lb-tall.png` | 300 × 750 |
| `public/splash/print/lg-lb-wide.png` | 450 × 630 |
| `public/splash/print/lg-lt-tall.png` | 300 × 750 |
| `public/splash/print/lg-lt-wide.png` | 450 × 630 |
| `public/splash/print/lg-rb-tall.png` | 300 × 750 |
| `public/splash/print/lg-rb-wide.png` | 450 × 630 |
| `public/splash/print/lg-rt-tall.png` | 300 × 750 |
| `public/splash/print/lg-rt-wide.png` | 450 × 630 |
| `public/splash/print/print-tall.png` | 1100 × 1375 |
| `public/splash/print/print-wide.png` | 1800 × 1260 |

### Scope omissions and redactions

The ZIP is a focused investigation/source bundle, not a complete runnable repository. It excludes full Case Study MDX/content assets, unrelated portfolio components, the full mountain geometry/scenery/landmarks, resume and personal photos, old handoff archives/evidence, lockfile, dependencies, caches, build output, environment files, Git internals and generated `next-env.d.ts`. Underlying paint renderer files are included for boundary analysis; reproducing the full scene requires the full repo. The generator is complete for current splash artwork and motion, but scripts intentionally write generated files and launch a browser: do not regenerate as part of a read-only review.

Source is verbatim except for clearly labeled supporting excerpts. No redactions were necessary. Selected text was screened for credential/private-key patterns. Public portfolio copy and typed work labels are retained because the map artwork generator uses canonical Waypoint names. No prior review notes, private records or credentials are embedded.

## Source

Inclusive line numbers below refer to the captured current files. Fences contain unmodified source; omissions occur only outside labeled excerpts.

### `components/splash/Splash.tsx`

Opening overlay mount, React ownership, failure handling.

Full file (27 lines).

````tsx
"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { listTrailheadIntro } from "../../content/trailhead";
import { startSplash } from "./controller";
import type { SplashElement } from "./controller";
import { mapAssetStyles, mapOverlayMarkup } from "./map/markup";

const markup = mapOverlayMarkup(listTrailheadIntro.heading, "splash-opening");

export function Splash() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    try {
      const controller = startSplash(ref.current);
      return () => controller?.dispose();
    } catch {
      (ref.current as SplashElement).splashController?.skip();
      ref.current.classList.add("splash--skipped");
      document.documentElement.dataset.splash = "seen";
    }
  }, []);
  return <div className="splash" aria-hidden="true" ref={ref}
    style={mapAssetStyles as CSSProperties} dangerouslySetInnerHTML={{ __html: markup }} />;
}
````

### `components/splash/gate.ts`

Prepaint eligibility, repeat-visit storage, hash and motion bypass.

Full file (18 lines).

````ts
// A plain module, not a client export: the server layout must emit the actual
// script text in <head>, before the splash can paint or React can hydrate.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const homePaths = JSON.stringify([basePath || "/", `${basePath}/`]);

export const SPLASH_GATE_SCRIPT = `(()=>{
  try{document.documentElement.dataset.motion=matchMedia("(prefers-reduced-motion: reduce)").matches?"reduce":"full"}catch{}
  if(document.documentElement.dataset.motion==="reduce"||location.hash||!${homePaths}.includes(location.pathname)){
    document.documentElement.dataset.splash="seen";return;
  }
  try{
    if(sessionStorage.getItem("splash-seen")){
      document.documentElement.dataset.splash="seen";return;
    }
    sessionStorage.setItem("splash-seen","1");
  }catch{}
  document.documentElement.dataset.splash="active";
})()`;
````

### `components/splash/controller.ts`

Complete shared lifecycle, opening, Climb → List, List → Climb controllers.

Full file (561 lines).

````ts
import { mapAssetStyles, mapOverlayMarkup } from "./map/markup";
import { listTrailheadIntro } from "../../content/trailhead";
import { revealGreeting } from "../hero/reveal";
import { HERO_READY_EVENT } from "../trailhead-art";

type Options = { rate?: number; failsafe?: boolean; remember?: boolean; allowSeen?: boolean; seekCss?: boolean; preserveFragment?: boolean; onDone?: (skipped: boolean) => void };
const part = (root: ParentNode, selector: string) => {
  const element = root.querySelector<HTMLElement>(selector);
  if (!element) throw new Error(`Missing map overlay part: ${selector}`);
  return element;
};
const animationTime = (animation?: Animation | null) => typeof animation?.currentTime === "number" ? animation.currentTime : 0;
/* Map opening + Climb View transition — the JavaScript half.
 *
 * CSS alone plays the map handling and removes the opening overlay. This
 * controller adds what needs measurement or input:
 *   opening   frames the camera push on the real heading, lays the decorative
 *             greeting exactly over the List View <h1>, hands the paper off to
 *             the dark (or light) page, swaps the decorative heading for the
 *             real <h1> in a single frame, and forms the page around it;
 *   climb     on "Climb view": the page becomes paper, the camera pulls back
 *             to the floating map, the view tilts up off the map
 *             to the mountain, and the Waypoints arrive.
 * Both dismiss on pointer, key, wheel, touch or resize. Every animation they
 * create is cancelled on finish or dismissal, which restores the page.
 *
 * Stability rules (from the flicker review):
 *   - one visible copy of the heading at a time; swaps happen on one shared clock;
 *   - no filters on text; both copies preserve the semantic line breaks;
 *   - only opacity/translate on page layers; the mountain is never scaled;
 *   - geometry is measured again once webfonts settle, while nothing depends on it yet.
 */


export const OPEN = { zoom: [3420, 1000], greeting: 4420, handoff: [6570, 480], fade: [6570, 340], swap: 7110, end: 7550 };
export const CLIMB = { cover: 380, pull: [380, 870], tilt: [1150, 1000], end: 2600 };
export const LIST = { tilt: 1100, hold: 500, zoom: 1600, end: 5730 };
const LIST_OPEN_OFFSET = OPEN.zoom[0] - LIST.zoom;
const EVENTS = ["pointerdown", "keydown", "wheel", "touchstart"];

function bezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  return (x: number) => {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const e = ((ax * t + bx) * t + cx) * t - x, d = (3 * ax * t + 2 * bx) * t + cx;
      if (Math.abs(e) < 1e-6 || Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    t = Math.min(1, Math.max(0, t));
    return ((ay * t + by) * t + cy) * t;
  };
}
const pushEase = bezier(0.6, 0, 0.16, 1), pullEase = bezier(0.45, 0, 0.2, 1);

// ---------------------------------------------------------------- shared
function copyType(target: HTMLElement, heading: HTMLElement) {
  const cs = getComputedStyle(heading), r = heading.getBoundingClientRect();
  Object.assign(target.style, {
    left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`,
    fontFamily: cs.fontFamily, fontSize: cs.fontSize, fontWeight: cs.fontWeight, fontStyle: cs.fontStyle,
    letterSpacing: cs.letterSpacing,
    lineHeight: String(Math.round(parseFloat(cs.lineHeight) / parseFloat(cs.fontSize) * 1e6) / 1e6),
    fontVariationSettings: cs.fontVariationSettings,
    fontFeatureSettings: cs.fontFeatureSettings, fontKerning: cs.fontKerning,
    textWrap: cs.textWrap, wordSpacing: cs.wordSpacing, textAlign: cs.textAlign,
  });
  target.dataset.aligned = "";
  // Clone the real line structure so intentional breaks survive every handoff.
  target.replaceChildren(...[...heading.childNodes].map(node => node.cloneNode(true)));
  if (target.classList.contains("splash-greeting--page")) {
    target.style.textShadow = cs.textShadow;
    target.style.setProperty("--brand-deboss", cs.getPropertyValue("--brand-deboss"));
    return { rect: r, style: cs };
  }
  const readText = (element: HTMLElement) => {
    const walker = doc.createTreeWalker(element, NodeFilter.SHOW_TEXT), nodes: Text[] = [];
    while (walker.nextNode()) nodes.push(walker.currentNode as Text);
    return nodes;
  };
  const doc = heading.ownerDocument;
  const realWords = readText(heading).flatMap(node => [...(node.textContent ?? "").matchAll(/\S+/g)].map(match => ({ node, match })));
  for (const text of readText(target)) {
    const fragment = doc.createDocumentFragment();
    for (const token of (text.textContent ?? "").match(/\s+|\S+/g) ?? []) {
      if (/^\s+$/.test(token)) fragment.append(doc.createTextNode(token));
      else {
        const word = doc.createElement("span"); word.className = "splash-word";
        word.textContent = token; word.style.animation = "none";
        word.style.maskImage = word.style.webkitMaskImage = "none";
        word.style.position = "relative"; fragment.append(word);
      }
    }
    text.replaceWith(fragment);
  }
  const words = [...target.querySelectorAll<HTMLElement>(".splash-word")];
  const offsets = words.map((word, i) => {
    const source = realWords[i];
    if (!source) return { x: 0, y: 0 };
    const real = doc.createRange(), copy = doc.createRange();
    real.setStart(source.node, source.match.index); real.setEnd(source.node, source.match.index + source.match[0].length);
    copy.selectNodeContents(word);
    const a = real.getBoundingClientRect(), b = copy.getBoundingClientRect();
    return { x: a.left - b.left, y: a.top - b.top };
  });
  words.forEach((word, i) => { word.style.left = `${offsets[i].x}px`; word.style.top = `${offsets[i].y}px`; });
  return { rect: r, style: cs };
}

// Scale S and fixed point F that push the camera from the whole sheet into the
// blank centre pane so that the pane covers the viewport and the pane point P
// under the greeting lands on the heading centre H. A pure scale about F: no drift.
function framing(el: HTMLElement, H: { x: number; y: number }) {
  const win = window;
  const rig = part(el, ".splash-rig"), probe = part(el, ".splash-probe");
  const vw = win.innerWidth, vh = win.innerHeight, w = probe.offsetWidth, ph = probe.offsetHeight;
  const cx = rig.offsetLeft, cy = rig.offsetTop;
  const c = { left: cx - w / 2, right: cx + w / 2, top: cy - ph, bottom: cy + ph };
  // Keep the pane's edges (and the hinge creases just inside them) a clear margin off screen.
  const m = w * 0.09;
  let S = Math.max(vw / (w - 2 * m), vh / (2 * ph - 2 * m)) * 1.05;
  for (let i = 0; i < 10; i++) {
    const lo = { x: c.left + m + H.x / S, y: c.top + m + H.y / S }, hi = { x: c.right - m - (vw - H.x) / S, y: c.bottom - m - (vh - H.y) / S };
    if (lo.x <= hi.x && lo.y <= hi.y) {
      const P = { x: Math.min(hi.x, Math.max(lo.x, cx)), y: Math.min(hi.y, Math.max(lo.y, cy)) };
      return { S, P, H, F: { x: (S * P.x - H.x) / (S - 1), y: (S * P.y - H.y) / (S - 1) }, map: { left: cx - w, top: cy - ph } };
    }
    S *= 1.12;
  }
  return null;
}
const scaleFrames = (from: number, to: number, ease: (x: number) => number) => Array.from({ length: 25 }, (_, i) => ({ offset: i / 24, transform: `scale(${(from * Math.pow(to / from, ease(i / 24))).toFixed(4)})` }));

export type SplashController = {
  skip: () => void;
  dispose: () => void;
  holdFailsafe: () => void;
  animations: Animation[];
  seek: (time: number) => void;
};
export type SplashElement = HTMLElement & { splashController?: SplashController };

function reducedMotion() {
  try {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.documentElement.dataset.motion = reduced ? "reduce" : "full";
    return reduced;
  }
  catch { return document.documentElement.dataset.motion === "reduce"; }
}

function lifecycle(el: HTMLElement, options: Options, onEnd: (skipped: boolean) => void) {
  const created: Animation[] = [], cleanups: (() => void)[] = [];
  let active = true, failsafe = 0, inputTask = 0;
  let motion: MediaQueryList | undefined;
  try { motion = matchMedia("(prefers-reduced-motion: reduce)"); } catch { /* CSS has the same preference rules. */ }
  const api = {
    created,
    t0: null as number | null,
    get active() { return active; },
    add(target: Element | null, keyframes: Keyframe[], timing: KeyframeAnimationOptions) {
      if (!target || !active) return null;
      const animation = target.animate(keyframes, { fill: "backwards", ...timing });
      if (api.t0 !== null) animation.startTime = api.t0;
      created.push(animation);
      return animation;
    },
    cleanup(fn: () => void) { cleanups.push(fn); },
    finish(skipped: boolean, restore = true) {
      if (!active) return;
      active = false;
      clearTimeout(failsafe); clearTimeout(inputTask);
      EVENTS.forEach((type) => window.removeEventListener(type, skip, true));
      window.removeEventListener("resize", skip);
      window.removeEventListener("hashchange", navigate);
      window.removeEventListener("pagehide", skip);
      try { motion?.removeEventListener("change", onMotion); } catch { /* Optional preference observation. */ }
      cleanups.forEach((fn) => fn());
      try { if (restore) onEnd(skipped); } finally { created.forEach((animation) => animation.cancel()); }
      delete (el as SplashElement).splashController;
      options.onDone?.(skipped);
    },
    skip: () => api.finish(true),
    holdFailsafe() { clearTimeout(failsafe); },
    arm(ms: number) {
      if (options.failsafe !== false) failsafe = window.setTimeout(skip, ms);
      // Starting click/Enter must finish dispatching before interruption begins.
      inputTask = window.setTimeout(() => {
        if (active) EVENTS.forEach((type) => window.addEventListener(type, skip, { capture: true, passive: true }));
      }, 0);
      window.addEventListener("resize", skip, { passive: true });
      window.addEventListener("hashchange", navigate);
      window.addEventListener("pagehide", skip);
      try { motion?.addEventListener("change", onMotion); } catch { /* CSS still responds to the preference. */ }
    },
    // The Climb transition holds its CSS map pose; only the opening seeks CSS.
    review(advance?: () => void, seekCss = true): SplashController {
      const controller = {
        skip: api.skip, dispose: () => api.finish(false, false), holdFailsafe: api.holdFailsafe, animations: created,
        seek(time: number) {
          api.holdFailsafe();
          // Keep transitions from hover/theme controls on their own clock.
          for (const animation of el.getAnimations({ subtree: true })) {
            if (seekCss && animation instanceof CSSAnimation) { animation.pause(); animation.currentTime = time; }
          }
          for (const animation of created) { animation.pause(); animation.currentTime = time; }
          advance?.();
          // Switching the view can add marker arrivals on this same cue.
          if (active) for (const animation of created) { animation.pause(); animation.currentTime = time; }
        },
      };
      (el as SplashElement).splashController = controller;
      return controller;
    },
  };
  const skip = () => {
    api.finish(true);
  };
  // Browser navigation owns its reading destination. Cancelling a view
  // transition must not run the ordinary dismissal's view-switch callback.
  const navigate = () => api.finish(true, !options.preserveFragment);
  const onMotion = (event: MediaQueryListEvent) => {
    document.documentElement.dataset.motion = event.matches ? "reduce" : "full";
    skip();
  };
  return api;
}

// ---------------------------------------------------------------- opening
export function startSplash(el: HTMLElement, options: Options = {}) {
  const doc = el.ownerDocument, win = window, root = doc.documentElement;
  if (root.dataset.splash !== "active" && !options.allowSeen) return null;
  if (typeof el.animate !== "function" || typeof el.getAnimations !== "function" || typeof requestAnimationFrame !== "function" || typeof CSSAnimation === "undefined") return null;
  if (reducedMotion()) {
    root.dataset.splash = "seen";
    el.classList.add("splash--skipped");
    return null;
  }
  const clock = el.getAnimations().find((a) => a instanceof CSSAnimation && a.animationName === "splash-exit");
  const elapsed = () => animationTime(clock);
  const cancelCss = (target: HTMLElement | null, name: string) => target && target.getAnimations().forEach((a) => { if (a instanceof CSSAnimation && a.animationName === name) a.cancel(); });

  const paper = part(el, ".splash-greeting--paper"), page = part(el, ".splash-greeting--page");
  const sheet = part(el, ".splash-paper-stage"), camera = part(el, ".splash-camera");
  const life = lifecycle(el, options, (skipped) => {
    root.dataset.splash = "seen";
    if (skipped) el.classList.add("splash--skipped");
    if (options.remember !== false) { try { win.sessionStorage.setItem("splash-seen", "1"); } catch {} }
    if (!skipped && !el.classList.contains("splash--list")) doc.dispatchEvent(new Event(HERO_READY_EVENT));
  });
  life.review(undefined, options.seekCss !== false);
  function setup() {
    const heading = doc.getElementById("trailhead-title");
    const section = heading?.closest<HTMLElement>(".trailhead");
    const usable = heading && section && heading.getClientRects().length && elapsed() < 4250;

    const { add } = life;
    let zoomAnim: Animation | null = null;

    function layout() {
      const { rect } = copyType(paper, heading!);
      copyType(page, heading!);
      if (elapsed() > OPEN.zoom[0] - 50) return;
      const f = framing(el, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
      if (!f) return;
      cancelCss(camera, "splash-zoom-fallback");
      camera.style.transformOrigin = `${f.F.x}px ${f.F.y}px`;
      if (zoomAnim) { zoomAnim.cancel(); life.created.splice(life.created.indexOf(zoomAnim), 1); }
      zoomAnim = add(camera, scaleFrames(1, f.S, pushEase), { delay: OPEN.zoom[0], duration: OPEN.zoom[1], fill: "both" });
      el.dataset.zoom = JSON.stringify({ S: +f.S.toFixed(3), P: f.P, H: f.H, F: f.F });
    }

    if (usable) {
      layout();
      cancelCss(sheet, "splash-sheet-fallback");
      // Webfonts may settle after first paint; nothing depends on the geometry until the push begins.
      if (doc.fonts?.status !== "loaded") doc.fonts?.ready.then(() => {
        if (life.active && elapsed() < OPEN.zoom[0] - 50) {
          layout();
          if (clock?.playState === "paused" && zoomAnim) { zoomAnim.pause(); zoomAnim.currentTime = elapsed(); }
        } else if (life.active && elapsed() < 4250) { layout(); }
      });

      // One heading at a time: the real <h1> is hidden until the frame the page copy disappears.
      add(heading, [{ opacity: 0 }, { opacity: 0 }], { duration: OPEN.swap, fill: "none" });
      revealGreeting(paper, page, add, OPEN.greeting);
      add(page, [{ visibility: "visible" }, { visibility: "visible" }], { delay: 6150, duration: OPEN.swap - 6150, fill: "none" });

      const theme = root.dataset.theme === "light" ? "light" : "dark";
      if (theme === "light") {
        add(sheet, [{ opacity: 1 }, { opacity: 0 }], { delay: OPEN.fade[0], duration: OPEN.fade[1], easing: "ease-in-out", fill: "forwards" });
      } else {
        // Dusk passes over the paper, left to right; only a narrow band is ever between states.
        const vw = win.innerWidth, M = vw * 3.2, image = "linear-gradient(100deg, transparent 0 46%, #000 54% 100%)";
        const at = (x: number) => ({ maskImage: image, webkitMaskImage: image, maskSize: `${M}px 100%`, webkitMaskSize: `${M}px 100%`,
          maskRepeat: "no-repeat", webkitMaskRepeat: "no-repeat", maskPosition: `${x}px 0`, webkitMaskPosition: `${x}px 0` });
        add(sheet, [at(-0.2 * vw - M / 2), at(1.2 * vw - M / 2)], { delay: OPEN.handoff[0], duration: OPEN.handoff[1], easing: "cubic-bezier(0.45, 0, 0.4, 1)", fill: "forwards" });
      }
      const rise = (target: Element | null, delay: number, duration: number, distance = 6) => add(target, [{ opacity: 0, translate: `0 ${distance}px` }, { opacity: 1, translate: "0 0" }],
        { delay, duration, easing: "cubic-bezier(0.2, 0.7, 0.3, 1)" });
      add(doc.querySelector<HTMLElement>(".site-header"), [{ opacity: 0, translate: "0 -8px" }, { opacity: 1, translate: "0 0" }], { delay: 6650, duration: 500, easing: "cubic-bezier(0.2, 0.7, 0.3, 1)" });
      rise(section.querySelector<HTMLElement>(".eyebrow"), 6850, 420);
      rise(section.querySelector<HTMLElement>(".scroll-cue"), OPEN.swap, 420);
    }

  }
  // Align script animations with the overlay's own CSS clock.
  const sync = () => { if (!life.active || !clock || clock.startTime == null) return; life.t0 = Number(clock.startTime); life.created.forEach((a) => { a.startTime = life.t0; }); };
  if (clock) { if (clock.startTime != null) sync(); else clock.ready.then(sync).catch(() => {}); }
  const onEnd = (event: AnimationEvent) => { if (event.target === el) life.finish(false); };
  el.addEventListener("animationend", onEnd);
  life.cleanup(() => el.removeEventListener("animationend", onEnd));
  let layoutFrame = 0;
  const deadline = performance.now() + 1400;
  const waitForLayout = () => {
    if (!life.active) return;
    const heading = doc.getElementById("trailhead-title");
    if (doc.fonts?.status === "loading") {
      void doc.fonts.ready.then(() => { if (life.active) waitForLayout(); });
      return;
    }
    if (heading?.getClientRects().length) { setup(); sync(); }
    else if (performance.now() < deadline) layoutFrame = requestAnimationFrame(waitForLayout);
  };
  life.cleanup(() => cancelAnimationFrame(layoutFrame));
  waitForLayout();
  life.arm(Math.max(0, 8150 - elapsed()));
  return life.review(undefined, options.seekCss !== false);
}

// Climb → List: play only the opening's paper, camera and hero tracks. Its
// physical folds stay fixed at the fully open pose. The opening clock starts
// 1820ms in, placing its existing zoom immediately after the overhead hold.
function toListTransition(el: HTMLElement, switchView: () => void, options: Options = {}) {
  const doc = el.ownerDocument;
  let switched = false, landing: SplashController | null = null, frame = 0;
  const doSwitch = () => { if (!switched) { switched = true; switchView(); } };
  const life = lifecycle(el, { ...options, preserveFragment: true }, (skipped) => {
    doSwitch();
    if (!skipped) doc.dispatchEvent(new Event(HERO_READY_EVENT));
  });
  life.t0 = Number(doc.timeline.currentTime);
  const screenTracks: Animation[] = [];
  let clock: Animation | undefined;
  for (const animation of el.getAnimations({ subtree: true })) {
    if (!(animation instanceof CSSAnimation)) continue;
    if (/^splash-(exit|sheet|zoom-fallback|world-off|ink|print-fade)/.test(animation.animationName)) {
      animation.startTime = life.t0 - LIST_OPEN_OFFSET;
      screenTracks.push(animation);
      if (animation.animationName === "splash-exit") clock = animation;
    } else {
      animation.pause();
      animation.currentTime = 3550;
    }
  }
  if (!clock) throw new Error("Missing List transition clock");
  const { add } = life;
  const easing = "cubic-bezier(0.45, 0, 0.3, 1)";
  add(part(el, ".splash-rig"), [{ translate: "0 112vh" }, { translate: "0 0" }], { duration: LIST.tilt, easing, fill: "both" });
  add(part(el, ".splash-map"), [{ transform: "rotateX(58deg)" }, { transform: "rotateX(0deg)" }], { duration: LIST.tilt, easing, fill: "both" });
  add(part(el, ".splash-table"), [{ translate: "0 145vh" }, { translate: "0 0" }], { duration: LIST.tilt, easing, fill: "both" });
  add(doc.querySelector(".climb-stage"), [{ translate: "0 0" }, { translate: "0 -62vh" }], { duration: LIST.tilt, easing, fill: "both" });
  // The original header reveal takes over while this short departure finishes.
  add(doc.querySelector(".site-header"), [{ opacity: 1, translate: "0 0" }, { opacity: 0, translate: "0 -8px", offset: 0.25 }, { opacity: 0, translate: "0 -8px" }], { duration: LIST.tilt + 200, fill: "none" });
  doc.querySelectorAll(".climb-rail, .climb-marker, .climb-card, .climb-portrait").forEach(target =>
    add(target, [{ opacity: getComputedStyle(target).opacity }, { opacity: 0 }], { duration: 300, fill: "forwards" }));

  const base = life.review(undefined, false);
  const controller: SplashController = {
    skip: base.skip, dispose: base.dispose,
    holdFailsafe() { base.holdFailsafe(); landing?.holdFailsafe(); },
    get animations() { return [...life.created, ...(landing?.animations ?? [])]; },
    seek(time) {
      if (!life.active) return;
      controller.holdFailsafe();
      for (const animation of screenTracks) {
        if (animation.playState !== "idle") { animation.pause(); animation.currentTime = time + LIST_OPEN_OFFSET; }
      }
      base.seek(time);
      advance();
      if (life.active) landing?.seek(time + LIST_OPEN_OFFSET);
    },
  };
  const advance = () => {
    if (!life.active) return;
    const time = animationTime(clock) - LIST_OPEN_OFFSET;
    if (!switched && time >= LIST.tilt) {
      doSwitch();
      landing = startSplash(el, { allowSeen: true, seekCss: false, remember: false, onDone: () => life.finish(false) });
      // startSplash owns the hero reveal; the outer controller owns the complete
      // look-down sequence, including review seeks and interruption cleanup.
      (el as SplashElement).splashController = controller;
    }
    if (time >= LIST.end) life.finish(false);
  };
  const tick = () => { advance(); if (life.active) frame = requestAnimationFrame(tick); };
  life.cleanup(() => { cancelAnimationFrame(frame); landing?.dispose(); el.remove(); });
  frame = requestAnimationFrame(tick);
  life.arm(LIST.end + 1500);
  (el as SplashElement).splashController = controller;
  return controller;
}

export function createListTransition(switchView: () => void, onDone?: () => void) {
  if (reducedMotion() || typeof Element.prototype.animate !== "function" || typeof CSSAnimation === "undefined") {
    switchView(); onDone?.(); return null;
  }
  const overlay = document.createElement("div");
  overlay.className = "splash splash--list";
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML = mapOverlayMarkup(listTrailheadIntro.heading, "splash-list");
  for (const [name, value] of Object.entries(mapAssetStyles)) overlay.style.setProperty(name, value);
  document.body.prepend(overlay);
  let switched = false;
  const once = () => { if (!switched) { switched = true; switchView(); } };
  try { return toListTransition(overlay, once, { onDone }); }
  catch { (overlay as SplashElement).splashController?.skip(); overlay.remove(); once(); onDone?.(); return null; }
}

// ------------------------------------------------- List View → Climb View
// el: a fresh copy of the opening overlay. switchView(): the app's own
// toggle (shows the Climb, hides the List View). Returns a controller.
export function toClimbTransition(el: HTMLElement, switchView: () => void, options: Options = {}) {
  const doc = el.ownerDocument, win = window, root = doc.documentElement;
  const reduced = reducedMotion();
  let switched = false;
  const doSwitch = () => { if (!switched) { switched = true; switchView(); } };

  if (reduced) {
    // Opacity only: the Climb fades in over the page background.
    doSwitch();
    const life = lifecycle(el, { ...options, preserveFragment: true }, () => {});
    life.cleanup(() => el.remove());
    life.review(undefined, false);
    life.t0 = Number(doc.timeline.currentTime);
    life.add(doc.querySelector<HTMLElement>(".climb-enhancement"), [{ opacity: 0 }, { opacity: 1 }], { duration: 320, easing: "ease-out" })
      ?.finished.then(() => life.finish(false)).catch(() => {});
    life.arm(1000);
    return life.review(undefined, false);
  }

  el.classList.add("splash--climb");
  doc.body.prepend(el);
  // Hold the opening's own CSS frames at the fully unfolded, centered sheet.
  for (const a of el.getAnimations({ subtree: true })) {
    if (!(a instanceof CSSAnimation)) continue;
    const n = a.animationName;
    if (/^splash-(exit|sheet|zoom-fallback)/.test(n)) { a.cancel(); continue; }
    a.pause();
    a.currentTime = /^splash-world-off/.test(n) ? 0 : /^splash-(print-fade)/.test(n) ? 0 : 3550;
  }
  const life = lifecycle(el, { ...options, preserveFragment: true }, doSwitch);
  life.cleanup(() => el.remove());
  life.review(undefined, false);
  const { add } = life;
  life.t0 = Number(doc.timeline.currentTime);

  const sheet = part(el, ".splash-paper-stage"), camera = part(el, ".splash-camera"), world = part(el, ".splash-world");
  const paper = part(el, ".splash-greeting--paper"), pageCopy = part(el, ".splash-greeting--page");
  const heading = doc.getElementById("trailhead-title")!, vw = win.innerWidth, vh = win.innerHeight;
  const headerBottom = doc.querySelector<HTMLElement>(".site-header")?.getBoundingClientRect().bottom ?? 0;
  const hr = heading.getBoundingClientRect();
  const showGreeting = hr.top >= headerBottom - 4 && hr.bottom <= vh;   // only if the heading is on screen
  const H = showGreeting ? { x: hr.left + hr.width / 2, y: hr.top + hr.height / 2 } : { x: vw / 2, y: vh / 2 };
  const f = framing(el, H);
  const C = CLIMB.cover;

  // 1. The page becomes paper (dark: dawn moves right to left; light: the paper fades up).
  if (showGreeting) {
    copyType(paper, heading!); copyType(pageCopy, heading);
    paper.querySelectorAll<HTMLElement>(".splash-word").forEach((w) => { w.style.animation = "none"; w.style.maskImage = w.style.webkitMaskImage = "none"; });
    add(heading, [{ opacity: 0 }, { opacity: 0 }], { duration: CLIMB.end, fill: "none" });
    add(pageCopy, [{ visibility: "visible" }, { visibility: "visible" }], { duration: C, fill: "none" });
  } else paper.hidden = true;
  if (root.dataset.theme === "light") {
    add(sheet, [{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: "ease-out", fill: "both" });
  } else {
    const M = vw * 3.2, image = "linear-gradient(100deg, transparent 0 46%, #000 54% 100%)";
    const at = (x: number) => ({ maskImage: image, webkitMaskImage: image, maskSize: `${M}px 100%`, webkitMaskSize: `${M}px 100%`, maskRepeat: "no-repeat", webkitMaskRepeat: "no-repeat", maskPosition: `${x}px 0`, webkitMaskPosition: `${x}px 0` });
    add(sheet, [at(1.2 * vw - M / 2), at(-0.2 * vw - M / 2)], { duration: C - 20, easing: "cubic-bezier(0.45, 0, 0.4, 1)", fill: "backwards" });
  }
  add(sheet, [{ visibility: "hidden" }, { visibility: "hidden" }], { delay: C, duration: CLIMB.end, fill: "none" });
  add(world, [{ opacity: 0 }, { opacity: 0 }], { duration: C, fill: "none" });
  // Cues run off the same animation clock as everything else, so pausing or seeking holds them too.
  const clock = add(el, [{ opacity: 1 }, { opacity: 1 }], { duration: CLIMB.end, fill: "none" });
  const cues: { ms: number; fn: () => void; done: boolean }[] = [];
  const at = (ms: number, fn: () => void) => cues.push({ ms, fn, done: false });
  let frame = 0;
  const advance = () => {
    if (!life.active) return;
    const t = animationTime(clock);
    for (const cue of cues) if (!cue.done && t >= cue.ms) { cue.done = true; cue.fn(); }
  };
  const tick = () => { advance(); if (life.active) frame = requestAnimationFrame(tick); };
  frame = requestAnimationFrame(tick);
  life.cleanup(() => cancelAnimationFrame(frame));
  at(C, doSwitch);

  // 2. Pull back from the page to the floating map.
  if (f) {
    camera.style.transformOrigin = `${f.F.x}px ${f.F.y}px`;
    if (showGreeting) {
      // The same words, printed on the centre pane where the camera will find them.
      const pg = part(el, ".splash-pane-greeting");
      const cs = getComputedStyle(heading), s = 1 / f.S;
      const lines: string[][] = []; let lastTop: number | null = null;
      paper.querySelectorAll<HTMLElement>(".splash-word").forEach((w) => { const t = Math.round(w.getBoundingClientRect().top); if (t !== lastTop) { lines.push([]); lastTop = t; } lines[lines.length - 1].push(w.textContent); });
      pg.innerHTML = lines.map((l) => l.join(" ").replace(/&/g, "&amp;").replace(/</g, "&lt;")).join("<br>");
      Object.assign(pg.style, {
        left: `${f.F.x + (hr.left - f.F.x) * s - f.map.left}px`, top: `${f.F.y + (hr.top - f.F.y) * s - f.map.top}px`,
        fontFamily: cs.fontFamily, fontWeight: cs.fontWeight, fontSize: `${parseFloat(cs.fontSize) * s}px`,
        letterSpacing: `${parseFloat(cs.letterSpacing || "0") * s}px`, lineHeight: `${parseFloat(cs.lineHeight) * s}px`,
      });
      pg.dataset.aligned = "";
    }
    add(camera, [{ transform: `scale(${f.S})` }, { transform: `scale(${f.S})` }], { duration: CLIMB.pull[0], fill: "backwards" });
    add(camera, scaleFrames(f.S, 1, pullEase), { delay: CLIMB.pull[0], duration: CLIMB.pull[1], fill: "forwards" });
  }
  // At full magnification the pane's row seam and edges would read as lines; a plain sheet
  // over the pane hides them and lifts as the folds come into view.
  add(part(el, ".splash-pane-cover"), [{ opacity: 1 }, { opacity: 0 }], { delay: 470, duration: 420, easing: "ease-in-out", fill: "both" });
  // 3. Look up from the map to the mountain: the sheet tips away and drops out of view,
  //    the backdrop slides down, and the Climb (already behind) descends into place.
  const [t0, td] = CLIMB.tilt, lookUp = "cubic-bezier(0.5, 0, 0.3, 1)";
  add(part(el, ".splash-map"), [{ transform: "rotateX(0deg)" }, { transform: "rotateX(58deg)" }], { delay: t0, duration: td, easing: "cubic-bezier(0.45, 0, 0.6, 1)", fill: "forwards" });
  add(part(el, ".splash-rig"), [{ translate: "0 0" }, { translate: "0 112vh" }], { delay: t0 + 80, duration: td - 80, easing: lookUp, fill: "forwards" });
  add(part(el, ".splash-table"), [{ translate: "0 0" }, { translate: "0 140vh" }], { delay: t0, duration: td, easing: lookUp, fill: "forwards" });
  const stage = doc.querySelector<HTMLElement>(".climb-stage");
  add(stage, [{ translate: "0 -62vh" }, { translate: "0 0" }], { delay: t0, duration: td + 120, easing: "cubic-bezier(0.35, 0, 0.2, 1)" });

  // 4. Waypoints, rail, Trailhead card and portrait arrive; the scene becomes interactive.
  const markers = [...doc.querySelectorAll<HTMLElement>(".climb-marker:not([hidden])")].sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top);
  markers.forEach((m, i) => add(m, [{ opacity: 0, scale: "0.4" }, { opacity: 1, scale: "1" }], { delay: 1780 + i * 90, duration: 420, easing: "cubic-bezier(0.3, 1.45, 0.5, 1)" }));
  add(doc.querySelector<HTMLElement>(".climb-rail"), [{ opacity: 0 }, { opacity: 1 }], { delay: 1900, duration: 420 });
  add(doc.querySelector<HTMLElement>('.climb-card[data-card="0"]'), [{ opacity: 0, translate: "0 14px" }, { opacity: 1, translate: "0 0" }], { delay: 2000, duration: 480, easing: "cubic-bezier(0.2, 0.7, 0.3, 1)" });
  add(doc.querySelector<HTMLElement>(".climb-portrait"), [{ opacity: 0, translate: "0 14px" }, { opacity: 1, translate: "0 0" }], { delay: 2080, duration: 480, easing: "cubic-bezier(0.2, 0.7, 0.3, 1)" });
  add(world, [{ opacity: 1 }, { opacity: 1 }], { delay: C, duration: t0 + td - C, fill: "none" });
  add(world, [{ visibility: "hidden" }, { visibility: "hidden" }], { delay: t0 + td, duration: CLIMB.end, fill: "none" });

  // The climb stage's own markers are placed after switchView(); measure them then.
  at(C + 20, () => {
    [...doc.querySelectorAll<HTMLElement>(".climb-marker:not([hidden])")].sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top)
      .forEach((m, i) => { if (!markers.includes(m)) add(m, [{ opacity: 0, scale: "0.4" }, { opacity: 1, scale: "1" }], { delay: 1780 + i * 90, duration: 420, easing: "cubic-bezier(0.3, 1.45, 0.5, 1)" }); });
  });
  at(CLIMB.end - 1, () => life.finish(false));
  life.arm(CLIMB.end + 1500);
  return life.review(advance, false);
}

// A fresh, namespaced copy keeps React ownership of the server-rendered opening
// separate from the short-lived transition DOM.
export function createClimbTransition(switchView: () => void, onDone?: () => void) {
  const overlay = document.createElement("div");
  overlay.className = "splash splash--climb";
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML = mapOverlayMarkup(listTrailheadIntro.heading, "splash-climb");
  for (const [name, value] of Object.entries(mapAssetStyles)) overlay.style.setProperty(name, value);
  try { return toClimbTransition(overlay, switchView, { onDone }); }
  catch { (overlay as SplashElement).splashController?.skip(); overlay.remove(); switchView(); onDone?.(); return null; }
}
````

### `components/splash/splash.css`

Complete map, paper, face, shadow, mask, sizing and reduced-motion styles.

Full file (212 lines).

````css
/* The physical map keeps its 6400ms clock; the branded hero finishes at 7550ms.
   The last sway overlaps the first fold. Paper is always the Light navbar color. */

html[data-splash="active"] .splash { display: block; }

.splash {
  --w: min(28vw, 47vh);
  --ph: calc(var(--w) * 0.7);
  --rig-top: 50vh;
  --zoom-fallback: 5.4;
  --paper: #f3eedd;
  --paper-back: var(--paper);

  --print: var(--print-wide);
  animation: splash-exit 7550ms linear both;
  contain: strict;
  display: none;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  position: fixed;
  user-select: none;
  z-index: 100; /* above .site-header (60) and .skip-link (20) */
}
/* Portrait phones: a taller sheet, the same three panes and two folds. */
@media (max-aspect-ratio: 4/5) {
  .splash { --w: min(43vw, 30vh); --ph: calc(var(--w) * 1.25); --rig-top: 50vh; --zoom-fallback: 3.4; --print: var(--print-tall); }
}
html[data-splash] .splash.splash--skipped { animation: none; display: none; }
/* The overlay never fades as a whole: by 7.55 s nothing in it is visible, so it
   is simply removed. (A fade here would show the decorative greeting and the
   real heading at once.) */
@keyframes splash-exit { 0%, 99.99% { visibility: visible; } 100% { visibility: hidden; } }

/* Climb View transition reuses this overlay under the header; JS drives it. */
html .splash.splash--climb { animation: none; display: block; z-index: 59; }
html .splash.splash--list { display: block; z-index: 59; }
/* On the look-down return the open sheet is beneath the camera. The opening's
   two flat table shadows would float behind its tilted paper as dark halos. */
.splash--list .splash-shadow { display: none; }

/* ---------- World: table, camera, rig ---------- */
.splash-world { animation: splash-world-off 6400ms linear both; inset: 0; position: absolute; }
@keyframes splash-world-off { 0%, 69.062% { opacity: 1; visibility: visible; } 69.065%, 100% { opacity: 0; visibility: hidden; } }
.splash-table {
  background:
    radial-gradient(ellipse 70% 60% at 50% 44%, rgba(255, 251, 237, 0.06), transparent 70%),
    radial-gradient(ellipse at 50% 40%, #1b4639 0%, #173f35 48%, #0f2e27 100%);
  inset: -45vh 0 0; position: absolute;
  /* The top 35vh sit above the screen at rest; they feather the edge when the view tilts up to the mountain. */
  -webkit-mask-image: linear-gradient(to bottom, transparent, #000 35vh); mask-image: linear-gradient(to bottom, transparent, #000 35vh);
}
.splash-table::after { background: var(--grain); background-size: 192px; content: ""; inset: 0; opacity: 0.55; position: absolute; }
.splash-camera {
  animation: splash-zoom-fallback 6400ms linear both;
  inset: 0; position: absolute; transform-origin: 50% var(--rig-top);
}
@keyframes splash-zoom-fallback {
  0%, 53.4375% { animation-timing-function: cubic-bezier(0.6, 0, 0.16, 1); transform: scale(1); }
  69.0625%, 100% { transform: scale(var(--zoom-fallback)); }
}
.splash-rig {
  animation: splash-rig 6400ms linear both;
  height: 0; left: 50%; perspective: calc(var(--w) * 3.2); position: absolute; top: var(--rig-top); width: 0;
}
.splash-probe { height: var(--ph); position: absolute; visibility: hidden; width: var(--w); }

/* ---------- Table shadow ---------- */
.splash-shadow {
  background: #04140f; border-radius: 3px;
  height: calc(var(--ph) * 2); left: calc(var(--w) * -1); position: absolute; top: calc(var(--ph) * -1); width: calc(var(--w) * 2);
}
.splash-shadow--soft { animation: splash-shadow-soft 6400ms linear both; filter: blur(calc(var(--w) * 0.07)); }
.splash-shadow--contact { animation: splash-shadow-contact 6400ms linear both; filter: blur(calc(var(--w) * 0.014)); }

/* ---------- The sheet: two rows; each row = left door | centre pane | right door ---------- */
.splash-map {
  animation: splash-map 6400ms linear both;
  height: calc(var(--ph) * 2); left: calc(var(--w) * -1); position: absolute; top: calc(var(--ph) * -1);
  transform-style: flat; perspective: calc(var(--w) * 3.2); perspective-origin: 50% 50%; width: calc(var(--w) * 2);
}
.splash-row { display: contents; }
.splash-pane, .splash-door { height: var(--ph); position: absolute; top: 0; transform-style: flat; }
.splash-pane { left: calc(var(--w) * 0.5); width: var(--w); z-index: 1; }
.splash-door { width: calc(var(--w) * 0.5); z-index: 3; }
.splash-row--bottom .splash-pane, .splash-row--bottom .splash-door { top: var(--ph); }
.splash-row--top .splash-pane { transform-origin: 50% 100%; }
.splash-door--l { animation: splash-door-l 6400ms linear both; left: 0; transform-origin: 100% 50%; }
.splash-door--r { animation: splash-door-r 6400ms linear both; left: calc(var(--w) * 1.5); transform-origin: 0 50%; }
.splash-row--top .splash-door { z-index: 5; }
.splash-row--top .splash-door--l { animation-name: splash-top-door-l; transform-origin: 100% 100%; }
.splash-row--top .splash-door--r { animation-name: splash-top-door-r; transform-origin: 0 100%; }

.splash-face {
  /* Authored normal tracks cull each physical face, including nested flips. */
  backface-visibility: visible; -webkit-backface-visibility: visible;
  background-color: var(--paper);
  box-shadow: 0 0 0 0.4px var(--paper);
  inset: 0; overflow: hidden; position: absolute;
}
/* Each face owns one registered SVG: print image and live lettering rotate
   together. Only the ink fades during the push; opaque paper never fades. */
.splash-pane .splash-face--back { transform: rotateX(180deg); }
.splash-door .splash-face--back { transform: rotateY(180deg); }
.splash-print { animation: splash-print-fade 6400ms linear both; }
@keyframes splash-print-fade { 0%, 59.0625% { opacity: 1; } 69.0625%, 100% { opacity: 0; } }
.splash-face svg { display: block; height: 100%; left: 0; position: absolute; top: 0; width: 100%; }
.splash-face .splash-print--tall { display: none; }
@media (max-aspect-ratio: 4/5) { .splash-face .splash-print--wide { display: none; } .splash-face .splash-print--tall { display: block; } }

/* Printed, hairline hinges give the folds definition without tinting the paper. */
.splash-crease { animation: splash-print-fade 6400ms linear both; inset: 0; pointer-events: none; position: absolute; }
.splash-row--bottom .splash-crease--row { border-top: 0.5px solid rgba(80, 66, 40, 0.12); }
.splash-pane .splash-crease--hinge { border-inline: 0.5px solid rgba(80, 66, 40, 0.12); }

/* ---------- Screen-space paper and the greeting ----------
   Two decorative copies of the greeting, never both visible against different
   grounds: .--paper (dark ink, on the paper) and .--page (the theme's heading
   colour, under the paper). The real <h1> is hidden until one frame where the
   .--page copy hides and the <h1> shows (JS, same clock). Neither copy uses a
   filter, so its glyphs are rasterised like the <h1>'s. */
.splash-paper-stage { animation: splash-sheet-fallback 6400ms linear both; inset: 0; position: absolute; }
.splash-sheet {
  animation: splash-sheet-in 6400ms linear both;
  background: var(--paper);
  inset: 0; position: absolute;
}

@keyframes splash-sheet-in { 0%, 63.125% { opacity: 0; } 69.0625%, 100% { opacity: 1; } }
@keyframes splash-sheet-fallback { 0%, 63.125% { opacity: 0; } 69.0625%, 87.5% { opacity: 1; } 96.875%, 100% { opacity: 0; } }

.splash-greeting {
  color: #1f2621;
  font-family: var(--font-newsreader), Georgia, serif;
  font-size: clamp(2rem, 3.4vw, 3.25rem);
  font-weight: 450;
  left: 50%;
  letter-spacing: -0.035em;
  line-height: 1;
  margin: 0;
  max-width: calc(100vw - 2.5rem);
  position: absolute;
  text-wrap: pretty;
  top: 46%;
  transform: translate(-50%, -50%);
}
.splash-greeting[data-aligned] { max-width: none; transform: none; }
.splash-greeting--page { color: #ece6d2; visibility: hidden; }
html[data-theme="light"] .splash-greeting--page { color: #1f2621; }
.splash-word {
  animation: splash-ink 600ms cubic-bezier(0.3, 0.1, 0.25, 1) both;
  -webkit-mask-image: linear-gradient(90deg, #000 0 42%, rgba(0, 0, 0, 0.45) 50%, transparent 58% 100%);
  mask-image: linear-gradient(90deg, #000 0 42%, rgba(0, 0, 0, 0.45) 50%, transparent 58% 100%);
  -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat;
  -webkit-mask-size: 270% 100%; mask-size: 270% 100%;
  display: inline-block;
}
.splash-greeting--page .splash-word { animation: none; -webkit-mask-image: none; mask-image: none; }
.splash-word:nth-child(1) { animation-delay: 3800ms; }
.splash-word:nth-child(2) { animation-delay: 3930ms; }
.splash-word:nth-child(3) { animation-delay: 4060ms; }
/* Ink: a soft-edged mask sweeps through each word while it darkens from a wet
   green-grey and its halo soaks in. No blur filter; the mask is dropped on the
   last frame so the settled glyphs paint exactly like the heading. */
@keyframes splash-ink {
  0% { color: #5b7a6d; opacity: 0; -webkit-mask-position: 100% 0; mask-position: 100% 0; text-shadow: 0 0 0.22em rgba(31, 38, 33, 0.38); }
  45% { opacity: 0.85; }
  80% { color: #1f2621; text-shadow: 0 0 0.05em rgba(31, 38, 33, 0.16); }
  99.9% { -webkit-mask-image: linear-gradient(90deg, #000 0 42%, rgba(0, 0, 0, 0.45) 50%, transparent 58% 100%); mask-image: linear-gradient(90deg, #000 0 42%, rgba(0, 0, 0, 0.45) 50%, transparent 58% 100%);
    -webkit-mask-position: 0 0; mask-position: 0 0; }
  100% { color: #1f2621; opacity: 1; -webkit-mask-image: none; mask-image: none; text-shadow: none; }
}

/* A copy of the greeting printed on the centre pane, used when the Climb
   transition pulls back from the page to the map (JS positions it). */
.splash-pane-greeting { color: #1f2621; display: none; font-family: var(--font-newsreader), Georgia, serif; margin: 0; position: absolute; white-space: nowrap; z-index: 8; }
.splash--climb .splash-pane-greeting[data-aligned] { display: block; }
.splash-pane-cover { background: var(--paper); display: none; height: 100%; left: calc(var(--w) * 0.5 - 1px); position: absolute; top: 0; width: calc(var(--w) + 2px); z-index: 7; }
.splash--climb .splash-pane-cover { display: block; }

.splash-defs { position: absolute; width: 0; height: 0; overflow: hidden; }
.splash svg text { font-family: var(--font-newsreader), Georgia, serif; }
.splash .contours .c { fill: none; stroke: rgba(23,63,53,.24); stroke-width: 1; }
.splash .contours .ci, .splash .ci { fill: none; stroke: rgba(23,63,53,.42); stroke-width: 1.6; }
.splash .water { fill: #dfe5d6; stroke: rgba(23,63,53,.25); }
.splash .water-label { fill: #5c776c; font-style: italic; }
.splash .route-halo { fill: none; stroke: #fffbed; stroke-width: 7; stroke-linecap: round; }
.splash .route { fill: none; stroke: #b5653b; stroke-width: 2.6; stroke-dasharray: 2 7; stroke-linecap: round; }
.splash .stop { fill: #fffbed; stroke: #b5653b; stroke-width: 2; }
.splash .stopn { fill: #8b4428; font-family: var(--font-manrope), sans-serif !important; font-weight: 800; }
.splash .peak { fill: #b5653b; }
.splash .neat { fill: none; stroke: rgba(23,63,53,.55); stroke-width: 1.2; }
.splash .tick { fill: none; stroke: rgba(23,63,53,.5); stroke-width: 1; }
.splash .place { fill: #173f35; font-style: italic; }
.splash .compass circle { fill: none; stroke: rgba(23,63,53,.5); }
.splash .compass path { fill: rgba(23,63,53,.35); } .splash .compass .needle { fill: #b5653b; }
.splash .compass text, .splash .titleblock text, .splash .lg-h, .splash .lg-n, .splash .cv-kicker, .splash .cv-foot { font-family: var(--font-manrope), sans-serif !important; font-weight: 700; letter-spacing: .14em; fill: #173f35; }
.splash .titleblock .scale { fill: none; stroke: #173f35; stroke-width: 1.2; }
.splash .titleblock .tb-title { font-weight: 800; }
.splash .titleblock .tb-sub { fill: #4a524b; }
.splash .lg-t { fill: #1f2621; } .splash .lg-i { fill: #173f35; font-style: italic; }
.splash .lg-n { fill: #b5653b; }
.splash .cv-kicker { fill: #173f35; } .splash .cv-foot { fill: #4a524b; }
.splash .cv-title { fill: #173f35; font-style: italic; }
.splash .cv-ridge { fill: none; stroke: #173f35; stroke-width: 2.4; stroke-linejoin: round; } .splash .cv-ridge.thin { stroke-width: 1.2; opacity: .6; }
.splash .cv-route { fill: none; stroke: #b5653b; stroke-width: 2.2; stroke-dasharray: 2 6; stroke-linecap: round; }
/* Reduced motion opens the complete reading surface on the first frame,
   including before hydration and with JavaScript disabled. */
@media (prefers-reduced-motion: reduce) {
  html[data-splash] .splash { display: none; animation: none; }
}
html[data-motion="reduce"] .splash { display: none; animation: none; }
````

### `components/splash/map/markup.ts`

Shared overlay DOM, SVG reference namespaces, asset base paths.

Full file (27 lines).

````ts
import { mapArt } from "./print.generated";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export const splashAssets = `${basePath}/splash`;
const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// The same deterministic paper faces serve both sequences.
// Namespace SVG references so a finishing opening and a new transition cannot
// accidentally use one another's text definitions.
export function mapOverlayMarkup(heading: string, prefix: string) {
  const greeting = heading.split(" ").map((word) => `<span class="splash-word">${escape(word)}</span>`).join(" ");
  return `<svg class="splash-defs" aria-hidden="true" focusable="false" width="0" height="0"><defs>${mapArt.defs}</defs></svg>
<div class="splash-world"><div class="splash-table"></div><div class="splash-camera"><div class="splash-rig">
<i class="splash-probe"></i><i class="splash-shadow splash-shadow--soft"></i><i class="splash-shadow splash-shadow--contact"></i>
<div class="splash-map">${mapArt.rows}<i class="splash-pane-cover"></i><p class="splash-pane-greeting"></p></div>
</div></div></div><p class="splash-greeting splash-greeting--page">${greeting}</p><div class="splash-paper-stage"><div class="splash-sheet"></div><p class="splash-greeting splash-greeting--paper">${greeting}</p></div>`
    .replaceAll("__SPLASH_ASSETS__", splashAssets)
    .replace(/id="([^"]+)"/g, `id="${prefix}-$1"`)
    .replace(/href="#([^"]+)"/g, `href="#${prefix}-$1"`)
    .replace(/url\(#([^)]+)\)/g, `url(#${prefix}-$1)`);
}

export const mapAssetStyles = {
  "--grain": `url("${splashAssets}/grain.png")`,
  "--print-wide": `url("${splashAssets}/print/print-wide.png")`,
  "--print-tall": `url("${splashAssets}/print/print-tall.png")`,
};
````

### `scripts/generate-splash-motion.mjs`

Authored motion, face opacity tracks, stacking, shadow keyframe generation.

Full file (173 lines).

````javascript
// Generates the map-handling keyframes. Every curve is authored as a function
// of absolute time on one 6.4 s timeline, sampled, then simplified so the CSS
// stays small. All lengths are multiples of --w (centre pane width) or --ph
// (row height), so the same keyframes serve every viewport size.
import { writeFileSync } from "node:fs";

const LEAD = 1600;
const TOTAL = 6400;
const DEG = Math.PI / 180;

function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t) => ((ax * t + bx) * t + cx) * t, sy = (t) => ((ay * t + by) * t + cy) * t;
  const dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => {
    let t = x;
    for (let i = 0; i < 8; i++) { const e = sx(t) - x; if (Math.abs(e) < 1e-6) break; const d = dx(t); if (Math.abs(d) < 1e-6) break; t -= e / d; }
    t = Math.min(1, Math.max(0, t));
    return sy(t);
  };
}
const EASE = {
  linear: (x) => x,
  in: bezier(0.42, 0, 1, 1),
  out: bezier(0.2, 0.7, 0.3, 1),
  inout: bezier(0.45, 0, 0.55, 1),
  snap: bezier(0.38, 0, 0.18, 1),   // release after resistance: quick, then a long soft landing
  give: bezier(0.3, 0.6, 0.5, 1),   // the first small give of a crease
  leave: bezier(0.5, 0, 0.8, 0.45),
};
// A track is [[time, value, ease?], ...]; ease belongs to the segment arriving at that point.
function track(points) {
  return (t) => {
    if (t <= points[0][0]) return points[0][1];
    for (let i = 1; i < points.length; i++) {
      const [t1, v1, e = "inout"] = points[i];
      if (t <= t1) {
        const [t0, v0] = points[i - 1];
        return v0 + (v1 - v0) * EASE[e]((t - t0) / (t1 - t0));
      }
    }
    return points[points.length - 1][1];
  };
}

// ------------------------------------------------------------------ curves
const T = {
  mapY: track([[0, -0.5], [150, -0.5], [1000, 0]]),
  top: track([[0, -180], [150, -180], [1000, 0]]),
  doorL: track([[0, 180], [960, 180], [1810, 0]]),
  doorR: track([[0, 180], [1030, 180], [1810, 0]]),

};

const rotX = (n, a) => [n[0], n[1] * Math.cos(a) - n[2] * Math.sin(a), n[1] * Math.sin(a) + n[2] * Math.cos(a)];
const rotY = (n, a) => [n[0] * Math.cos(a) + n[2] * Math.sin(a), n[1], -n[0] * Math.sin(a) + n[2] * Math.cos(a)];

// ------------------------------------------------------- sampling helpers
// Ramer–Douglas–Peucker over time keeps only the keyframes that matter.
function simplify(samples, tol) {
  const keep = new Uint8Array(samples.length); keep[0] = keep[samples.length - 1] = 1;
  const stack = [[0, samples.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let worst = -1, at = -1;
    for (let i = a + 1; i < b; i++) {
      const u = (samples[i].t - samples[a].t) / (samples[b].t - samples[a].t);
      let err = 0;
      samples[i].v.forEach((v, k) => { err = Math.max(err, Math.abs(v - (samples[a].v[k] + (samples[b].v[k] - samples[a].v[k]) * u)) / tol[k]); });
      if (err > worst) { worst = err; at = i; }
    }
    if (worst > 1) { keep[at] = 1; stack.push([a, at], [at, b]); }
  }
  return samples.filter((_, i) => keep[i]);
}
function keyframes(name, fn, tol, format, step = 1000 / 120, end = 2400) {
  const samples = [];
  for (let t = 0; t <= end + 1e-6; t += step) samples.push({ t, v: fn(t) });
  const kept = simplify(samples, tol);
  const pct = (t) => `${((t + LEAD) / TOTAL * 100).toFixed(3).replace(/\.?0+$/, "")}%`;
  const body = `0%{${format(kept[0].v)}}` + kept.map((s) => `${pct(s.t)}{${format(s.v)}}`).join("");
  return `@keyframes ${name}{${body}100%{${format(kept[kept.length - 1].v)}}}\n`;
}
const f3 = (n) => (Math.abs(n) < 5e-5 ? "0" : n.toFixed(4).replace(/\.?0+$/, ""));
const f2 = (n) => (Math.abs(n) < 5e-3 ? "0" : n.toFixed(2).replace(/\.?0+$/, ""));
const wlen = (k) => `calc(var(--w) * ${f3(k)})`;
const plen = (k) => `calc(var(--ph) * ${f3(k)})`;

function build() {
  let css = "/* Generated by scripts/generate-splash-motion.mjs — do not edit by hand. Times are on one 6400 ms timeline. */\n";

  // The packet starts fully above the viewport. The top fold starts at
  // 1750ms while the last few pixels of sway settle by 1930ms.
  const featherX = track([[0, -0.16], [650, 0.14], [1220, -0.07], [1700, 0.012], [1930, 0]]);
  const featherY = track([[0, 1], [520, 0.61], [1120, 0.16], [1700, 0.008], [1930, 0]]);
  const featherR = track([[0, -7], [650, 5], [1220, -3], [1700, 0.4], [1930, 0]]);
  const featherSamples = [];
  for (let t = 0; t <= 2000; t += 1000 / 120) featherSamples.push({t, v: [featherX(t), featherY(t), featherR(t)]});
  const featherFrames = simplify(featherSamples, [0.001, 0.001, 0.05]).map(({t, v: [x, y, r]}) => `${(t / TOTAL * 100).toFixed(5)}%{transform:translate(${wlen(x)},calc((var(--ph) * -0.5 - var(--w) * 0.09 - 24px - var(--rig-top)) * ${f3(y)})) rotate(${f2(r)}deg)}`).join("");
  css += `@keyframes splash-rig{${featherFrames}100%{transform:translate(0px,0px) rotate(0deg)}}\n`;
  css += keyframes("splash-map", (t) => [T.mapY(t)], [0.001],
    ([y]) => `transform:translateY(${plen(y)})`, 1000 / 120, 1000);
  css += keyframes("splash-top", (t) => [T.top(t)], [0.15], ([a]) => `transform:rotateX(${f2(a)}deg)`, 1000 / 240, 1050);
  for (const [side, sign] of [["l", 1], ["r", -1]]) {
    const door = side === "l" ? T.doorL : T.doorR;
    css += keyframes(`splash-door-${side}`, (t) => [door(t) * sign], [0.15], ([a]) => `transform:rotateY(${f2(a)}deg)`, 1000 / 240, 1900);
    // One complete transform per physical panel. Independent projection avoids
    // browser depth-sorting errors between nested, twice-folded faces.
    css += keyframes(`splash-top-door-${side}`, (t) => [T.top(t), door(t) * sign], [0.15, 0.15],
      ([a, d]) => `transform:rotateX(${f2(a)}deg) rotateY(${f2(d)}deg)`, 1000 / 240, 1900);
  }

  // Face paint follows its full normal (top row composes both folds).
  const normals = {
    "c-top-front": (t) => rotX([0, 0, 1], T.top(t) * DEG),
    "c-top-back": (t) => rotX([0, 0, -1], T.top(t) * DEG),
    "l-bot-front": (t) => rotY([0, 0, 1], T.doorL(t) * DEG),
    "l-bot-back": (t) => rotY([0, 0, -1], T.doorL(t) * DEG),
    "r-bot-front": (t) => rotY([0, 0, 1], -T.doorR(t) * DEG),
    "r-bot-back": (t) => rotY([0, 0, -1], -T.doorR(t) * DEG),
    "l-top-front": (t) => rotX(rotY([0, 0, 1], T.doorL(t) * DEG), T.top(t) * DEG),
    "l-top-back": (t) => rotX(rotY([0, 0, -1], T.doorL(t) * DEG), T.top(t) * DEG),
    "r-top-front": (t) => rotX(rotY([0, 0, 1], -T.doorR(t) * DEG), T.top(t) * DEG),
    "r-top-back": (t) => rotX(rotY([0, 0, -1], -T.doorR(t) * DEG), T.top(t) * DEG),
  };
  for (const [name, normal] of Object.entries(normals)) {
    // Opacity steps share the compositor clock with panel transforms. Discrete
    // visibility changes can lag one frame and flash reversed ink past edge-on.
    // The complementary face is fully opaque: the paper never crossfades.
    // Only turn a face over when its own plane is edge-on. Never hide a broad
    // inside panel at an unrelated fold threshold. Stacking provides occlusion.
    const facing = (t) => normal(t)[2] > 0;
    let visible = facing(0);
    let body = `0%{opacity:${visible ? 1 : 0}}`;
    for (let t = 1; t <= 2000; t++) {
      const next = facing(t);
      if (next !== visible) {
        body += `${((t + LEAD) / TOTAL * 100).toFixed(5)}%{opacity:${next ? 1 : 0}}`;
        visible = next;
      }
    }
    css += `@keyframes splash-face-${name}{${body}100%{opacity:${visible ? 1 : 0}}}\n`;
    const [side, row, face] = name.split("-");
    const pane = side === "c" ? ".splash-pane" : `.splash-door--${side}`;
    css += `.splash-row--${row === "bot" ? "bottom" : row} ${pane} .splash-face--${face}{animation:splash-face-${name} 6400ms steps(1,end) both}\n`;
  }

  // WebKit also flattens the packet's depth ordering. Keep the folded cover
  // above its doors until the top half passes edge-on, then release that order.
  let coverTurn = 0;
  while (T.top(coverTurn) < -90) coverTurn++;
  css += `@keyframes splash-pane-stack{0%{z-index:6}${((coverTurn + LEAD) / TOTAL * 100).toFixed(5)}%{z-index:4}100%{z-index:4}}\n`;
  css += `.splash-row--top .splash-pane{animation:splash-top 6400ms linear both,splash-pane-stack 6400ms steps(1,end) both}\n`;

  // The table shadow follows the visible footprint of the sheet.
  const footprint = (t) => {
    const ext = (a) => Math.max(0, Math.cos(a * DEG));
    const left = 0.5 + 0.5 * ext(T.doorL(t)), right = 0.5 + 0.5 * ext(T.doorR(t));
    const topExt = ext(T.top(t));
    return { sx: (left + right) / 2, dx: (right - left) / 2, sy: (1 + topExt) / 2, dy: (1 - topExt) / 2 + T.mapY(t) };
  };
  const lift = () => 0;
  for (const [name, soft] of [["splash-shadow-soft", true], ["splash-shadow-contact", false]]) {
    css += keyframes(name, (t) => { const f = footprint(t), l = lift(t); return [f.sx, f.dx + (soft ? 0.035 * l : 0.006), f.sy, f.dy, soft ? 0.2 + 0.3 * l : 0.55 * (1 - l) + 0.08, soft ? 0.06 * l : 0.012]; },
      [0.004, 0.003, 0.004, 0.004, 0.01, 0.003],
      ([sx, dx, sy, dy, o, oy]) => `opacity:${f3(o)};transform:translate(${wlen(dx)},calc(var(--ph) * ${f3(dy * 2)} / 2 + var(--w) * ${f3(oy)})) scale(${f3(sx)},${f3(sy)})`, 1000 / 120, 2000);
  }

  return css;
}

writeFileSync(new URL("../components/splash/motion.generated.css", import.meta.url), build());
````

### `scripts/generate-splash-art.mjs`

Raster/live-letter split, pane SVG viewBoxes and generated runtime markup.

Full file (68 lines).

````javascript
// Rebuild the lightweight text/face markup from the supplied v2 artwork.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import * as print from "./splash/print.mjs";
const H0 = { wide: 350, tall: 625 };
// Read only the canonical display name/order fields; never bundle runtime metadata.
const wp = [...readFileSync(new URL("../content/waypoints.ts", import.meta.url), "utf8").matchAll(/name:\s*"([^"]+)",\s*slug:\s*"[^"]+",\s*order:\s*(\d+)/g)].map(([, name, order]) => [Number(order), name]);
if (wp.length !== 6) throw new Error("Expected six canonical Waypoint names");
const legends = { wide: print.legend("wide", wp), tall: print.legend("tall", wp) };
const rawDefs = ["wide", "tall"].map((v) => print.insidePrint(v) + print.cover(v) + Object.values(legends[v]).join("")).join("");

// <use> clones don't match the page's descendant selectors, so the print's
// classes are resolved to inline styles here.
const SERIF = "font-family:var(--font-newsreader),Georgia,serif;";
const SANS = "font-family:var(--font-manrope),sans-serif;font-weight:700;letter-spacing:.14em;";
const STYLE = {
  c: "fill:none;stroke:rgba(23,63,53,.24);stroke-width:1", ci: "fill:none;stroke:rgba(23,63,53,.42);stroke-width:1.6",
  water: "fill:#dfe5d6;stroke:rgba(23,63,53,.25)", "water-label": SERIF + "fill:#5c776c;font-style:italic",
  "route-halo": "fill:none;stroke:#fffbed;stroke-width:7;stroke-linecap:round",
  route: "fill:none;stroke:#b5653b;stroke-width:2.6;stroke-dasharray:2 7;stroke-linecap:round",
  stop: "fill:#fffbed;stroke:#b5653b;stroke-width:2", stopn: SANS + "fill:#8b4428;font-weight:800;letter-spacing:0",
  peak: "fill:#b5653b", neat: "fill:none;stroke:rgba(23,63,53,.55);stroke-width:1.2", tick: "fill:none;stroke:rgba(23,63,53,.5);stroke-width:1",
  place: SERIF + "fill:#173f35;font-style:italic", compass: "fill:rgba(23,63,53,.35);stroke:rgba(23,63,53,.5);stroke-width:1",
  needle: "fill:#b5653b;stroke:none", titleblock: SANS + "fill:#173f35", scale: "fill:none;stroke:#173f35;stroke-width:1.2",
  "tb-title": "font-weight:800", "tb-sub": "fill:#4a524b", "lg-t": SERIF + "fill:#1f2621", "lg-i": SERIF + "fill:#173f35;font-style:italic",
  "lg-h": SANS + "fill:#173f35", "lg-n": SANS + "fill:#b5653b", "cv-kicker": SANS + "fill:#173f35", "cv-foot": SANS + "fill:#4a524b",
  "cv-title": SERIF + "fill:#173f35;font-style:italic", "cv-ridge": "fill:none;stroke:#173f35;stroke-width:2.4;stroke-linejoin:round",
  thin: "stroke-width:1.2;opacity:.6", "cv-route": "fill:none;stroke:#b5653b;stroke-width:2.2;stroke-dasharray:2 6;stroke-linecap:round",
  contours: "", "cv-art": "",
};
const defs = rawDefs.replace(/ class="([^"]+)"/g, (_, names) => {
  const css = names.split(/\s+/).map((n) => { if (!(n in STYLE)) throw new Error("no style for " + n); return STYLE[n]; }).filter(Boolean).join(";");
  return css ? ` style="${css}"` : "";
}).replace(/<text /g, `<text style="${SERIF}fill:#173f35" `).replace(/<text style="([^"]*)" ([^>]*?) style="([^"]*)"/g, '<text $2 style="$1;$3"');

// Shapes are rasterised once (raster.py); faces keep only the lettering as live SVG.
const textDefs = defs
  .replace(/<clipPath[\s\S]*?<\/clipPath>/g, "")
  .replace(/ clip-path="[^"]*"/g, "")
  .replace(/<(path|circle|ellipse|rect)\b[^>]*\/>/g, "");
const shapeDefs = defs.replace(/<text\b[\s\S]*?<\/text>/g, "");
const SPRITES = [["print-wide", 1000, 700, 1.8], ["print-tall", 1000, 1250, 1.1], ["cover-wide", 500, 350, 1.8], ["cover-tall", 500, 625, 1.3]];
for (const v of ["wide", "tall"]) for (const k of ["lg-lt", "lg-lb", "lg-rt", "lg-rb"]) SPRITES.push([`${k}-${v}`, 250, H0[v], v === "wide" ? 1.8 : 1.2]);

mkdirSync(new URL("../.next/splash-art/", import.meta.url), { recursive: true });
writeFileSync(new URL("../.next/splash-art/sprites.html", import.meta.url), `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:transparent}svg{display:block}</style><svg width="0" height="0" style="position:absolute"><defs>${shapeDefs}</defs></svg>${SPRITES.map(([id,w,h,k]) => `<svg id="sprite-${id}" width="${Math.round(w*k)}" height="${Math.round(h*k)}" viewBox="0 0 ${w} ${h}"><use href="#${id}"/></svg>`).join("")}`);
// One face: lossless print, live lettering, and hairline hinge rules.
const H = H0;
function slice(id, x, w, row, own) {
  return ["wide", "tall"].map((v) => {
    const width = own ? (id === "cover" ? 500 : 250) : 1000;
    const height = own ? H[v] : H[v] * 2;
    return `<svg class="splash-print splash-print--${v}" data-map-art="${id}-${v}" viewBox="${x} ${own ? 0 : row * H[v]} ${w} ${H[v]}" preserveAspectRatio="none" aria-hidden="true" focusable="false"><image href="__SPLASH_ASSETS__/print/${id}-${v}.png" width="${width}" height="${height}" preserveAspectRatio="none"/><use href="#${id}-${v}"/></svg>`;
  }).join("");
}
function rowMarkup(row) {
  const name = row === 0 ? "top" : "bottom";
  const crease = '<i class="splash-crease splash-crease--row"></i><i class="splash-crease splash-crease--hinge"></i>';
  const lg = row === 0 ? ["lg-lt", "lg-rt"] : ["lg-lb", "lg-rb"];
  return `          <div class="splash-row splash-row--${name}">
            <div class="splash-pane"><div class="splash-face splash-face--front">${slice("print", 250, 500, row)}${crease}</div>${row === 0 ? `<div class="splash-face splash-face--back">${slice("cover", 0, 500, 0, true)}</div>` : ""}</div>
            <div class="splash-door splash-door--l"><div class="splash-face splash-face--front">${slice("print", 0, 250, row)}${crease}</div><div class="splash-face splash-face--back">${slice(lg[0], 0, 250, 0, true)}</div></div>
            <div class="splash-door splash-door--r"><div class="splash-face splash-face--front">${slice("print", 750, 250, row)}${crease}</div><div class="splash-face splash-face--back">${slice(lg[1], 0, 250, 0, true)}</div></div>
          </div>`;
}


const generated = { defs: textDefs, rows: rowMarkup(0) + rowMarkup(1) };
writeFileSync(new URL("../components/splash/map/print.generated.ts", import.meta.url), "// Generated by scripts/generate-splash-art.mjs. Do not edit.\nexport const mapArt = " + JSON.stringify(generated, null, 2) + " as const;\n");
````

### `scripts/rasterize-splash-print.mjs`

Chromium PNG generation and transparency.

Full file (20 lines).

````javascript
// Rebuild lossless, transparent print sprites with Chromium's SVG renderer.
// PNG avoids WebP chroma bleeding from green print into the unprinted paper.
// No font rasterisation, Python environment, or extra image dependency required.
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import "./generate-splash-art.mjs";

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 2000, height: 2000 } });
  await page.goto(new URL("../.next/splash-art/sprites.html", import.meta.url).href);
  const directory = new URL("../public/splash/print/", import.meta.url);
  mkdirSync(directory, { recursive: true });
  for (const sprite of await page.locator('svg[id^="sprite-"]').all()) {
    const id = (await sprite.getAttribute("id")).slice(7);
    const png = await sprite.screenshot({ omitBackground: true });
    writeFileSync(fileURLToPath(new URL(`${id}.png`, directory)), png);
  }
} finally { await browser.close(); }
````

### `scripts/splash/geometry.mjs`

Canonical printed map route and annotation layout.

Full file (36 lines).

````javascript
// Source coordinates shared by the print and its spacing checks. The trail
// retains every original control point; only its numbered annotations move.
export function mapGeometry(variant) {
  const width = 1000, height = variant === 'tall' ? 1250 : 700;
  const scale = variant === 'tall' ? 1.25 : 1;
  const route = [[.07,.955],[.15,.84],[.085,.69],[.18,.55],[.11,.38],[.2,.22],[.31,.11],[.45,.075],[.6,.105],[.72,.06],[.8,.17],[.87,.12],[.905,.07]].map(([x,y])=>[x*width,y*height]);
  const samples = [];
  for (let i=0; i<route.length-1; i++) {
    const p0=route[Math.max(0,i-1)],p1=route[i],p2=route[i+1],p3=route[Math.min(route.length-1,i+2)];
    const c1=p1.map((v,k)=>v+(p2[k]-p0[k])/6), c2=p2.map((v,k)=>v-(p3[k]-p1[k])/6);
    for (let j=0;j<=100;j++) { const t=j/100,u=1-t; samples.push(p1.map((v,k)=>u*u*u*v+3*u*u*t*c1[k]+3*u*t*t*c2[k]+t*t*t*p2[k])); }
  }
  const waypoints = [1,3,5,7,9,11].map((index, i) => {
    const anchor=route[index], tangent=route[index+1].map((v,k)=>v-route[index-1][k]);
    const length=Math.hypot(...tangent), n=[-tangent[1]/length,tangent[0]/length];
    for (let distance=16*scale;distance<=40*scale;distance+=2*scale) {
      for (const sign of [1,-1]) {
        const normal=n.map(v=>v*sign), center=anchor.map((v,k)=>v+normal[k]*distance), radius=5.5*scale;
        let label;
        if (Math.abs(normal[1])>.7) {
          const y=center[1]+(normal[1]>0?21:-10)*scale;
          label={x:center[0],y,anchor:'middle',bounds:[center[0]-8*scale,y-11*scale,16*scale,13*scale]};
        } else {
          const left=normal[0]<0, x=center[0]+(left?-10:10)*scale, y=center[1]+4*scale;
          label={x,y,anchor:left?'end':'start',bounds:[left?x-16*scale:x,y-11*scale,16*scale,13*scale]};
        }
        const [x,y,w,h]=label.bounds;
        const circleGap=Math.min(...samples.map(p=>Math.hypot(p[0]-center[0],p[1]-center[1])))-radius-2.3;
        const labelGap=Math.min(...samples.map(p=>Math.hypot(Math.max(x-p[0],0,p[0]-x-w),Math.max(y-p[1],0,p[1]-y-h))))-1.3;
        if (circleGap>=5 && labelGap>=5 && x>20 && x+w<980 && y>20 && y+h<height-20) return {number:i+1,anchor,center,radius,label};
      }
    }
    throw new Error(`No clear annotation position for waypoint ${i+1} (${variant})`);
  });
  return {width,height,scale,route,waypoints};
}
````

### `scripts/splash/print.mjs`

Deterministic print, contours, cover and legend source.

Full file (194 lines).

````javascript
// Deterministic artwork for the map opening: the printed inside of the trail
// map (contours + route kept to the perimeter, blank centre), its cover and
// legend panels. Pure string builders; no DOM.

import { mapGeometry } from "./geometry.mjs";

const COPPER = "#b5653b";
const r1 = (n) => Math.round(n * 10) / 10;

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ---------------------------------------------------------------- contours
function field(W, H, blank) {
  const R = rng(11);
  const hills = [
    [0.10, 0.12, 0.17, 1.35], [0.89, 0.08, 0.19, 1.55], [0.06, 0.88, 0.16, 1.15], [0.93, 0.90, 0.17, 1.25],
    [0.50, -0.06, 0.20, 1.05], [0.47, 1.07, 0.21, 0.95], [0.14, 0.50, 0.11, 0.95], [0.86, 0.50, 0.12, 1.05],
    [0.31, 0.01, 0.10, 0.75], [0.69, 0.99, 0.10, 0.75], [0.04, 0.30, 0.08, 0.6], [0.97, 0.70, 0.08, 0.6],
  ].map(([x, y, r, h]) => [x * W, y * H, r * W, h]);
  const ph = Array.from({ length: 4 }, () => R() * 6.28);
  return (x, y) => {
    let v = 0;
    for (const [cx, cy, r, h] of hills) { const d2 = ((x - cx) ** 2 + (y - cy) ** 2) / (r * r); v += h * Math.exp(-d2); }
    v += 0.13 * Math.sin(x * 0.011 + ph[0]) * Math.cos(y * 0.013 + ph[1]) + 0.07 * Math.sin((x + y) * 0.023 + ph[2]) + 0.04 * Math.cos(x * 0.041 - y * 0.017 + ph[3]);
    const dx = (x - blank.cx) / blank.rx, dy = (y - blank.cy) / blank.ry;
    return v * smooth(0.92, 1.42, Math.hypot(dx, dy));
  };
}

function contours(W, H, f, levels, step) {
  const nx = Math.ceil(W / step) + 1, ny = Math.ceil(H / step) + 1;
  const g = new Float64Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) g[j * nx + i] = f(i * step, j * step);
  const out = [];
  for (const level of levels) {
    const segs = [];
    const interp = (x1, y1, v1, x2, y2, v2) => { const t = (level - v1) / (v2 - v1); return [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t]; };
    for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const x = i * step, y = j * step;
      const a = g[j * nx + i], b = g[j * nx + i + 1], c = g[(j + 1) * nx + i + 1], d = g[(j + 1) * nx + i];
      const idx = (a > level ? 8 : 0) | (b > level ? 4 : 0) | (c > level ? 2 : 0) | (d > level ? 1 : 0);
      if (idx === 0 || idx === 15) continue;
      const T = interp(x, y, a, x + step, y, b), Rr = interp(x + step, y, b, x + step, y + step, c);
      const B = interp(x, y + step, d, x + step, y + step, c), L = interp(x, y, a, x, y + step, d);
      const table = { 1: [[L, B]], 2: [[B, Rr]], 3: [[L, Rr]], 4: [[T, Rr]], 5: [[L, T], [B, Rr]], 6: [[T, B]], 7: [[L, T]],
        8: [[L, T]], 9: [[T, B]], 10: [[L, B], [T, Rr]], 11: [[T, Rr]], 12: [[L, Rr]], 13: [[B, Rr]], 14: [[L, B]] };
      for (const s of table[idx]) segs.push(s);
    }
    // Join segments into polylines.
    const key = (p) => `${Math.round(p[0] * 4)},${Math.round(p[1] * 4)}`;
    const ends = new Map();
    segs.forEach((s, k) => { for (const e of [0, 1]) { const kk = key(s[e]); if (!ends.has(kk)) ends.set(kk, []); ends.get(kk).push(k); } });
    const used = new Uint8Array(segs.length);
    for (let k = 0; k < segs.length; k++) {
      if (used[k]) continue;
      used[k] = 1;
      const line = [segs[k][0], segs[k][1]];
      for (const dir of [1, 0]) {
        for (;;) {
          const tip = dir ? line[line.length - 1] : line[0];
          const next = (ends.get(key(tip)) || []).find((n) => !used[n]);
          if (next === undefined) break;
          used[next] = 1;
          const s = segs[next];
          const p = key(s[0]) === key(tip) ? s[1] : s[0];
          if (dir) line.push(p); else line.unshift(p);
        }
      }
      if (line.length > 5) out.push({ level, line });
    }
  }
  return out;
}

function pathFromLine(line) {
  // Quadratic smoothing through segment midpoints.
  const pts = line.filter((p, i) => i === 0 || i === line.length - 1 || i % 2 === 0);
  if (pts.length < 3) return "";
  let d = `M${r1(pts[0][0])} ${r1(pts[0][1])}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const m = [(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2];
    d += `Q${r1(pts[i][0])} ${r1(pts[i][1])} ${r1(m[0])} ${r1(m[1])}`;
  }
  const last = pts[pts.length - 1];
  return d + `L${r1(last[0])} ${r1(last[1])}`;
}

function smoothRoute(points) {
  let d = `M${r1(points[0][0])} ${r1(points[0][1])}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)], p1 = points[i], p2 = points[i + 1], p3 = points[Math.min(points.length - 1, i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${r1(c1[0])} ${r1(c1[1])} ${r1(c2[0])} ${r1(c2[1])} ${r1(p2[0])} ${r1(p2[1])}`;
  }
  return d;
}

const label = (x, y, text, size, extra = "") =>
  `<text x="${r1(x)}" y="${r1(y)}" font-size="${size}" ${extra}>${text}</text>`;

// ------------------------------------------------------------ inside print
// Map units: the unfolded sheet is 1000 wide. Gatefold doors are 0–250 and
// 750–1000; the centre pane is 250–750. Rows split at H/2.
function insidePrint(variant) {
  const W = 1000, H = variant === "tall" ? 1250 : 700;
  const blank = variant === "tall" ? { cx: 500, cy: H / 2, rx: 185, ry: 400 } : { cx: 500, cy: H / 2, rx: 190, ry: 205 };
  const f = field(W, H, blank);
  const levels = Array.from({ length: 12 }, (_, i) => 0.26 + i * 0.12);
  const lines = contours(W, H, f, levels, 7);
  const inset = 16;
  let contoursSvg = "";
  for (const { level, line } of lines) {
    const d = pathFromLine(line);
    if (!d) continue;
    const index = Math.round((level - 0.26) / 0.12) % 4 === 2;
    contoursSvg += `<path d="${d}" class="${index ? "ci" : "c"}"/>`;
  }
  const P = (x, y) => [x * W, y * H];
  const { route, waypoints: stops, scale: s } = mapGeometry(variant);
  const routeD = smoothRoute(route);
  const lake = P(0.115, 0.73);
  const compass = P(0.905, 0.6);
  const ticks = [];
  for (let x = 50; x < W; x += 50) ticks.push(`M${x} ${inset}v${x % 250 === 0 ? 10 : 5}M${x} ${H - inset}v-${x % 250 === 0 ? 10 : 5}`);
  for (let y = 50; y < H; y += 50) ticks.push(`M${inset} ${y}h${y % 250 === 0 ? 10 : 5}M${W - inset} ${y}h-${y % 250 === 0 ? 10 : 5}`);
  const tb = P(0.765, variant === "tall" ? 0.915 : 0.875);
  return `<g id="print-${variant}">
<g clip-path="url(#neat-${variant})">
<ellipse cx="${r1(lake[0])}" cy="${r1(lake[1])}" rx="${r1(52 * s)}" ry="${r1(30 * s)}" class="water" transform="rotate(-14 ${r1(lake[0])} ${r1(lake[1])})"/>
<g class="contours">${contoursSvg}</g>
<path d="${routeD}" class="route-halo"/><path d="${routeD}" class="route"/>
${stops.map(({center: [x,y],radius,label: l,number}) => `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(radius)}" class="stop"/><text x="${r1(l.x)}" y="${r1(l.y)}" text-anchor="${l.anchor}" font-size="${r1(10 * s)}" class="stopn">0${number}</text>`).join("")}

<path d="M${r1(route[12][0])} ${r1(route[12][1] - 13 * s)}l${r1(9 * s)} ${r1(15 * s)}h${r1(-18 * s)}Z" class="peak"/>
</g>
<rect x="${inset}" y="${inset}" width="${W - inset * 2}" height="${H - inset * 2}" class="neat"/>
<path d="${ticks.join("")}" class="tick"/>
${label(route[0][0] + 20 * s, Math.min(H - 20, route[0][1] + 20 * s), "Trailhead", r1(15 * s), 'class="place"')}
${label(route[4][0] + 14 * s, route[4][1] + 4 * s, "Base camp", r1(13 * s), 'class="place"')}
${label(route[8][0] - 30 * s, route[8][1] + 26 * s, "High pass", r1(13 * s), 'class="place"')}
${label(route[12][0] - 74 * s, route[12][1] + 26 * s, "Summit", r1(15 * s), 'class="place"')}
${label(lake[0] - 28 * s, lake[1] + 4 * s, "Mirror Lake", r1(10 * s), 'class="water-label"')}
<g transform="translate(${r1(compass[0])} ${r1(compass[1])}) scale(${s})" class="compass"><circle r="20"/><path d="M0 -26 L6 0 L0 6 L-6 0Z" class="needle"/><path d="M0 26 L6 0 L-6 0Z"/><text y="-31" font-size="11" text-anchor="middle">N</text></g>
<g transform="translate(${r1(tb[0])} ${r1(tb[1])}) scale(${s})" class="titleblock">
<path d="M0 -14h100M0 -14v-5M25 -14v-3M50 -14v-5M75 -14v-3M100 -14v-5" class="scale"/><text y="-24" font-size="8">0</text><text x="96" y="-24" font-size="8">1 MI</text>
<text y="6" font-size="13" class="tb-title">SUMMIT TRAIL</text><text y="22" font-size="9" class="tb-sub">SHEET 01 · 1:24 000</text></g>
</g>
<clipPath id="neat-${variant}"><rect x="${inset}" y="${inset}" width="${W - inset * 2}" height="${H - inset * 2}"/></clipPath>`;
}

// ------------------------------------------------------- cover and legend
function cover(variant) {
  const W = 500, H = variant === "tall" ? 625 : 350;
  const band = variant === "tall" ? 150 : 104;
  const cy = variant === "tall" ? 350 : 196, k = variant === "tall" ? 1.3 : 0.78;
  return `<g id="cover-${variant}">
<path d="M28 ${band - 26}h40" stroke="${COPPER}" stroke-width="2"/>
<text x="28" y="${band - 50}" class="cv-kicker" font-size="${r1(13 * k)}">TRAIL MAP · NO. 01</text>
<text x="${W - 28}" y="${band - 50}" class="cv-kicker" font-size="${r1(13 * k)}" text-anchor="end">FOLD HERE ↓</text>
<g transform="translate(${W / 2} ${cy}) scale(${k})" class="cv-art">
<path d="M-150 60 L-72 -20 L-40 10 L12 -64 L58 -6 L84 -30 L150 60" class="cv-ridge"/>
<path d="M-118 60 L-72 12 M-30 60 L12 -24 L40 10 M70 60 L84 26" class="cv-ridge thin"/>
<path d="M-140 58 C-90 40 -70 50 -40 32 S 0 -10 12 -54" class="cv-route"/>
<path d="M12 -76 l7 12 h-14z" fill="${COPPER}"/>
</g>
<text x="${W / 2}" y="${H - (variant === "tall" ? 96 : 52)}" text-anchor="middle" class="cv-title" font-size="${r1(30 * k)}">Trailhead to Summit</text>
<text x="${W / 2}" y="${H - (variant === "tall" ? 62 : 26)}" text-anchor="middle" class="cv-foot" font-size="${r1(10 * k)}">CONTOUR INTERVAL 40 FEET</text>
</g>`;
}

function legend(variant, waypoints) {
  const H = variant === "tall" ? 625 : 350, k = variant === "tall" ? 1.25 : 1;
  const rows = (items, y0) => items.map(([n, name], i) => `<text x="22" y="${r1(y0 + i * 40 * k)}" class="lg-n" font-size="${r1(11 * k)}">${n}</text><text x="52" y="${r1(y0 + i * 40 * k)}" class="lg-t" font-size="${r1(14 * k)}">${name}</text>`).join("");
  const wp = waypoints.map((w) => [String(w[0]).padStart(2, "0"), w[1].replace("Membership Inference Attack Study", "Membership Inference")]);
  return {
    lt: `<g id="lg-lt-${variant}"><text x="22" y="${r1(44 * k)}" class="lg-h" font-size="${r1(12 * k)}">LEGEND</text>
<path d="M22 ${r1(80 * k)}h46" class="route"/><text x="80" y="${r1(84 * k)}" class="lg-t" font-size="${r1(13 * k)}">Summit trail</text>
<path d="M22 ${r1(120 * k)}c12 -8 22 8 46 0" class="ci"/><text x="80" y="${r1(124 * k)}" class="lg-t" font-size="${r1(13 * k)}">Index contour</text>
<circle cx="45" cy="${r1(158 * k)}" r="6" class="stop"/><text x="80" y="${r1(163 * k)}" class="lg-t" font-size="${r1(13 * k)}">Waypoint</text>
<path d="M45 ${r1(188 * k)}l9 15h-18z" class="peak"/><text x="80" y="${r1(202 * k)}" class="lg-t" font-size="${r1(13 * k)}">Summit</text></g>`,
    lb: `<g id="lg-lb-${variant}"><text x="22" y="${r1(44 * k)}" class="lg-h" font-size="${r1(12 * k)}">BEFORE YOU SET OUT</text>
<text x="22" y="${r1(84 * k)}" class="lg-i" font-size="${r1(15 * k)}">Start at the trailhead.</text><text x="22" y="${r1(108 * k)}" class="lg-i" font-size="${r1(15 * k)}">Six waypoints mark</text><text x="22" y="${r1(132 * k)}" class="lg-i" font-size="${r1(15 * k)}">the way up.</text>
<g transform="translate(125 ${r1(H - 70 * k)}) scale(${k})" class="compass"><circle r="18"/><path d="M0 -24 L5 0 L0 5 L-5 0Z" class="needle"/><path d="M0 24 L5 0 L-5 0Z"/></g></g>`,
    rt: `<g id="lg-rt-${variant}"><text x="22" y="${r1(44 * k)}" class="lg-h" font-size="${r1(12 * k)}">WAYPOINTS</text>${rows(wp.slice(0, 3), 84 * k)}</g>`,
    rb: `<g id="lg-rb-${variant}">${rows(wp.slice(3), 50 * k)}<text x="22" y="${r1(H - 34 * k)}" class="lg-n" font-size="${r1(11 * k)}">SUMMIT · CONTACT</text></g>`,
  };
}

export { insidePrint, cover, legend };
````

### `app/layout.tsx`

Font loading, prepaint scripts, opening and stylesheet registration.

Full file (52 lines).

````tsx
import type { Metadata } from "next";
import { Manrope, Newsreader } from "next/font/google";
import { Splash } from "../components/splash/Splash";
import { SPLASH_GATE_SCRIPT } from "../components/splash/gate";
import { professionalDescription, siteUrl } from "../content/site";
import { ThemeProvider } from "../components/theme/ThemeProvider";
import { THEME_SCRIPT } from "../components/theme/prepaint";

import "./globals.css";
import "./theme.css";
import "../components/theme/theme.css";
import "../components/splash/splash.css";
import "../components/splash/motion.generated.css";
import "../components/hero/hero.css";

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: "Diego Martinez — Software Engineer",
  description: professionalDescription,
  authors: [{ name: "Diego Martinez" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light" className={`${newsreader.variable} ${manrope.variable}`} suppressHydrationWarning>
      <head>
        <script id="theme-restore" dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <script id="splash-gate" dangerouslySetInnerHTML={{ __html: SPLASH_GATE_SCRIPT }} />
      </head>
      <body>
        <Splash />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
````

### `app/page.tsx`

Homepage composition and Climb entry point.

Full file (53 lines).

````tsx
import { PortfolioHeader } from "../components/portfolio-shell";
import { ListNavigation } from "../components/list-navigation";
import { JourneyTrail } from "../components/about/JourneyTrail";
import { ListView } from "../components/list-view";
import { journeySections } from "../content/journey";
import { Climb } from "../components/climb/Climb";
import { ViewToggle } from "../components/climb/ViewToggle";
import { MountainArt } from "../components/climb/Mountain";
import { StopCards } from "../components/climb/StopCards";
import { WaypointContent } from "../components/waypoint-content";
import { caseStudySlots } from "../components/climb/CaseStudies";
import { waypoints } from "../content/waypoints";
import { homeMetadata } from "../content/site";

import "./ascent.css";
import "../components/about/about.css";

export const metadata = homeMetadata;

const homeNavigation = [
  { href: "#about", label: "About" },
  { href: "#work", label: "Work" },
  { kind: "resume", label: "Resume" },
  { href: "#summit", label: "Contact" },
] as const;

export default function Home() {
  return (
    <Climb mountain={<MountainArt />} cards={<StopCards />}
      header={<PortfolioHeader
        homeHref="#trailhead"
        homeAriaLabel="Diego Martinez, home"
        links={homeNavigation}
        navLabel="Primary navigation"
        action={<ViewToggle />}
      />}
      summaries={Object.fromEntries(waypoints.map((waypoint) => [waypoint.slug,
        <WaypointContent key={waypoint.slug} waypoint={waypoint} titleId={`panel-${waypoint.slug}-title`} />]))}
      cases={caseStudySlots("panel-case-")}>
      <ListNavigation sections={journeySections}>
        <main id="main-content">
          <ListView />
          <JourneyTrail />
        </main>
      </ListNavigation>

      <footer>
        <p>© {new Date().getFullYear()} Diego Martinez</p>
        <a href="#trailhead">Back to the trailhead ↑</a>
      </footer>
    </Climb>
  );
}
````

### `components/climb/ViewToggle.tsx`

Real user view controls and state context.

Full file (26 lines).

````tsx
"use client";

import { createContext, useContext } from "react";

export const ViewContext = createContext<{
  enhanced: boolean;
  listMode: boolean;
  toggleView: () => void;
} | null>(null);

export function ViewToggle() {
  const view = useContext(ViewContext);
  if (!view) return null;

  return (
    <button type="button" className="climb-view-toggle" data-list-mode={view.listMode}
      hidden={!view.enhanced} onClick={view.toggleView}
      aria-controls={view.listMode ? "climb" : "list-view"}>
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        {view.listMode ? <><path d="m3 19 7-13 4 7 2-3 5 9Z" /><path d="m8 10 2 2 2-2" /></>
          : <><path d="M9 6h12M9 12h12M9 18h12" /><path d="M3 6h1M3 12h1M3 18h1" /></>}
      </svg>
      {view.listMode ? "Climb view" : "List view"}
    </button>
  );
}
````

### `components/climb/Climb.tsx`

Opening imports, mode defaults, cancellation, hash recovery, view-switch callbacks and scene roots.

Excerpt — lines 1–44.

````tsx
"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { MouseEvent, ReactNode, PointerEvent, FocusEvent, KeyboardEvent } from "react";
import { journeyStops } from "../../content/journey";
import { createHudRenderer } from "./hud";
import { createMountainRenderer } from "./mountain/render";
import { observeMountainMotion } from "./mountain/motion";
import { Snow } from "./Snow";
import { AmbientSound } from "./AmbientSound";
import type { AmbientSoundController } from "./AmbientSound";
import type { SnowController } from "./Snow";
import { TrailRail } from "./TrailRail";
import type { ClimbFrame } from "./progress";
import { useClimbProgress } from "./useClimbProgress";
import { createEnvironmentRenderer } from "./environment";
import { Sky } from "./Sky";
import { useTheme } from "../theme/ThemeProvider";
import { Markers } from "./Markers";
import { createMarkerRenderer, setLandmarkHot } from "./marker-render";
import { WaypointPanel } from "./WaypointPanel";
import type { PanelSelection } from "./WaypointPanel";
import { ViewContext } from "./ViewToggle";
import { canEnhanceClimb, observeClimbQuality, watchClimbPerformance } from "./quality";
import type { ClimbQuality } from "./quality";
import { SceneRecovery } from "./SceneRecovery";
import { sceneCleanup, sceneTask } from "./recovery";
import { createClimbTransition, createListTransition } from "../splash/controller";
import type { SplashController } from "../splash/controller";

import "./climb.css";
import "./sky.css";

function traceStartup(step: string, detail?: unknown) {
  if (process.env.NODE_ENV === "development") console.warn("[DEBUG-climb-startup]", step, detail);
}

function listTarget() {
  try {
    const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    return target?.closest(".climb-list") ? target : null;
  } catch { return null; }
}
````

Excerpt — lines 55–65.

````tsx
export function Climb({ children, header, mountain, cards, summaries, cases }: {
  children: ReactNode; header: ReactNode; mountain: ReactNode; cards: ReactNode; summaries: Record<string, ReactNode>; cases: Record<string, ReactNode>;
}) {
  // The complete server-rendered List View is visible until enhancement succeeds.
  const [enhanced, setEnhanced] = useState(false);
  const { controller: theme } = useTheme();
  const currentTheme = useRef(theme);
  useLayoutEffect(() => { currentTheme.current = theme; }, [theme]);
  const [listMode, setListMode] = useState(true);
  const [selection, setSelection] = useState<PanelSelection | null>(null);
  const [quality, setQuality] = useState<ClimbQuality>("full");
````

Excerpt — lines 85–114.

````tsx
  const viewTransition = useRef<SplashController | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; viewTransition.current?.skip(); };
  }, []);

  const revealList = useCallback(() => {
    if (!activeClimb.current) return;
    lastClimbScroll.current = window.scrollY;
    const selected = reading.current;
    const stop = selected?.stop ?? lastRenderedStop.current;
    const id = journeyStops[stop]?.id ?? "list-view";
    const target = listTarget()?.id ?? (selected?.caseStudy ? `case-${id}` : id);
    // Native hash navigation activates CSS :target Case Studies; replaceState
    // changes the URL but does not update :target in Chromium.
    activeClimb.current = false;
    location.replace(`#${target}`);
    focusList.current = target;
    pendingFocus.current = null;
    setSelection(null);
    setListMode(true);
  }, []);

  const failScene = useCallback(() => {
    traceStartup("scene recovery", new Error("Climb recovery caller").stack);
    revealList();
    setListMode(true);
    setEnhanced(false);
  }, [revealList]);
````

Excerpt — lines 189–259.

````tsx
  useEffect(() => {
    traceStartup("checking capabilities", { ready: document.readyState, hidden: document.hidden });
    if (!canEnhanceClimb()) {
      traceStartup("capability check failed", {
        resize: typeof ResizeObserver, mutation: typeof MutationObserver, point: typeof DOMPoint,
        raf: typeof requestAnimationFrame, media: typeof matchMedia, animations: typeof Element.prototype.getAnimations,
        cancelRaf: typeof cancelAnimationFrame,
        pointMatrix: typeof DOMPoint === "undefined" ? "undefined" : typeof DOMPoint.prototype.matrixTransform,
        bbox: typeof SVGGraphicsElement === "undefined" ? "undefined" : typeof SVGGraphicsElement.prototype.getBBox,
        pause: typeof SVGSVGElement === "undefined" ? "undefined" : typeof SVGSVGElement.prototype.pauseAnimations,
        unpause: typeof SVGSVGElement === "undefined" ? "undefined" : typeof SVGSVGElement.prototype.unpauseAnimations,
        dialogShow: typeof HTMLDialogElement === "undefined" ? "undefined" : typeof HTMLDialogElement.prototype.show,
        dialogClose: typeof HTMLDialogElement === "undefined" ? "undefined" : typeof HTMLDialogElement.prototype.close,
      });
      return;
    }
    let preference: MediaQueryList;
    try {
      preference = matchMedia("(prefers-reduced-motion: reduce)");
      if (typeof preference.matches !== "boolean" || typeof preference.addEventListener !== "function"
        || typeof preference.removeEventListener !== "function") {
        traceStartup("invalid motion query");
        return;
      }
    }
    catch (error) { traceStartup("motion query failed", error); return; } // The durable List View is already visible at startup.
    let stopQuality: (() => void) | undefined;
    let raf = 0;
    const motionChange = sceneTask(failScene, () => {
      if (preference.matches) { viewTransition.current?.skip(); revealList(); }
    });
    function hashChange() {
      const target = listTarget();
      if (!target) return;
      // Cancel before revealing the reading destination: skip() would finish
      // the old transition and could hide List View or overwrite this hash.
      viewTransition.current?.dispose();
      viewTransition.current = null;
      if (activeClimb.current) {
        lastClimbScroll.current = window.scrollY;
      }
      focusList.current = false;
      pendingFocus.current = null;
      flushSync(() => { setListMode(true); setSelection(null); });
      // A cancelled entry can leave List View already visible, so its view
      // effect need not rerun. Restore the fragment's scroll and focus here.
      target.scrollIntoView({ behavior: "instant" });
      if (!target.matches("a, button, [tabindex]")) target.tabIndex = -1;
      target.focus({ preventScroll: true });
    }
    const cleanup = sceneCleanup(failScene,
      () => cancelAnimationFrame(raf),
      () => window.removeEventListener("hashchange", hashChange),
      () => preference.removeEventListener("change", motionChange),
      () => stopQuality?.());
    try {
      raf = requestAnimationFrame(() => {
        traceStartup("initialization frame entered");
        try {
          stopQuality = observeClimbQuality(lighten);
          setListMode(true);
          setEnhanced(true);
          traceStartup("enhancement enabled", { listTarget: listTarget()?.id, reducedMotion: preference.matches });
        } catch (error) { traceStartup("initialization frame failed", error); failScene(); }
      });
      traceStartup("initialization frame scheduled", raf);
      window.addEventListener("hashchange", hashChange);
      preference.addEventListener("change", motionChange);
    } catch (error) { traceStartup("startup listeners failed", error); cleanup(); return; }
    return cleanup;
  }, [revealList, lighten, failScene]);
````

Excerpt — lines 289–308.

````tsx
    activeClimb.current = enhanced && !listMode;
    if (!enhanced && !focusList.current) return;
    const snowController = snow.current;
    const raf = requestAnimationFrame(() => {
      if (listMode) {
        const target = listTarget();
        target?.scrollIntoView();
        if (focusList.current) {
          const focus = typeof focusList.current === "string" ? document.getElementById(focusList.current)
            : target?.matches("a, button, [tabindex]") ? target : document.getElementById("list-view");
          if (focus && !focus.matches("a, button, [tabindex]")) focus.tabIndex = -1;
          focus?.focus({ preventScroll: true });
          focusList.current = false;
        }
      } else {
        window.scrollTo({ top: lastClimbScroll.current, behavior: "instant" });
      }
    });
    return () => { cancelAnimationFrame(raf); snowController?.setWeather(0, true); };
  }, [enhanced, listMode]);
````

Excerpt — lines 332–365.

````tsx
  useLayoutEffect(() => {
    // The hidden scene may have idled through a whole theme change. Update it
    // before revealing it, including a view switch in the middle of a blend.
    if (listMode || !theme) return;
    sceneTask(failScene, () => renderers.current?.weather(lastPosition.current, theme.blend()))();
  }, [enhanced, listMode, theme, failScene]);

  function toggleView() {
    pendingFocus.current = null;
    setSelection(null);
    if (listMode) {
      history.replaceState(null, "", location.pathname + location.search);
      viewTransition.current?.skip();
      viewTransition.current = createClimbTransition(() => {
        // The page switches underneath opaque paper. Flush the React update so
        // the controller can measure the newly visible scene on this clock.
        if (mounted.current) flushSync(() => setListMode(false));
      }, sceneTask(failScene, () => {
        // Stage translation changes screen clipping without changing scroll
        // geometry. Refresh keyboard targets after that translation is removed.
        if (lastFrame.current && activeClimb.current) renderers.current?.markers.render(lastFrame.current);
      }));
    } else {
      viewTransition.current?.skip();
      lastClimbScroll.current = window.scrollY;
      viewTransition.current = createListTransition(() => {
        if (!mounted.current) return;
        focusList.current = true;
        history.replaceState(null, "", "#list-view");
        flushSync(() => setListMode(true));
        window.scrollTo({ top: 0, behavior: "instant" });
      });
    }
  }
````

Excerpt — lines 434–476.

````tsx
  return (
    <ViewContext.Provider value={{ enhanced, listMode, toggleView }}>
      <AmbientSound ref={ambience} active={enhanced && !listMode}>
      {/* Keep navigation outside both reading modes and scene recovery. */}
      <div className="portfolio-navigation" ref={navigation}
        onClickCapture={(event) => sceneTask(failScene, navigateHeader)(event)}>
        <a data-theme-root="" className="skip-link climb-skip" href={listMode ? "#main-content" : "#list-view"}>
          {listMode ? "Skip to content" : "Skip to full text"}
        </a>
        {header}
      </div>
      <div data-theme-root="" className="climb-list" hidden={!listMode}>{children}</div>
      {enhanced && <SceneRecovery onFailure={failScene}><div className="climb-enhancement" hidden={listMode} data-quality={quality}>
        <main className="climb" id="climb" ref={root} style={{ height: `${journeyStops.length * 100}vh` }}
          onClick={(event) => sceneTask(failScene, navigate)(event)}
          onKeyDown={(event) => sceneTask(failScene, activateLandmark)(event)}>
          <div className="climb-stage" ref={stage} data-panel-open={selection !== null}
            onPointerOver={(event) => sceneTask(failScene, () => highlight(event, true))()}
            onPointerOut={(event) => sceneTask(failScene, () => highlight(event, false))()}
            onFocus={(event) => sceneTask(failScene, () => highlight(event, true))()}
            onBlur={(event) => sceneTask(failScene, () => highlight(event, false))()}>
            <Sky />
            <div className="climb-scene">
            {mountain}
            <div className="climb-haze" aria-hidden="true" />
            {quality === "full" && <Snow ref={snow} />}
            <Markers openStop={selection?.stop ?? null} />
            </div>
            <div className="climb-navigation" inert={selection !== null}>{cards}<TrailRail /></div>
            <WaypointPanel selection={selection} summaries={summaries} cases={cases} onClose={closePanel}
              onDismissed={finishDismissal}
              onCase={(caseStudy) => {
                if (!reading.current) return;
                reading.current = { ...reading.current, caseStudy };
                setSelection(reading.current);
              }} />
          </div>
        </main>
      </div></SceneRecovery>}
      </AmbientSound>
    </ViewContext.Provider>
  );
}
````

### `components/hero/reveal.ts`

Decorative greeting reveal and real heading handoff.

Full file (45 lines).

````ts
import { BRAND, brandGreeting } from "./brand";

type Add = (target: Element | null, frames: Keyframe[], timing: KeyframeAnimationOptions) => Animation | null;

function letters(copy: HTMLElement) {
  for (const word of copy.querySelectorAll<HTMLElement>(".splash-word")) {
    const text = word.firstChild!, box = word.getBoundingClientRect();
    const positions = [...(text.textContent ?? "")].map((character, i) => {
      const range = document.createRange(); range.setStart(text, i); range.setEnd(text, i + 1);
      return { character, left: range.getBoundingClientRect().left - box.left };
    });
    const size = document.createElement("span"); size.textContent = text.textContent; size.style.visibility = "hidden";
    word.replaceChildren(size);
    for (const { character, left } of positions) {
      const span = document.createElement("span"); span.className = "hero-reveal-letter";
      span.textContent = character;
      Object.assign(span.style, { position: "absolute", left: `${left}px`, top: "0", display: "inline-block" });
      word.append(span);
    }
  }
}

export function revealGreeting(paper: HTMLElement, page: HTMLElement, add: Add, start: number) {
  add(paper, [{ opacity: 0 }, { opacity: 1 }], { delay: start, duration: 1, fill: "both" });
  letters(paper);
  page.replaceChildren(...[...paper.childNodes].map(node => node.cloneNode(true)));
  brandGreeting(paper, start, add, true);
  brandGreeting(page, start, add, false);
  const end = start + BRAND.settle;
  // Restore the entire shaped heading before the paper handoff, including
  // kerning across React text-node boundaries (such as the y and comma).
  for (const copy of [paper, page]) {
    const lines = [...copy.children];
    const complete = copy.ownerDocument.createElement("span");
    Object.assign(complete.style, { position: "absolute", inset: "0" });
    complete.append(...[...document.getElementById("trailhead-title")!.childNodes].map(node => node.cloneNode(true)));
    copy.append(complete);
    add(complete, [{ opacity: 0 }, { opacity: 1 }], { delay: end, duration: 1, fill: "both" });
    lines.forEach(line => add(line,
      [{ opacity: 1 }, { opacity: 0 }], { delay: end, duration: 1, fill: "forwards" }));
  }
  document.querySelectorAll("#trailhead .trailhead-lead, #trailhead .trailhead-actions").forEach(target => add(target,
    [{ opacity: 0, translate: "0 5px" }, { opacity: 1, translate: "0 0" }],
    { delay: end, duration: 320, easing: "cubic-bezier(0.2, 0.7, 0.3, 1)" }));
}
````

### `components/hero/brand.ts`

Per-letter branding animation used by the reveal.

Full file (125 lines).

````ts
// "Branding iron" greeting. Two presses — "Howdy," then "I'm Diego." —
// each lands white-hot, sinks into the paper, throws sparks and a smoke wisp,
// then cools to ink and stays debossed. Heat, sparks, smoke and scorch fade
// before the settle; the deboss is kept, and the real <h1> carries the same
// --brand-deboss shadow, so the swap has no jump.
type Add = (target: Element | null, frames: Keyframe[], timing: KeyframeAnimationOptions) => Animation | null;

export const BRAND = {
  presses: [120, 900], // ms after greeting start, one per line — a full beat between them
  cool: 720,           // hot → ink, per letter
  stagger: 26,         // cooling sweeps left → right
  settle: 2150,        // every glow, spark and halo is gone; only the deboss remains
};

const HOT = ["#ffe3a0", "#ffb24d", "#e8661f", "#9a3412", "#5a2312"];
// A tight orange rim keeps the white-hot first frame legible on cream paper.
const GLOW = "0 0 0.015em rgba(235,110,30,0.95), 0 0 0.12em rgba(255,140,40,0.7), 0 0 0.4em rgba(255,90,20,0.38)";
const WARM = "0 0 0.03em rgba(255,170,80,0.35), 0 0 0.12em rgba(230,90,30,0.22), 0 0 0.3em rgba(200,60,20,0.08)";
// Fallback only: hero.css defines --brand-deboss per surface (paper, light page, dark page).
const DEBOSS = "0 -0.012em 0 rgba(40,15,5,0.42), 0 0.016em 0 rgba(255,250,235,0.7), 0 0 0 transparent";

// Same sparks and smoke on every replay, so the two map entries render consistently.
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function piece(line: HTMLElement, className: string, box: { left: number; top: number; width: number; height: number }) {
  const el = line.ownerDocument.createElement("span");
  el.className = className;
  el.setAttribute("aria-hidden", "true");
  Object.assign(el.style, { left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px`, height: `${box.height}px` });
  line.append(el);
  return el;
}

/**
 * copy: a greeting copy already split into `.hero-reveal-letter` spans
 * inside `.trailhead-title-line`s. decorate: add heat, scorch, sparks and smoke
 * (only the visible paper copy needs them).
 */
export function brandGreeting(copy: HTMLElement, start: number, add: Add, decorate: boolean) {
  const style = getComputedStyle(copy), ink = style.color;
  const deboss = style.getPropertyValue("--brand-deboss").trim() || DEBOSS;
  const end = start + BRAND.settle;
  const lines = [...copy.querySelectorAll<HTMLElement>(".trailhead-title-line")];
  lines.forEach((line, index) => {
    const press = start + BRAND.presses[index];
    const letters = [...line.querySelectorAll<HTMLElement>(".hero-reveal-letter")];
    const sink = index === 0 ? 0.985 : 0.98;
    letters.forEach((letter, i) => {
      letter.style.transformOrigin = "50% 80%";
      const cooled = BRAND.cool + i * BRAND.stagger, total = end - press;
      add(letter, [{ opacity: 0 }, { opacity: 1 }], { delay: press, duration: 40, fill: "both" });
      add(letter, [{ transform: "scale(1.035)" }, { transform: `scale(${sink})`, offset: 0.45 }, { transform: "scale(1)" }],
        { delay: press, duration: 320, easing: "cubic-bezier(0.3, 0, 0.2, 1)", fill: "both" });
      add(letter, [
        { color: HOT[0] }, { color: HOT[1], offset: 0.12 }, { color: HOT[2], offset: 0.32 },
        { color: HOT[3], offset: 0.55 }, { color: HOT[4], offset: 0.75 }, { color: ink },
      ], { delay: press + i * BRAND.stagger, duration: BRAND.cool, easing: "linear", fill: "both" });
      add(letter, [
        { textShadow: GLOW },
        { textShadow: WARM, offset: Math.min(0.9, (cooled * 0.45) / total) },
        { textShadow: deboss, offset: Math.min(0.95, cooled / total) },
        { textShadow: deboss },
      ], { delay: press, duration: total, easing: "ease-out", fill: "both" });
    });
    if (!decorate || !letters.length) return;

    // Layout units (offset*), not client rects: the paper copy sits under the zoomed camera.
    line.style.position = "relative";
    const h = line.offsetHeight;
    const spots = letters.map(letter => {
      const word = letter.offsetParent as HTMLElement | null;
      const x = (word && word !== line ? word.offsetLeft : 0) + letter.offsetLeft;
      return { x, w: letter.offsetWidth };
    });
    const minX = Math.min(...spots.map(s => s.x)), maxX = Math.max(...spots.map(s => s.x + s.w));
    const width = maxX - minX;

    const heat = piece(line, "hero-brand-heat", { left: minX - h * 0.3, top: -h * 0.15, width: width + h * 0.6, height: h * 1.3 });
    add(heat, [{ opacity: 0 }, { opacity: 1, offset: 120 / 380 }, { opacity: 0 }], { delay: press - 120, duration: 380, easing: "ease-out", fill: "both" });

    const scorch = piece(line, "hero-brand-scorch", { left: minX - h * 0.2, top: -h * 0.05, width: width + h * 0.4, height: h * 1.1 });
    const life = end - press;
    add(scorch, [
      { opacity: 0, transform: "scale(0.92)" }, { opacity: 1, transform: "scale(1)", offset: 220 / life },
      { opacity: 0.85, transform: "scale(1)", offset: 0.55 }, { opacity: 0, transform: "scale(1.02)" },
    ], { delay: press, duration: life, easing: "ease-out", fill: "both" });

    const random = seeded(17 + index * 101);
    // Sparks: a dense burst on contact plus a few slower, longer-flying embers.
    for (let k = 0; k < 34; k++) {
      const spot = spots[Math.floor(random() * spots.length)];
      const big = k % 6 === 0, size = big ? 3.5 + random() * 2 : 1.5 + random() * 2.4;
      const spark = piece(line, "hero-brand-spark", {
        left: spot.x + spot.w * (0.1 + random() * 0.8), top: h * (0.25 + random() * 0.6), width: size, height: size,
      });
      const reach = big ? 1.6 : 1.1, dx = (random() - 0.5) * h * reach, dy = -h * (0.15 + random() * (big ? 0.7 : 0.45));
      add(spark, [
        { opacity: 1, transform: "translate(0, 0) scale(1)" },
        { opacity: 1, transform: `translate(${dx * 0.6}px, ${dy}px) scale(0.85)`, offset: 0.5 },
        { opacity: 0, transform: `translate(${dx}px, ${dy + h * 0.35}px) scale(0.4)` },
      ], { delay: press + random() * 60, duration: (big ? 620 : 360) + random() * 260, easing: "cubic-bezier(0.2, 0.6, 0.4, 1)", fill: "forwards" });
    }
    for (let k = 0; k < 9; k++) {
      const size = h * (0.75 + random() * 0.5);
      const smoke = piece(line, "hero-brand-smoke", {
        left: minX + width * (0.05 + k * 0.11) - size / 2 + (random() - 0.5) * h * 0.25, top: -h * (0.1 + random() * 0.2), width: size, height: size * 1.4,
      });
      const drift = (random() - 0.3) * h * 0.35;
      const delay = press + 140 + random() * 260;
      const duration = Math.min(1100 + random() * 500, end - delay);
      add(smoke, [
        { opacity: 0, transform: "translate(0, 0) scale(0.5)" },
        { opacity: 1, transform: `translate(${drift * 0.3}px, ${-h * 0.25}px) scale(0.9)`, offset: 0.25 },
        { opacity: 0, transform: `translate(${drift}px, ${-h * 0.9}px) scale(1.7)` },
      ], { delay, duration, easing: "cubic-bezier(0.2, 0.5, 0.3, 1)", fill: "both" });
    }
  });
}
````

### `components/hero/hero.css`

Greeting styling and animation roots.

Full file (34 lines).

````css
/* The paper and page copies must keep their letters inside their own surface. */
.splash-greeting:has(.hero-reveal-letter) { isolation: isolate; }
.hero-reveal-letter { will-change: transform, opacity; z-index: 1; }
/* ---------- Branding iron: decorative pieces on the paper copy only ---------- */
.hero-brand-heat, .hero-brand-scorch, .hero-brand-spark, .hero-brand-smoke { opacity: 0; pointer-events: none; position: absolute; }
.hero-brand-heat { background: radial-gradient(closest-side, rgba(255, 170, 90, 0.5), rgba(255, 140, 60, 0.16) 60%, transparent); z-index: 0; }
.hero-brand-scorch { background: radial-gradient(closest-side, rgba(110, 48, 18, 0.28), rgba(110, 48, 18, 0.1) 55%, transparent); z-index: 0; }
.hero-brand-spark { background: #ffd27a; border-radius: 50%; box-shadow: 0 0 4px 1px rgba(255, 140, 40, 0.8); z-index: 2; }
.hero-brand-smoke { background: radial-gradient(closest-side, rgba(95, 85, 75, 0.17), rgba(95, 85, 75, 0.06) 55%, transparent); z-index: 2; }

/* ---------- Branding iron: kept deboss, strummed contours, nav sound icon ---------- */
/* The letters stay pressed into the page. Three shadows each, so they interpolate. */
[data-theme-root] { --brand-deboss: 0 -0.012em 0 rgba(40, 15, 5, 0.42), 0 0.016em 0 rgba(255, 250, 235, 0.7), 0 0 0 transparent; }
html[data-theme="dark"] [data-theme-root] { --brand-deboss: 0 -0.012em 0 rgba(0, 0, 0, 0.6), 0 0.014em 0 rgba(236, 230, 210, 0.12), 0 0 0 transparent; }
.splash-greeting--paper { --brand-deboss: 0 -0.012em 0 rgba(40, 15, 5, 0.42), 0 0.016em 0 rgba(255, 250, 235, 0.7), 0 0 0 transparent; text-shadow: var(--brand-deboss); }
#trailhead-title { text-shadow: var(--brand-deboss); }
.hero-strings { height: 100%; inset: 0; pointer-events: none; position: absolute; width: 100%; }
/* Keep the paper's line strength stable when the interactive canvas mounts. */
.trailhead-contours { opacity: 0.22; }
.trailhead-surprise { color: var(--ink-label); display: block; font-size: 0.875rem; line-height: 1.5; margin-top: 0.75rem; }
.site-header-controls .hero-sound-toggle {
  align-items: center; background: transparent; border: 1px solid transparent; border-radius: 999px; color: var(--btn-ink); cursor: pointer;
  display: inline-flex; flex: none; height: 44px; justify-content: center; min-width: 44px; padding: 0;
}
.site-header-controls .hero-sound-toggle:hover { background: var(--btn-hover); }
.site-header-controls .hero-sound-toggle:active { background: var(--btn-active); }
.site-header-controls .hero-sound-toggle[aria-pressed="true"] { background: var(--raised); color: var(--ink-accent); }
.site-header-controls .hero-sound-toggle:focus-visible { outline: 3px solid var(--ink-accent); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) {
  .trailhead-contours { opacity: 0.16; }
  .hero-strings, .trailhead-surprise { display: none; }
  .site-header-controls .hero-sound-toggle { visibility: hidden; }
  .hero-reveal-letter { will-change: auto; }
}
````

### `components/theme/ThemeProvider.tsx`

Theme propagation and UI-root boundaries.

Full file (45 lines).

````tsx
"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useState } from "react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { createThemeController } from "./controller";
import type { Theme, ThemeController } from "./controller";
import { applyUiTokens, clearUiTokens } from "./ui-tokens";

const ThemeContext = createContext<{ theme: Theme; controller: ThemeController | null }>({ theme: "light", controller: null });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ theme: Theme; controller: ThemeController | null }>({ theme: "light", controller: null });
  const pathname = usePathname();

  useEffect(() => {
    const controller = createThemeController();
    const roots = () => document.querySelectorAll<HTMLElement>("[data-theme-root]");
    const stop = controller.subscribe((blend, settled) => {
      if (settled) clearUiTokens(roots());
      else applyUiTokens(roots(), blend);
      setState((previous) => previous.controller === controller && previous.theme === controller.theme
        ? previous : { controller, theme: controller.theme });
    });
    // Panels and route content may mount between animation frames. Pin them to
    // the same current palette before the browser paints the added subtree.
    let observer: MutationObserver | undefined;
    const stopObserver = () => { try { observer?.disconnect(); } catch { /* Optional enhancement observation. */ } };
    try {
      if (typeof MutationObserver === "function") {
        observer = new MutationObserver(() => {
          if (!controller.settled) applyUiTokens(roots(), controller.blend());
        });
        observer.observe(document.body, { childList: true, subtree: true });
      }
    } catch { stopObserver(); }
    return () => { stopObserver(); stop(); clearUiTokens(roots()); controller.dispose(); };
  }, []);

  useLayoutEffect(() => { state.controller?.jump(); }, [pathname, state.controller]);

  return <ThemeContext.Provider value={state}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
````

### `components/theme/prepaint.ts`

Persisted theme restoration.

Full file (2 lines).

````ts
// This must run synchronously in the exported head, before content can paint.
export const THEME_SCRIPT = `(()=>{let t="light";try{const s=localStorage.getItem("portfolio-theme");if(s==="light"||s==="dark")t=s}catch{}document.documentElement.dataset.theme=t})()`;
````

### `app/theme.css`

Current light/dark surface tokens.

Full file (61 lines).

````css
/* Generated by npm run theme:generate from components/theme/tokens.json.
   UI roots own settled and animated values; the SVG world inherits neither. */
[data-theme-root] {
  color-scheme: dark;
  --bg: #1a211d;
  --bg-alt: #1e2621;
  --bg-alt-2: #212a25;
  --raised: #252f29;
  --header: #1a211d;
  --deep: #123129;
  --deepest: #121714;
  --btn: #252f29;
  --btn-hover: #2f3a33;
  --btn-active: #1e2621;
  --r-primary: #e9e1cc;
  --r-primary-hover: #fffbed;
  --line: rgba(236,230,210,0.15);
  --line-strong: rgba(236,230,210,0.3);
  --ink: #ece6d2;
  --ink-muted: #bcb8a8;
  --ink-label: #a9c7b5;
  --ink-accent: #e3a983;
  --r-ink: #ece6d2;
  --r-muted: #bcb8a8;
  --r-accent: #e3a983;
  --btn-ink: #ece6d2;
  --r-primary-ink: #173f35;
  --focus-edge: #ece6d2;
}

:root[data-theme="light"] [data-theme-root] {
  color-scheme: light;
  --bg: #f3eedd;
  --bg-alt: #e9e1cc;
  --bg-alt-2: #e1e5d7;
  --raised: #fffbed;
  --header: #f3eedd;
  --deep: #173f35;
  --deepest: #1f2621;
  --btn: #fffbed;
  --btn-hover: #e9e1cc;
  --btn-active: #ddd3ba;
  --r-primary: #173f35;
  --r-primary-hover: #285d4f;
  --line: rgba(31,38,33,0.2);
  --line-strong: rgba(31,38,33,0.34);
  --ink: #1f2621;
  --ink-muted: #4a524b;
  --ink-label: #173f35;
  --ink-accent: #8b4428;
  --r-ink: #1f2621;
  --r-muted: #4a524b;
  --r-accent: #8b4428;
  --btn-ink: #1f2621;
  --r-primary-ink: #fffbed;
  --focus-edge: #1f2621;
}

/* Backing colors are literals, keeping palette variables out of the SVG. */
body { background: #1a211d; }
:root[data-theme="light"] body { background: #f3eedd; }
````

### `content/trailhead.ts`

Canonical heading used by all map overlays.

Full file (11 lines).

````ts
export const trailheadIntro = {
  heading: "Howdy, I'm Diego:",
  lead: "Software engineer, problem solver, and lifelong learner passionate about building technology that makes an impact.",
  body: "From developing intelligent, data-driven applications to teaching others how to code, I love turning ideas into meaningful experiences. Whether I'm exploring AI, building software, or tackling a challenging problem, I'm always looking for ways to learn, create, and grow.",
} as const;

// List View's opening is concise; Climb retains its existing introduction.
export const listTrailheadIntro = {
  heading: "Howdy, I'm Diego.",
  lead: "I’m Diego, a software engineer and a teacher. I build with other people, and I help other people learn to build.",
} as const;
````

### `tests/helpers/splash.ts`

Pause/seek and image-difference helpers; diagnostic limitations.

Full file (64 lines).

````ts
import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import type { SplashElement } from "../../components/splash/controller";

export async function seekIntro(page: Page, time: number, selector = "body > .splash:not(.splash--climb)") {
  const overlay = page.locator(selector);
  await expect.poll(() => overlay.evaluate((el: SplashElement) => {
    if (!el.splashController) return false;
    el.splashController.seek(0);
    return true;
  })).toBe(true);
  await page.evaluate(() => document.fonts.ready);
  await overlay.evaluate((el: SplashElement, time) => el.splashController!.seek(time), time);
}

export async function holdOpening(page: Page) {
  await page.addInitScript(() => {
    const observer = new MutationObserver(() => {
      const overlay = document.querySelector<SplashElement>("body > .splash:not(.splash--climb)");
      if (!overlay?.splashController) return;
      overlay.splashController.seek(0);
      observer.disconnect();
    });
    observer.observe(document, { childList: true, subtree: true, attributes: true });
  });
}

export async function holdNextTransition(page: Page, selector = ".splash--climb") {
  await page.evaluate((selector) => {
    const observer = new MutationObserver(() => {
      const overlay = document.querySelector<SplashElement>(selector);
      if (!overlay?.splashController) return;
      overlay.splashController.seek(0);
      observer.disconnect();
    });
    observer.observe(document.body, { childList: true });
  }, selector);
}

export async function imageDifference(page: Page, before: Buffer, after: Buffer, clip?: { x: number; y: number; width: number; height: number }) {
  return page.evaluate(async ({ before, after, clip }) => {
    const read = async (png: string) => {
      const image = new Image(); image.src = `data:image/png;base64,${png}`; await image.decode();
      const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height;
      const ctx = canvas.getContext("2d")!; ctx.drawImage(image, 0, 0);
      const scale = canvas.width / innerWidth;
      return clip
        ? ctx.getImageData(Math.round(clip.x * scale), Math.round(clip.y * scale), Math.round(clip.width * scale), Math.round(clip.height * scale)).data
        : ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    };
    const a = await read(before), b = await read(after);
    let total = 0, max = 0, changed = 0;
    for (let i = 0; i < a.length; i += 4) {
      let pixel = 0;
      for (let channel = 0; channel < 3; channel++) {
        const delta = Math.abs(a[i + channel] - b[i + channel]);
        total += delta; pixel = Math.max(pixel, delta);
      }
      max = Math.max(max, pixel);
      if (pixel > 8) changed++;
    }
    return { max, mean: total / (a.length / 4 * 3), changedRatio: changed / (a.length / 4) };
  }, { before: before.toString("base64"), after: after.toString("base64"), clip });
}
````

### `package.json`

Versions, scripts and runtime requirements.

Full file (40 lines).

````json
{
  "name": "diego-martinez-portfolio",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "preview:hero": "NEXT_PUBLIC_BASE_PATH=/portfolio next dev --hostname 127.0.0.1 --port 3001",
    "build": "next build",
    "build:test": "next build",
    "lint": "eslint .",
    "social:generate": "node scripts/generate-social-images.mjs",
    "typecheck": "tsc --noEmit",
    "test": "playwright test",
    "test:e2e": "playwright test",
    "theme:generate": "node scripts/generate-theme-css.mjs",
    "splash:generate": "node scripts/generate-splash-motion.mjs && node scripts/rasterize-splash-print.mjs"
  },
  "dependencies": {
    "@mdx-js/loader": "^3.1.1",
    "@mdx-js/react": "^3.1.1",
    "@next/mdx": "^16.3.7",
    "next": "16.3.7",
    "react": "19.3.0",
    "react-dom": "19.3.0"
  },
  "devDependencies": {
    "@axe-core/playwright": "^4.13.0",
    "@playwright/test": "1.63.0",
    "@types/mdx": "^2.0.14",
    "@types/node": "^24.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "eslint": "9.39.5",
    "eslint-config-next": "16.3.7",
    "typescript": "^5.9.0"
  },
  "engines": {
    "node": ">=22.0.0"
  }
}
````

### `next.config.ts`

Static export and deployment base path.

Full file (21 lines).

````ts
import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  devIndicators: false,
  trailingSlash: true,
  basePath,
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  images: {
    unoptimized: true,
  },
};

const withMDX = createMDX({
  extension: /\.mdx?$/,
});

export default withMDX(nextConfig);
````

### `docs/adr/0003-static-nextjs-on-github-pages.md`

Static hosting contract, with superseded renderer paragraph.

Full file (5 lines).

````markdown
# Use statically exported Next.js on GitHub Pages

The Three.js/React Three Fiber/Motion rendering choice below is superseded by [ADR 0004](./0004-illustrated-climb-replaces-threejs.md); the static-export deployment decision remains accepted.

The portfolio will use the Next.js App Router with React, TypeScript, local typed metadata and MDX Case Studies, stable React Three Fiber over Three.js, Motion, and plain CSS custom properties. It will deploy to GitHub Pages as a build-time static export: semantic pages and every published Case Study are generated as HTML, the homepage Atmospheric Layer loads as an isolated client enhancement, and the site avoids runtime-only features such as Server Actions, API routes, ISR, middleware, and server image optimization. This accepts more build complexity than a basic static site in exchange for structured routes, metadata, and a clear server/client boundary while retaining free static hosting.
````

### `docs/adr/0004-illustrated-climb-replaces-threejs.md`

Current SVG Ascent and durable List View contracts.

Full file (5 lines).

````markdown
# Replace Three.js atmosphere with the illustrated Climb

The approved handoff makes the mountain the Ascent's navigation rather than an optional atmospheric backdrop. We replace Three.js, React Three Fiber, and Motion with deterministic SVG scenery and Landmarks, native scrolling, SVG SMIL animation, and a small 2D snowfall canvas: this is cheaper on mobile and permits reference comparisons and repeatable visual tests without a GPU.

This supersedes ADR 0002 and the rendering-library choice in ADR 0003; static Next.js export and GitHub Pages remain unchanged. ADR 0001's complete semantic content and standalone Case Study routes remain durable: the server-rendered List View works without JavaScript, including hash-targeted MDX Case Studies, while the client-enhanced Climb opens those same canonical stories in a Waypoint Panel. Frame updates mutate cached scene attributes instead of rerendering content; reduced motion pauses the SVG timeline and clears snowfall.
````

### `docs/adr/0005-scope-theme-palettes-to-ui-roots.md`

Theme repaint boundary and recorded performance rationale.

Full file (3 lines).

````markdown
# Scope theme palettes to UI roots

The selected theme lives on the document root, while settled and animated palette tokens belong to registered UI roots; the Climb environment consumes the same transition blend through its own renderer. Defining the settled palette on `:root` made a theme flip invalidate the detailed SVG forest: the reduced-motion browser repro took 1.4–2.2 seconds, despite a 150 ms controller. Scoping both palettes to UI roots made that regression test pass while keeping theme state shared across routes and views. New reading surfaces and controls register a `data-theme-root`; the mountain inherits fixed illustration paint and receives only targeted environmental updates.
````

### `AGENTS.md`

Repository and installed Next.js documentation instructions.

Full file (23 lines).

````markdown
## Agent skills

### Issue tracker

Issues and specs are tracked in GitHub Issues. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the five default triage labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

This repo uses a single-context domain documentation layout. See `docs/agents/domain.md`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
````
