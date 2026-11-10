# Map opening and Climb transition — implementation handoff (v2)

**Opening (4.4 s).** Two hands pick up a folded trail map, flick its top half open, regrip, and pull the gatefold doors apart; the sheet ripples and is smoothed flat; the hands let go; the camera pushes into the blank centre; **Howdy, I'm Diego:** inks onto the paper exactly over the List View `<h1>`; dusk passes across the paper (Dark) or the paper lifts (Light), the decorative heading becomes the real `<h1>` in one frame, and the List View Trailhead forms around it.

**List → Climb View (2.6 s).** Pressing "Climb view": the page becomes paper again (dawn wipe in Dark, fade in Light) with the heading on it; the camera pulls back to the map in the person's hands, which regrip; the sheet tips away and drops out of view as if the person looks up; the mountain descends into place; Waypoints, Trail Rail, card and portrait arrive; the Climb is interactive.

Prototype: `dist/index.html` (review bench: sequence, device, theme, motion, speed, scrubber, beats) and `dist/site.html` (the homepage, full window). Sources in `src/`; rebuild with `node src/build.cjs && python3 src/raster.py`.

## What changed in v2

1. **Flicker fixes** (each found by measurement, then verified):
   - *Page flashed before the overlay.* The page could paint before script inserted the overlay. The prototype now runs the gate in `<head>` and inserts the overlay before the page content, matching production, where the overlay is server HTML.
   - *Two headings on screen during the exit.* The overlay used to fade as a whole over the real `<h1>`. Now exactly one heading is visible at a time: a paper copy (dark ink, on the paper), a page copy (theme colour, under the paper), and the real `<h1>`, which stays hidden until a single frame at 3.96 s where the page copy hides and the `<h1>` shows. Screenshots on either side of that frame differ by at most 1 grey level, at 1440×900, 390×844 and 844×390, in both themes and in reduced motion.
   - *Text changing when its effects ended.* No `filter: blur` on text any more; the ink reveal is a mask sweep, colour and halo, and the mask is removed on the last frame.
   - *Grain popping in scale.* The map faces' grain fades out during the push, so the screen-space paper never meets 4× magnified grain (and the reverse in the Climb transition).
   - *Heavy first frame.* Each paper face used to redraw the whole contour SVG. Contours, route and symbols are now pre-rendered WebP sprites (12 files, 415 KB; `src/raster.py`), and only the lettering stays live SVG.
   - *Late webfonts.* Greeting geometry and camera framing are measured again on `document.fonts.ready` if that resolves before the push begins.
   - *Mountain re-rasterising.* The mountain is never scaled; it only translates or fades.
   - A deterministic sweep (a screenshot every 20 ms, flagging any frame that differs from both neighbours) finds no flashes in the opening (desktop Dark, phone Light) or the transition (desktop Dark and Light, phone Light).
2. **Hands.** These are now articulated: the thumb presses, lifts and slides; four fingers curl under the edge, each lagging its neighbour by 18 ms, and spread while smoothing; the palm rolls at the wrist. Gestures follow the paper. There's a toss flick, a regrip before each door (left at 690 ms, right 85 ms later), a wrist roll as each door lifts, an outward press while smoothing, then the thumb lifts and the fingers open on release. The hands regrip again in the Climb transition.
3. **Dark List View is the destination.** The opening frames on, and hands off to, `#trailhead-title`.
4. **New Climb View transition**, reusing the same overlay markup, paper, hands and print.

## Timelines (ms)

Opening:

| Time | Beat | Driven by |
|---|---|---|
| 0–330 | Hands enter, grip; fingers curl | CSS |
| 250–620 | Lift and ruffle; wrist flick | CSS |
| 380–945 | Top half flicks open: give, resistance, release, overshoot | CSS |
| 690–890 | Regrip: left hand, then right | CSS |
| 820–1480 | Doors pulled apart, left then right; wrists roll with each door | CSS |
| 1240–1800 | Ripple, outward smoothing press, sheet lays down | CSS |
| 1520–1960 | Thumbs lift, fingers open, hands leave | CSS |
| 1550–2350 | Camera push onto the heading (CSS fallback: centred) | JS |
| 1700–2150 | Map grain fades | CSS |
| 2180–2350 | Screen-space paper takes over | CSS |
| 2300–3440 | Greeting inks in | CSS |
| 3420–3900 | Dusk wipe (Dark) / 3420–3760 paper fade (Light) | JS |
| 3960 | Page copy → real `<h1>` (one frame) | JS |
| 3500–4380 | Header, portrait, eyebrow, lead, intro, actions, scroll cue | JS |
| 4400 | Overlay removed (no fade) | CSS |

Climb transition (script only):

| Time | Beat |
|---|---|
| 0–380 | Page becomes paper (dawn wipe right to left in Dark, fade in Light); real `<h1>` → page copy at 0 |
| 380 | Under full paper: the view switches to Climb; the paper hands off to the magnified centre pane |
| 380–1250 | Pull back from 4× to the whole map; folds, edges and grain return (470–1200) |
| 860–1290 | Hands regrip |
| 1150–2150 | Sheet tips away (rotateX 0→58°) and drops out of frame; table edge slides down |
| 1150–2270 | Climb stage descends from −62 vh |
| 1780–2600 | Waypoint markers pop in from the bottom up; rail, card, portrait |
| 2600 | Overlay removed; all script animations cancelled |

## Responsive rules

- Sheet: landscape `--w: min(28vw, 47vh)`, rows `0.7 × --w`; portrait (`max-aspect-ratio: 4/5`) `--w: min(43vw, 30vh)`, rows `1.25 × --w`, with a taller print sprite and its own hand keyframes.
- Camera framing (both sequences): the centre pane covers the viewport with a margin of 9% of the pane width, so hinge creases stay off-screen. The push is a pure scale about one fixed point, chosen so the pane point under the greeting lands on the heading.
- The greeting copies take the `<h1>`'s computed type and exact box. In the transition the pane copy uses the measured line breaks, so they cannot change while it shrinks.
- Resize during either sequence dismisses it.

## Accessibility

Both overlays are `aria-hidden`, non-interactive and unfocusable. The opening sits above the header and is removed by CSS even if script fails. The transition sits below the header (z 59), so navigation never disappears and focus stays on the toggle. Pointer, key, wheel, touch, resize, or turning on reduced motion dismisses immediately to the finished state. The transition only listens from the next task, so the click or Enter that started it doesn't end it. Verified: the Enter key on the toggle runs it, Escape mid-transition jumps to the interactive Climb, and Enter again returns to the List View.

Reduced motion: the opening is a still greeting on the page's own colour with the page fading in (1.4 s). The transition is a 320 ms opacity crossfade into the Climb.

## Files that would change in the Next.js portfolio

| File | Change |
|---|---|
| `components/climb/Climb.tsx` | List View by default: in the enhancement frame, `setListMode(true)` instead of `Boolean(listTarget()) \|\| preference.matches`. In `toggleView()`, when leaving List mode, call `toClimbTransition(overlay, () => setListMode(false))`. Run the state change inside the callback, which fires at 380 ms under full paper or immediately on dismissal / reduced motion. `ViewToggle` is unchanged. |
| `components/splash/Splash.tsx` | Overlay markup per `src/site.template.html` `#splash-template`: defs (lettering only), rows, pane cover, pane greeting, hands, both greeting copies. Greeting text comes from `trailheadIntro.heading`. The effect calls `startSplash(ref.current)`. Export the markup for reuse by the transition (render a hidden `<template>` or a second instance). |
| `components/splash/controller.ts` (new) | Port of `src/intro.js` (`start`, `toClimb`). In production, wait (rAF, ≤ 1.4 s) for `#trailhead-title` to have layout before measuring, because hydration can be late. |
| `components/splash/map/print.ts`, `markup.ts` (new) | Port of `src/print.cjs` and the face builder in `src/build.cjs`. |
| `scripts/generate-splash-motion.mjs`, `scripts/rasterize-splash-print.mjs` (new) | Ports of `src/motion.cjs` and `src/raster.py`. The rasteriser writes `public/splash/print/*.webp` at build time; commit the output. |
| `components/splash/splash.css` | Replace with `src/intro.css`, the hand rules from `src/printstyle.css`, and the reduced block from `src/intro-reduced.css`, plus the generated `motion.generated.css`. |
| `public/splash/grain.png`, `public/splash/print/*.webp` (new) | 19 KB + 415 KB. Paths via `NEXT_PUBLIC_BASE_PATH`. |
| `components/splash/gate.ts` | Optional: also set `data-motion`. |
| `tests/splash.spec.ts` | Keep the existing session, deep-link, no-JS, hydration, storage, input and failsafe tests. Add: the greeting copies' rects equal `#trailhead-title`'s at 3.0 s; across 3955→3965 ms exactly one of page copy / `<h1>` is visible and the heading pixels are unchanged; overlay hidden at 4.4 s. In `seekIntro`, seek only `CSSAnimation`s and the controller's animations, never `CSSTransition`s, and hold the failsafe while paused. |
| `tests/climb-*.spec.ts` | New: the toggle runs the transition; the view switches by 400 ms; the overlay is gone and markers are focusable by 2.7 s; Escape mid-way lands in the interactive Climb; reduced motion crossfades. Existing tests that assume the Climb is the default need `#`-free starts to click "Climb view" first. |

## Assumptions and approximations

- Leaving the Climb for the List View stays instant (not asked for). It's a natural candidate for the reverse gesture.
- If the visitor has scrolled the List View so the heading is off-screen, the transition starts from blank paper.
- Paper is rigid hinged panels with lighting, crease shading and a light sweep; nothing bends. Hands are flat illustrations with jointed parts, not a rigged model.

## Verification

In Chromium (Playwright) with Lora and Inter standing in for Newsreader and Manrope, because the sandbox has no network:

- frame sweeps and contact sheets for both sequences at desktop and phone sizes, in both themes;
- the heading-swap pixel test;
- the flash sweep;
- real-time interaction tests: keyboard trigger, Escape dismissal, wheel dismissal, natural completion leaving no script animations, and the reduced-motion paths.

Recordings in `recordings/` are frame-accurate seeks.

Not yet verified: Safari and Firefox (3D panel sorting, `pseudoElement` animations), frame rate on real devices (headless software rendering takes ~0.7 s on the first overlay frame; the CSS clock waits, so nothing jumps, but measure it on a mid-range phone), and the real fonts.
