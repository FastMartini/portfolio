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
  1800 ms drift, 250 ms settled pause, 1450 ms unfold, 550 ms full-open hold,
  950 ms expansion, 750 ms reveal (5750 ms of motion in total).
- The map's fold curves retain their resistance and soft overshoot, fitted to
  the new unfold interval. Artwork is unchanged. The camera stays still during
  the full-open hold; crease shading and grain remain visible.
- One CSS paper effect replaces overlapping opacity effects. Paper is fully
  opaque at 4980 ms, before the world hides at 5000 ms, and matches the actual
  homepage backing color before fading. The root exits at 5750 ms.
- Opening uses the actual heading from its first appearance. It fades in at
  5000 ms, stays visible, and supporting content follows through 5750 ms.
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
  active sequence. Climb-to-List switches directly with reduced motion; normal
  motion uses the look-down sequence described below.

## Validation

The focused acceptance tests cover desktop/mobile, both themes, a stationary
550 ms full-open map, paper coverage across the world exit, headline-first
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
and 535 ms. The feather-entry revision samples the settled cover at 1800 and
2050 ms, then corresponding early-fold poses at 2325 and 2469 ms. The old version
failed at 0 ms with 1,867 incorrect desktop pixels and 305 phone pixels; the fixed
version reports zero at every sampled frame. WebKit's software 3D snapshots are
excluded from this paint assertion; its geometry and lifecycle checks remain.

![Folded cover before and after correcting panel intersections](cover-layering.png)

After the fix, the focused opening/transition suite passed 98 tests, with the two
WebKit 3D paint captures skipped as described above. Typecheck and lint passed.

## Pacing and flicker diagnosis

The original camera push began at 1550 ms, before the sheet finished settling
around 1800 ms, and provided no full-open hold. A paused-frame repro showed
camera scale 1 at 1450 ms and 4.31 at 2090 ms. The current feather-entry sequence stays at
scale 1 with flat folds throughout 3500–4050 ms.

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

## Climb-to-List return

The return reuses the opening's complete map markup, paper palette, camera
framing/easing, and headline-first hero reveal. It starts with the rows and
both gatefolds already flat; the whole sheet tilts into view without unfolding.

| Phase | Time | Behavior |
| --- | --- | --- |
| Look down | 0–900 ms | Mountain moves upward while the open map and green floor rise from below; map tilt settles from 58° to overhead. |
| Hold | 900–1400 ms | Camera scale 1, map centered at 50%/50%, flat folds, visible grain/creases. |
| Zoom | 1400–2350 ms | Same measured center-pane push/easing as the opening. |
| Paper takeover | 2050–2330 ms | One opacity/color effect covers the map and matches the selected List View surface. |
| Hero | 2350–3100 ms | Actual headline appears first; supporting copy, actions and portrait use the opening's existing stagger. |

The green floor fully covers the viewport before the view changes at 900 ms.
The List View scroll and native fragment target reset under that cover. The
paper is fully opaque 20 ms before the map world is hidden; it then lifts over
the ready page, with no text clone or heading swap. The selected theme remains
intact: cream paper hands off to cream in Light mode and the matching reading
surface in Dark mode. Navigation stays above the overlay and remains usable.

A temporary backing color matches the current sky behind the moving mountain;
contact shadows gather as the map flattens, avoiding an early dark rectangle.
The same lifecycle owns both view-transition clocks and releases every effect
on completion, input, resize, motion changes, fragment navigation or reversal.
Unsupported animation APIs switch directly. Reduced motion creates no return
overlay or hero animation. Scene-recovery navigation remains immediate.

Returning always lands at the List View Trailhead, including from an open
Waypoint Panel or a previous inline Case Study. The previous Climb scroll
position is retained when visitors switch back.

![Climb-to-List return on desktop](return-desktop.png)

![Climb-to-List return on mobile](return-mobile.png)

### Return validation

- Broader production-export checks: **212 passed**, two known WebKit 3D paint
  captures skipped. This includes the opening, both view directions, shared
  navigation, Climb behavior and theme integration in Chromium/WebKit.
- After the final shadow adjustment, **32 return checks passed** across both
  engines. Desktop/mobile and both themes cover the flat-map start, simultaneous
  tilt/arrival, centered 500 ms hold, zoom, opaque paper handoff, headline-first
  reveal, cleanup, input interruption, reversal, fragment navigation, reduced
  motion, camera API failure and an open Waypoint Panel/previous Case Study.
- **20 targeted fallback/cold-load checks passed** after guarding the prepaint
  motion query against missing/throwing APIs. Homepage and deep-link reading
  remain usable. Natural frame sampling checks observed-frame continuity, with
  deterministic pose tests asserting exact timing independently of CI FPS.
- Static-export builds, typecheck, lint and diff checks pass. The twelve map
  raster assets are unchanged. Desktop/mobile captures above show the final
  shadow treatment. Full Linux CI reruns on the updated PR.

## Feather entry for the initial splash

Only the initial opening gains a descent. A new parent transform carries the
same folded paper, printed faces and crease geometry from above the viewport
into the center over 1800 ms. Side-to-side sway and a small rotation ease to
rest. The contact shadow gathers near the landing, rather than falling ahead
of the paper. The folded map pauses for 250 ms before the authored fold curves
begin their 1450 ms sequence. The full-open hold is 550 ms; the existing zoom,
paper handoff and hero stagger follow without replacing the map DOM.

| Initial opening phase | Time |
| --- | --- |
| Drift from above the top edge | 0–1800 ms |
| Folded map rests in the center | 1800–2050 ms |
| Unfold and settle along the existing creases | 2050–3500 ms |
| Fully opened map holds | 3500–4050 ms |
| Existing camera push | 4050–5000 ms |
| Existing hero reveal | 5000–5750 ms |

The prepaint gate decodes the current aspect ratio's cover, continuous map
print, four panel-back textures and grain before the descent. It also waits
for layout and the lettering fonts. During loading, all opening CSS clocks,
including pseudo-elements, hold at zero with the paper above the viewport.
A bounded eight-second load deadline or decode failure reveals the homepage
instead of showing partial artwork. This bootstrap works without hydration;
the CSS opening still exits independently once the print is ready. Reduced
motion, deep links and repeat visits bypass the loading gate and opening.

The controller aligns live CSS and measured effects to one start time after
readiness. The background sprites, live lettering and cropped print positions
stay attached to their original faces throughout flight, unfolding and zoom.
All twelve production raster assets remain byte-for-byte unchanged.

Both view transitions freeze the new entrance at its finished pose before
playing, so their existing look-up/look-down timings remain unchanged. The
new acceptance checks cover offscreen start, visible downward movement and
sway, folded panels through the landing, centered rest, unchanged map node,
delayed texture readiness, texture failure and the existing continuous handoff.

### Feather-entry validation

The focused Chromium/WebKit run passed 151 cases with two known WebKit 3D
paint captures skipped. One rapid-reversal assertion missed the temporary
forward overlay after Climb View had already appeared. Reusing the existing
activation-task pause makes that inspection deterministic; both engine reruns
pass. This verifies all 152 applicable opening/view-transition cases.

Cold-load checks include delayed fonts/scripts and delayed map textures on
desktop and mobile. They assert that the paper remains above the viewport while
textures decode, then descends with its print ready; the same map node survives
flight and unfolding. Landing, sway, folded-panel angles, centered pause,
full-open hold and continuous hero cleanup pass. A texture failure reveals the
homepage directly. Both view directions retain their original timing and
interruption behavior. Production static exports, typecheck, lint and diff
checks pass; full Linux CI reruns on the updated PR.
