# Diego Martinez — Portfolio

An Editorial Alpine portfolio presenting Diego Martinez's work as a Mountain Journey. The application is a statically exported Next.js site for GitHub Pages.

The homepage defaults to the illustrated Climb after client enhancement: ordinary scrolling follows a switchback trail through ten stops, with altitude weather, six hand-drawn Landmarks, projected Waypoint markers, a Trail Sign, and a bottom-to-top Trail Rail. The Waypoint Panel is a desktop side panel or mobile bottom sheet; Escape/Close returns focus to the originating marker. Three published MDX Case Studies open inside the panel with a Summary action.

The complete server-rendered List View is visible without JavaScript and remains reachable through the view toggle or any hash targeting its content. Case Studies such as `#case-veritas` open with CSS `:target` even without script; standalone `/work/*/` routes remain available. Waypoint metadata comes from `content/waypoints.ts`, and Case Study prose stays in `app/work/*/page.mdx`.

The large deterministic mountain SVG is built once from fixed seeds. Native scroll frames update cached transforms, trail offset, climber and marker positions without rerendering content. SVG SMIL provides landmark animation; a 2D canvas provides snow. Reduced-motion changes pause the SVG timeline and immediately clear snowfall. Hidden tabs and List View idle the scene. No WebGL, external illustration assets, or camera controls are used. The stage stays daytime while content surfaces follow light/dark themes.

## Development

Use Node.js 22 or newer.

```bash
npm install
npm run dev
```

Local development runs without a base path. Production acceptance tests build and serve the export beneath `/portfolio/`, matching GitHub Pages. Fonts remain managed by `next/font`.

## Verification

```bash
npm run typecheck
npm run lint
npm test
```

Playwright exercises the production browser boundary: all ten stops and dwell, native wheel/page-key scrolling, keyboard markers, Landmark hover/click, Waypoint Panel content and focus return, embedded and standalone Case Studies, arbitrary List View hashes, no-JavaScript content, live reduced motion, responsive layout, and WCAG 2.2 AA in light/dark themes. Reference tests compare seeded scenery, all six Landmark builders, and every generated flag keyframe against the approved handoff.

Visual baselines are platform-specific (`darwin` locally, `linux` in Ubuntu 24.04 CI), with a 1% difference allowance. The Climb snapshots cover Trailhead, Waypoint 03, Waypoint 06, and Summit at 1440px and 390px; the durable List View keeps its own snapshots.

To intentionally refresh local baselines, run `npm test -- --update-snapshots` and inspect PNGs in `tests/*-snapshots/`. To regenerate Linux baselines, manually run the existing verification workflow on a non-main branch: `gh workflow run pages.yml --ref <branch>`. That manual branch run updates snapshots and uploads a `visual-baselines-linux` artifact; inspect and commit the Linux PNGs, then require a normal PR verification run without snapshot updates. Manual branch runs never deploy Pages. Failed runs upload screenshots and traces as `playwright-evidence`.

## Design and architecture

The approved prototype is `docs/handoff/reference/climb-reference.html`; implementation guidance is `docs/handoff/CODEX_HANDOFF.md`. [ADR 0004](docs/adr/0004-illustrated-climb-replaces-threejs.md) records the illustrated Climb's replacement of the earlier Three.js Atmospheric Layer.

## Deployment

Pull requests run type checking, linting, and production-export Playwright tests. A verified push to `main` builds with GitHub's reported Pages base path and deploys through GitHub Actions.
