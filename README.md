# Diego Martinez — Portfolio

An Editorial Alpine portfolio presenting Diego Martinez's work as a Mountain Journey. The application is a statically exported Next.js site for GitHub Pages.

The homepage opens in the complete List View. The header’s Climb view toggle unfolds the same map into the illustrated Climb, where ordinary scrolling follows a switchback trail through ten stops, with altitude weather, six hand-drawn Landmarks, projected Waypoint markers, and a bottom-to-top Trail Rail. Both visible Landmarks and markers support keyboard activation; offscreen controls leave the tab order. The Waypoint Panel is a nonmodal desktop side panel or mobile bottom sheet, keeping the header's List View toggle usable. Escape/Close restores the opening stop when necessary and returns focus to the originating marker. Three published MDX Case Studies open inside the panel with a Summary action; their components and content slots are keyed by canonical Waypoint slug.

The complete server-rendered List View is visible without JavaScript and remains reachable through the view toggle or any hash targeting its content. Case Studies such as `#case-veritas` open with CSS `:target` even without script; standalone `/work/*/` routes remain available. Waypoint metadata comes from `content/waypoints.ts`, and Case Study prose stays in `app/work/*/page.mdx`.

The large deterministic mountain SVG is built once from fixed seeds. Native scroll frames update cached transforms, trail offset, climber and marker positions without rerendering content. SVG SMIL provides landmark animation; an optional 2D canvas provides snow. Hidden tabs and List View idle the scene. No WebGL, external illustration assets, or camera controls are used. Dark is the first-visit default, with a manual Light/Dark header control shared across List View, Climb, and Case Studies. The selected appearance persists across refreshes and tabs, independently of the browser’s color preference. Day and night retain the same altitude weather; the shared transition blends sky and selective environmental lighting while keeping the original live vectors.

## Appearance

The approved theme design adds warm parchment reading surfaces and moonlit Climb lighting. All four Climb cards use cream surfaces in Light mode. A shared controller supports continuous reversal, mid-transition view switches, pre-paint restoration, and a short color-only reduced-motion fade. The map opening uses its own fixed paper palette and hands off to the selected reading palette.

Palette values live in `components/theme/tokens.json`; run `npm run theme:generate` after changing them. UI roots own both settled and animated tokens so the mountain does not inherit frame-by-frame interface colors. See [the implementation and validation notes](docs/handoff/theme-validation.md) and [ADR 0005](docs/adr/0005-scope-theme-palettes-to-ui-roots.md).

## Map opening

The first eligible visit unfolds the map over 1.45 seconds, holds it fully open
for 650 ms, expands over 950 ms, and reveals the Trailhead over 750 ms. The
headline appears first and remains the real heading throughout; supporting
copy, buttons and portrait follow with a subtle stagger. One paper effect
covers the map until it matches the selected homepage background. The map
artwork and parchment cover retain their existing design, without hands.

The 2.6-second List-to-Climb transition switches views under paper at 380 ms;
the mountain translates into place without scaling. Leaving Climb stays immediate.
Pointer, key, wheel, touch, resize, and enabling reduced motion dismiss the
active sequence. Reduced motion shows the homepage directly and retains a
320 ms opacity-only Climb entrance. Deep links, repeat session visits, and
no-JavaScript visits bypass the opening. On cold loads, delayed fonts and the
portrait can briefly extend the settled-map hold (bounded by a three-second
readiness budget). CSS still exits if hydration fails; script failures restore
the finished page. Shared timings live in `components/splash/timing.json`.

The artwork and motion source live in `scripts/splash/`. Run
`npm run splash:generate` to rebuild lettering and sampled motion CSS, or
`npm run splash:rasterize` (Playwright Chromium required) to rebuild the twelve
shape-only WebPs. The committed WebPs and grain come from v2; the two cover sprites replace the
green band with parchment and fold creases. Use
`npm run splash:rasterize -- --covers-only` for cover-only edits so the other
ten sprites stay byte-for-byte unchanged. Lettering remains live SVG with the site's self-hosted fonts. All asset paths
respect `NEXT_PUBLIC_BASE_PATH`. See the [handoff](docs/handoff/map-opening-v2/HANDOFF.md)
and [integration notes](docs/handoff/map-opening-v2/validation.md).

## Adaptive and fail-safe Climb

All visitors start in List View. Enabling that preference while reading the Climb reveals the corresponding Waypoint or Case Study with keyboard focus; relaxing it never automatically returns to Climb. The navigation toggle still permits an explicit opt-in with paused SMIL, no snow, and instant camera updates.

`components/climb/quality.ts` owns required-feature detection and monotonic quality downgrades. Screens at most 600px wide, save-data requests, and available hints of at most 2 GB memory or 2 logical cores pause ambient SVG animation and omit snow without replacing the approved artwork or closing the Waypoint Panel. Missing or privacy-blocked hints do not prevent enhancement. Full-quality snow is capped at 2 million bitmap pixels, never above one pixel per CSS pixel; missing/throwing/lost canvas contexts stop only snow.

Sustained slow rendering first removes decoration, then falls back to List View: two consecutive 60-frame windows with at least 45 frames over 50ms trigger each downgrade. A one-second warmup, visibility resets, and gaps over 500ms exclude startup and suspension noise. Quality never automatically upgrades during the visit. Missing required features leave the server-rendered List View intact; scene initialization, rendering, or reading-panel failures restore List View and the current reading destination. Canonical content, hashes, and standalone Case Study routes remain available independently of the enhancement.

## Development

Active files are organized by responsibility:

```text
app/          Routes, layouts, Case Study MDX, and shared styles
components/   Portfolio UI, illustrated Climb, and splash
content/      Waypoints, journey stops, contact links, and metadata
public/       Served assets: responsive portraits, resume, social cards, evidence
tests/        Acceptance tests, helpers, fixtures, and visual baselines
scripts/      Export server, social image generation, and scroll measurement
docs/         Architecture decisions, agent conventions, and active design references
deprecated/   Archived duplicates and original assets; see deprecated/README.md
```

The original portrait and duplicate handoff packages live in
[`deprecated/`](deprecated/README.md). Files needed by runtime code, tests, or
development tools remain in their active directories. Local recovery bundles,
duplicate editor files, and archived generated output stay untracked there.

Use Node.js 22 or newer.

```bash
npm install
npm run dev
```

Local development runs without a base path. Production acceptance tests build and serve the export beneath `/portfolio/`, matching GitHub Pages. Fonts remain managed by `next/font`.

Tests always start their own production-export server, never reuse another worktree's export. If port 4173 is occupied, use a separate port, for example `TEST_SITE_PORT=4181 npm test`.

## Résumé asset

The published résumé is `public/resume/Martinez_Diego_2026.pdf`. Replace that PDF
in place to keep the shared résumé links working across Climb and List View.
Keep incoming uploads and superseded copies in the ignored
`deprecated/local/resume-replacements/` directory, rather than the repository root
or the served asset directory.

## Verification

Search and sharing metadata use `content/site.ts` and the typed Waypoint registry.
The homepage and each full Case Study have a canonical URL, Open Graph fields,
and a large-image Twitter card. Four checked-in 1200×630 PNG title cards live in
`public/social/`; they contain editorial artwork and truthful copy, not simulated
project screenshots. The SVG favicon combines a ridge line with a DM monogram.
Unpublished routes use the exported branded `404.html` with a 404 status and
`noindex`, including direct visits and refreshes on Pages.

`NEXT_PUBLIC_BASE_PATH` controls routing and local assets; `NEXT_PUBLIC_SITE_URL`
is the complete public site URL, including the project path when present. The
Pages workflow already derives both from `configure-pages`. For a future custom
domain, build with an empty base path and that domain's root URL. No content or
route changes are needed. CI also tests this configuration with a separate
production export:

```bash
TEST_SITE_BASE_PATH='' TEST_PUBLIC_SITE_URL=https://portfolio.example TEST_SITE_PORT=4180 npm test -- tests/discoverability.spec.ts
```

To intentionally regenerate the share cards, first build and serve the export,
then run `SOCIAL_PREVIEW_URL=http://127.0.0.1:4173/portfolio/ npm run social:generate`.
The generator uses Playwright and the built site's self-hosted Newsreader and
Manrope fonts. Inspect all four PNGs, commit them, and rebuild the export to pick
up the new files. Runtime image generation and server-side optimization are not
required.

```bash
npm run typecheck
npm run lint
npx playwright install chromium firefox webkit
npm test
```

Playwright exercises the production browser boundary: all ten stops and dwell, native wheel/page-key scrolling, keyboard markers and Landmarks, Landmark hover/click, panel-open List View transitions, Waypoint Panel content and focus return after scrolling, embedded and standalone Case Studies, arbitrary List View hashes, no-JavaScript content, live reduced motion, responsive layout, and WCAG 2.2 AA with either browser color preference. Source-integrity and pure-builder tests also check exact stop positions and determinism; reference comparisons check seeded scenery, all six Landmark builders, and every generated flag keyframe against the approved handoff.

`tests/climb-adaptive.spec.ts` checks the production `/portfolio/` experience with simulated device hints, live preference/network changes, optional canvas failures, required-feature failures, and controlled frame timestamps. This suite runs in Chromium, Firefox, and WebKit; the existing broader suite and visual baselines remain Chromium-only. WebKit and narrow viewports are compatibility proxies, not evidence of a physical iOS Safari or installed Microsoft Edge run.

On macOS 27, Firefox can fail before loading the site with `Could not find profile folder`, matching an [upstream Playwright report](https://github.com/microsoft/playwright/issues/42768). If affected, run `npm test -- --project=chromium --project=webkit-adaptive` locally and rely on the mandatory three-engine Linux CI run for Firefox verification; do not relax browser privacy permissions to run tests.

Visual baselines are platform-specific (`darwin` locally, `linux` in Ubuntu 24.04 CI), with a 1% difference allowance. The Climb snapshots cover Trailhead, Waypoint 03, Waypoint 06, and Summit at 1440px and 390px; the durable List View keeps its own snapshots.

To intentionally refresh local baselines, run `npm test -- --update-snapshots=all` and inspect PNGs in `tests/*-snapshots/`. Explicit `all` refreshes even artwork changes that fall within the comparison tolerance. To regenerate Linux baselines, manually run the existing verification workflow on a non-main branch: `gh workflow run pages.yml --ref <branch>`. That manual branch run updates snapshots and uploads a `visual-baselines-linux` artifact; inspect and commit the Linux PNGs, then require a normal PR verification run without snapshot updates. Manual branch runs never deploy Pages. Failed runs upload screenshots and traces as `playwright-evidence`.

## Design and architecture

The original approved prototype is `docs/handoff/reference/climb-reference.html`; implementation guidance is `docs/handoff/CODEX_HANDOFF.md`. The trees follow the later [Alpine spruce handoff](docs/handoff/alpine-spruce.md), with its own approved visual reference. [ADR 0004](docs/adr/0004-illustrated-climb-replaces-threejs.md) records the illustrated Climb's replacement of the earlier Three.js Atmospheric Layer.

The Climb's [optional fire and snowstorm ambience](docs/handoff/ambient-audio.md) keeps the original synthesized crackles and a quieter warm fire bed at camp, with soft rushing wind in the snowy section and silence at the ski lodge and summit. Visitors enable it with the sound icon in the header beside the theme and view controls; it remains usable while a Waypoint Panel is open. Audio continues through panel reading; List View and hidden tabs suspend playback. Three procedural Web Audio voices run on the native audio thread with no audio downloads or server dependency.

## Deployment

Pull requests run type checking, linting, and production-export Playwright tests. A verified push to `main` builds with GitHub's reported Pages base path and deploys through GitHub Actions.
