# Handoff: The Climb (Editorial Alpine, illustrated)

This folder describes a finished homepage design for the portfolio and how to build it inside this repository. The design was prototyped as one self-contained HTML file; your job is to rebuild it the repository's way (Next.js static export, typed content, Playwright tests), not to paste the file in.

## What is in this folder

| File | What it is |
| --- | --- |
| `reference/climb-reference.html` | The finished, working page. Open it in a browser. It is the visual and behavioural source of truth. |
| `reference/climb.js` | Readable source for everything the page does: scroll mapping, weather, the illustrated mountain, landmarks, animations, markers, side panel, list view. |
| `reference/climb.css` | Styles for the climb: stage, markers, cards, trail sign, rail, side panel, list-view toggle. |
| `reference/base-tokens-and-list-view.css` | Colour tokens (light and dark) and the styles for the list view, Waypoint layout and Case Study layout. |
| `reference/climb-body.template.html` | The markup skeleton with placeholders (`{{WAYPOINTS}}`, `{{CASES}}`, `{{ARROW}}`, `{{RIDGE}}`). |
| `reference/summit-flag-generator.py` | Generates the summit flag's traveling-wave animation. |

All Waypoint and Case Study text in the reference was copied verbatim from `content/waypoints.ts` and `app/work/*/page.mdx`. Do not rewrite it; read it from those files.

## Prompt to give the agent

> Read `AGENTS.md`, `GLOSSARY.md`, `docs/adr/`, and `docs/handoff/CODEX_HANDOFF.md`. Open `docs/handoff/reference/climb-reference.html` in a browser and study it. Rebuild that homepage inside this Next.js app following the plan in the handoff, on a new branch. Keep all Waypoint and Case Study content sourced from `content/` and the MDX pages, keep the static export and GitHub Pages base path working, and make `npm run typecheck`, `npm run lint`, and `npm test` pass. Work through the phases in order and stop after each phase to summarise what changed.

Put this folder at `docs/handoff/` in the repo before running it.

## The design in one paragraph

The homepage is a tall scroll track with a sticky full-screen stage. Scrolling moves the visitor up a switchback trail on an illustrated mountain (SVG), pausing briefly at ten stops: Trailhead, Base camp (About), six Waypoints, A quiet overlook (Beyond Work), and Summit (Contact). Weather changes with altitude: warm morning trail, mist, overcast rock, falling snow, a white-out through the clouds, then clear blue sky and sun at the summit. Each Waypoint has a hand-drawn landmark painted into the scene plus a numbered marker; hovering highlights both, clicking opens a side panel with the Waypoint's summary, evidence, role, links, and, for the three Case Studies, the full Case Study inside the panel. A "List view" toggle shows the full text version, which is also what visitors without JavaScript get.

## Architecture changes (record these)

1. **Supersede ADR 0002.** The Three.js Atmospheric Layer is replaced by an illustrated SVG mountain and a 2D canvas for snow. Write `docs/adr/0004-illustrated-climb-replaces-threejs.md` explaining why: the scene is now the navigation, it is cheaper on mobile, deterministic, and testable with screenshots. Remove `components/atmospheric-layer.tsx`, `components/atmospheric-terrain.tsx`, and the `three` and `@react-three/fiber` dependencies once the new scene works.
2. **Update `GLOSSARY.md`.** Ascent now means scrolling up the trail on the illustrated mountain. Add **Landmark** (the illustration that marks a Waypoint on the mountain), **Trail Sign** (the card showing the current position with an "Open Waypoint" action), **Waypoint Panel** (the side panel), and **List View** (the full text version). The Route Indicator becomes the vertical **Trail Rail**, which runs bottom (Trailhead) to top (Summit). Remove the Atmospheric Layer entry or mark it as superseded.
3. **The semantic list view is the durable layer.** It is server-rendered and complete without JavaScript. The climb is a progressive enhancement that mounts on the client. This keeps the existing promise in the README and ADR 0001.

## Suggested file layout

```
content/
  journey.ts            add `trailPosition` (0–1) to each stop; values are in STOP_T in climb.js
  waypoints.ts          unchanged; the panel reads from it
components/climb/
  Climb.tsx             client component: scroll track, sticky stage, frame loop, reduced-motion handling
  useClimbProgress.ts   scroll -> stop index -> trail position, with the dwell at each stop
  weather.ts            SKY keyframes and weather(t): sky colours, snow amount, haze, sun
  Snow.tsx              2D canvas snowfall
  Mountain.tsx          renders the mountain SVG from the builders below
  mountain/geometry.ts  silhouette (L, R), leftX/rightX, trailL/trailR, trail switchbacks, sampling
  mountain/scenery.ts   bands, foothills, trees with depth sorting, edge pines, clouds, contours, trailhead sign, summit flag, campfire
  mountain/landmarks/   watchtower.ts, liftBase.ts, skiLodge.ts, radioStation.ts, climbingWall.ts, highPass.ts, chairlift.ts
  mountain/parts.ts     shared helpers: roof, masonry, warmWin, smoke, bullwheel, shadow, pulseOpacity
  Markers.tsx           numbered marker buttons projected onto landmark anchors
  StopCards.tsx         Trailhead / Base camp / Overlook / Summit cards
  TrailSign.tsx         current position + "Open Waypoint"
  TrailRail.tsx         vertical stop navigation
  WaypointPanel.tsx     side panel (bottom sheet on phones)
app/page.tsx            renders <ListView/> (server) and <Climb/> (client)
```

Keep the SVG builders as pure functions that return markup strings or React elements from fixed seeds. They are deterministic on purpose (seeded `rnd()`), so screenshots stay stable.

## Behaviour that must survive the port

- **Ordinary scrolling.** No scroll-jacking. The stage is `position: sticky`; the track is about 10 viewport heights. Each stop gets an equal share of scroll with a dwell (the `smooth(0.18, 0.82, f)` mapping in `readScroll`).
- **Depth.** Trees and landmarks are sorted by their ground y and drawn together inside the mountain clip, under the mountain's shade layer, so trees overlap landmark bases and the right side of the mountain shades them. The chairlift is drawn after them. Edge pines are drawn outside the clip.
- **Trail layout is locked.** The trail and landmark placement use `trailL`/`trailR` (the original base clamped to the world width). The wider flanks are scenery only. Changing the silhouette must not move the trail.
- **Chairlift loop.** Chairs follow one closed path: up the top strand, around the lodge bullwheel, down the bottom strand, around the station bullwheel. Never let them jump back to the start.
- **Flipped landmarks.** The lift station and lodge are mirrored so the cable meets the facing sides. Text inside a mirrored landmark is counter-flipped (see the `fl === -1` text replacement in the landmark placement loop in climb.js).
- **Markers.** Markers sit on each landmark's anchor (top of the landmark). Hovering or focusing either the marker or the landmark highlights both. Clicking either opens the panel. Markers outside the viewport are hidden and removed from the tab order.
- **Panel.** Opens on the right on wide screens (the scene slides left so the mountain stays visible), as a bottom sheet on phones. Escape and Close dismiss it and return focus to the marker that opened it. "Read case study" swaps the Case Study into the panel with a "Summary" back button. In the port, render the panel from `content/waypoints.ts` and the MDX Case Study components instead of cloning DOM nodes, which the prototype does.
- **Animations** are SVG SMIL (`<animate>`, `<animateTransform>`, `<animateMotion>`): smoke, chairlift, bullwheels, dish and beacon signals, flickering lights, climbers, falling pebbles, rope sway, summit flag. All pause with `svg.pauseAnimations()` when `prefers-reduced-motion: reduce`, and snowfall stops. Keep that.
- **Summit flag** is a generated traveling wave: 12 vertical strips, 30 frames per loop, shading by fold slope. The generator is `reference/summit-flag-generator.py`; climb.js only contains its output (the `summit-flag` group). Port the generator to TypeScript or run it at build time. Do not replace it with a few hand-made keyframes.
- **List view** is reached by the header toggle, by any hash that points inside it (for example `#case-veritas`), and is the default without JavaScript. Case Studies in the list view open by `:target` so they work with no script.
- **Theme.** The stage is always daytime; cards, panel and list view follow the light/dark tokens.

## Phases

1. **Content and list view.** Add `trailPosition` to `content/journey.ts`. Make the existing homepage content render as the list view. Tests still pass.
2. **Static mountain.** Port geometry and scenery to `components/climb/mountain/` and render one still frame at a fixed trail position. Compare against `reference/climb-reference.html` at the same stop.
3. **Climb behaviour.** Sticky stage, scroll mapping with dwell, weather, snow, stop cards, trail sign, rail.
4. **Landmarks and animation.** Port the six landmarks, chairlift loop, campfire, trailhead sign, flag. Add reduced-motion pausing.
5. **Markers and panel.** Projection, hover/focus sync, panel from content, Case Study in panel, focus management.
6. **Clean-up.** Remove the Three.js layer and dependencies, write ADR 0004, update the glossary and README.
7. **Tests.** Update and add Playwright tests (below), refresh screenshot baselines on both platforms as the README describes.

## Tests to add or update

- Scrolling to each stop shows the right card or trail sign; the rail marks the current stop; the rail runs Trailhead (bottom) to Summit (top).
- Every Waypoint marker is a button with an accessible name; keyboard focus reaches visible markers in order.
- Clicking a marker and clicking its landmark both open the panel with the right title; Escape closes it and focus returns to the marker.
- "Read case study" opens the Case Study in the panel for MomentumX, Veritas and the Membership Inference study.
- With JavaScript disabled, the full content is visible, and `#case-veritas` shows that Case Study.
- With reduced motion, `svg.animationsPaused()` is true and no snow is drawn.
- No horizontal overflow at 390px wide; WCAG 2.2 AA checks on the list view and the panel.
- Visual snapshots at Trailhead, Waypoint 03, Waypoint 06 and Summit on desktop and mobile.

## Things to watch for

- A global `svg { max-width: 100% }` rule shrank the mountain on narrow screens in the prototype. The mountain SVG needs `max-width: none`.
- The mountain is a large SVG (thousands of nodes). Build it once, not on every frame; per frame, only update the transform, the walked-trail dash offset, the climber position and the marker positions.
- `basePath` for GitHub Pages: the climb uses no image files, but any links to Case Study routes must respect it.
- The prototype loads Newsreader and Manrope from Google Fonts; the repo already uses `next/font`, so keep that.
