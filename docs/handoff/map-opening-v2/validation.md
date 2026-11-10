# Map opening v2 integration

Source: the supplied `HANDOFF.md` and `map-opening-prototype-v2.zip`.
The supplied map print and fold shapes are retained; timing is refined below. The opening and
List-to-Climb transition now show only the unfolding map, with all hand artwork
and hand-specific animation removed. The parchment cover and clear crease
lines from the prior revision remain. The greeting is shared with `content/trailhead.ts`; lettering is
regenerated from the Waypoint registry and uses self-hosted Newsreader/Manrope.

## Production integration

- First visits land in List View; repeat sessions, deep links, standalone routes,
  no JavaScript, and blocked storage retain the previous gate behavior.
- `components/splash/timing.json` is shared by the CSS generator and controller:
  1450 ms unfold/settle, 650 ms full-open hold, 950 ms expansion, 750 ms reveal.
- The map's fold curves retain their resistance and soft overshoot, fitted to
  the new unfold interval. Artwork is unchanged. The camera stays still during
  the full-open hold; crease shading and grain remain visible.
- One CSS paper effect replaces overlapping opacity effects. Paper is fully
  opaque at 3030 ms, before the world hides at 3050 ms, and matches the actual
  homepage backing color before fading. The root exits at 3800 ms.
- Opening uses the actual heading from its first appearance. It fades in at
  3050 ms, stays visible, and supporting content follows through 3800 ms.
  Decorative type copies remain exclusively for the separate Climb transition.
- Cold loads wait for heading layout, fonts, and portrait decode, with a bounded
  three-second readiness budget. A slow load holds the settled map on the same
  clock. Late hydration never rewinds or re-hides an already visible hero.
- Effect disposal releases resources without dismissing/restarting CSS, so
  React's development setup/cleanup/setup does not replay the intro.
- List-to-Climb switches under paper at 380 ms. The header remains above the
  overlay, the initiating input is excluded, and the mountain only translates.
- Controllers own their timers, input listeners, animation frames, and script
  animations. Completion, interruption, view reversal, hash navigation,
  enhancement failure, and unmount all release those resources.
- Reduced motion bypasses the opening before paint and retains a 320 ms opacity-only Climb entrance.
  Pointer, key, wheel, touch, resize and enabling reduced motion dismiss the
  active sequence. Climb-to-List remains immediate.

## Validation

The focused acceptance tests cover desktop/mobile, both themes, a stationary
650 ms full-open map, paper coverage across the world exit, headline-first
stagger, unchanged headline pixels across overlay cleanup, and natural cold
loads with delayed fonts/scripts. They also cover session/deep-link gates,
reduced motion without hydration, input dismissal, no JavaScript, failed
hydration, blocked storage, stalled clocks, missing APIs, partial animation
failure, late heading layout, focus, rapid reversal and Climb completion.

The earlier integration passed the full local Chromium/WebKit suite and Linux
CI in all three engines. Current revision results are recorded below and on
PR #34; those earlier full-suite results do not validate the new pacing.

### WebKit capture limitation

The macOS Playwright WebKit screenshot path flattens 3D layers: a standalone
600×600 CSS perspective demo reproduces the same affine-looking output while
its projected DOM rectangles match Chromium. This is consistent with the
[WebKit snapshot limitation](https://bugs.webkit.org/show_bug.cgi?id=68276) and
[Playwright’s software snapshot path](https://github.com/microsoft/playwright/issues/42885).
The authored nested transforms and native back-face culling are preserved; no
production CSS workaround is added to compensate for screenshots. Chromium
checks front-face paint; all engines check projected fold geometry, timing,
heading pixels, input and cleanup. An on-screen Safari inspection could not be
captured because Computer Use access to the Playwright app was not enabled.

`npm run splash:rasterize` was also executed successfully: twelve shape-only
WebPs were generated (444,898 bytes using Chromium's WebP encoder). The initial integration kept
the supplied twelve WebPs (415 KB), whose Pillow encoding differs slightly.
The subsequent cover revision regenerates only the two cover sprites.
Regeneration changes the encoding, not the authored map geometry.

## Review frames

The Chromium captures below use the production typography and the actual
controller clock, paused at the labeled times. The updated opening frames show
the hold, expansion and actual-heading reveal on desktop and mobile.

![Map opening into List View on desktop](opening-desktop.png)

![Map opening into List View on mobile](opening-mobile.png)

![List-to-Climb transition](climb-transition.png)

Validation runs: [full Linux verification](https://github.com/FastMartini/portfolio/actions/runs/42776914782)
and [three-browser opening/transition and baseline verification](https://github.com/FastMartini/portfolio/actions/runs/42776866582).
The current revision is checked with the focused opening/transition suite,
typecheck and lint. CI reruns on the updated PR.

## Map-only revision

The hands are removed from the shared overlay, artwork generator, styles,
motion generator and transition controller. The map unfolds by itself in both
sequences. The twelve WebPs and map geometry remained unchanged by the
hand-removal revision. The subsequent pacing revision changes timing and
removes the opening greeting swap.

The prior green-band removal and crease enhancement are retained. The cover
keeps its title, mountain illustration, copper accents and layout. Cover-only
edits can use `npm run splash:rasterize -- --covers-only` to preserve the ten
other sprites.

## Folded-cover occlusion fix

The gatefolds previously rested at 177°. Their raised corners physically
intersected the cover, exposing inside legends and cutting through its mountain
illustration. Both gatefolds now rest flat at 180° until their existing opening
cues. Their shadow ramp starts from the same closed angle. The occlusion fix
changed no printed artwork or raster assets; the later pacing refinement
retimes the same fold shapes.

The regression compares the folded cover with a reference capture of that same
cover with its concealed panels hidden. It checks cream pixels away from
antialiased edges on desktop and phone. Original samples were at 0, 350, 450
and 535 ms; the refined timeline uses corresponding 0, 275, 350 and 419 ms poses. The old version
failed at 0 ms with 1,867 incorrect desktop pixels and 305 phone pixels; the fixed
version reports zero at every sampled frame. WebKit's software 3D snapshots are
excluded from this paint assertion; its geometry and lifecycle checks remain.

![Folded cover before and after correcting panel intersections](cover-layering.png)

After the fix, the focused opening/transition suite passed 98 tests, with the two
WebKit 3D paint captures skipped as described above. Typecheck and lint passed.

## Pacing and flicker diagnosis

The original camera push began at 1550 ms, before the sheet finished settling
around 1800 ms, and provided no full-open hold. A paused-frame repro showed
camera scale 1 at 1450 ms and 4.31 at 2090 ms. The refined sequence stays at
scale 1 with flat folds throughout 1450–2100 ms.

The old handoff involved two decorative greetings and the real heading, plus
two CSS paper-opacity effects and an additional scripted fade/mask. The paper
began handing off at 3420 ms while the final word's ink mask was still settling
until 3440 ms; the real heading remained hidden until 3960 ms. The refinement
removes the opening text swaps and competing effects rather than adjusting
their overlap. One paper effect covers the map until the page surface matches,
and the actual heading's opacity increases once and never decreases.

A delayed-script cold-load probe observed one CSS start, so a restart was not
reproduced as the primary cause. Disposal now preserves the CSS clock, framing
is measured only once after readiness, and completed intros cannot replay.

### Current verification

- Chromium/WebKit: 106 focused opening/transition cases pass across the suite
  and affected-test reruns; the two WebKit 3D paint captures remain skipped.
- All four natural delayed-asset cold-load cases pass in each engine: desktop
  and mobile, Light and Dark. The heading never loses opacity once it appears,
  the root clock starts once, and paper covers the map-to-page boundary.
- All four full-open hold/stagger cases pass. The overlay-cleanup pixel checks
  retain the actual heading unchanged in both themes and viewport sizes.
- Both Chromium opaque-cover checks pass at all sampled poses. The comparison
  allows a two-pixel reference neighborhood for cover glyph re-rasterization:
  old Linux CI captures change from 31 desktop/36 phone false positives to zero.
  A negative control restoring the original 177° doors still fails with 1,630
  pixels, so the test continues to detect actual inside-print bleed-through.
- Production static-export builds, TypeScript, ESLint and `git diff --check`
  pass. Updated desktop/mobile review captures show the final sequence.
- Full Linux CI reruns when PR #34 is updated; the local checks above do not
  claim that the pending full run has passed.
