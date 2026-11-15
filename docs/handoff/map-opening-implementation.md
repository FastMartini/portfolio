# Map opening v2 implementation

Implemented on `feat/map-opening-v2` from the repository-root `HANDOFF (1).md` and `map-opening-prototype-v2 (1).zip`. This replaces the earlier simplified opening. The prototype's map print, hinged folds, screen-space paper and view transition are carried into the existing Next.js application. The subsequent screen-recording revision replaces the hands with a feather-like descent and makes Light the first-visit default.

## Result

The homepage starts in the semantic List View. The folded map starts completely above the viewport and drifts into view without an opacity change. Its top fold begins at 1.75 seconds as the last sway settles by 1.93 seconds, with no held pause. The gatefold doors then open, finishing at 3.41 seconds. The camera eases forward from 3.42–4.42 seconds. Printed contours, trail, labels and hinge rules fade between 3.78 and 4.32 seconds; `Howdy, I'm Diego:` begins inking at 3.80 seconds, overlapping that fade. A separate paper stage lets the greeting appear before the zoom completes. At 5.96 seconds the decorative page copy yields to the real heading; the opening finishes at 6.4 seconds.

All map faces and screen-space paper use `#f3eedd`, the exact Light navbar background, in either theme. Opaque paper stays present while only printed ink fades. A 0.4px extension of the same paper color seals fractional-pixel seams. The outside green backdrop remains. Hands, forearms, green face lighting and broad cover fills are absent.

Each panel carries one SVG containing its registered print image and live lettering. The top fold and door fold compose in a single transform on each top panel. The map projects these panels independently with explicit stacking, avoiding browser depth-sorting errors from nested, twice-folded layers. Complementary face-opacity steps change only when that physical face is edge-on; there is no broad hide/show gate tied to another panel. The cover lifts to uncover the inside naturally. The same source coordinates line up the continuous print when the sheet is open.

`scripts/splash/geometry.mjs` keeps the original trail control points intact and places numbered circles and labels beside the trail. Both the circles and the actual rendered numeric label bounds retain at least four map units of clearance from the painted trail (roughly two screen pixels on a phone). They remain in their panel's print coordinates throughout folding and zoom. The Trailhead label is also shifted clear of the trail endpoint.

The exported HTML, pre-paint script and React context default to Light independently of the operating system. A valid explicit `portfolio-theme` choice still restores before paint; invalid or unavailable storage falls back to Light. No theme preference is saved until the visitor uses the toggle.

“Climb view” reverses the paper handoff, switches views beneath opaque paper at 380ms, pulls back to the map, then looks up as the sheet tips away and the existing mountain translates into view. The rail, card, portrait and available markers arrive by 2.6 seconds. The mountain is never scaled. Selecting List View runs the open-map return described below; automatic accessibility/recovery fallbacks still reveal the relevant reading destination directly.

The canonical greeting and other homepage content continue to come from `content/trailhead.ts`. The local greeting edit that preceded this task is preserved.

## Integration details

- `components/splash/Splash.tsx` renders the opening as server HTML through the existing client-component boundary. `gate.ts` opts an eligible visit in before paint and records the motion preference. First paint cannot expose the page before the overlay.
- `controller.ts` ports the prototype controller into TypeScript. It waits up to 1.4 seconds for a measurable List View heading, remeasures fonts before the push, synchronizes script animation start times with the CSS clock, and owns dismissal, timers, animation cancellation and view-switch cues.
- The real Newsreader font requires measuring each word's text range as well as copying its heading box and computed typography. The paper's masked words receive small layout offsets, avoiding transformed or blurred text. The page copy is a single text run so its subpixel spacing across word boundaries matches the real heading. This addresses differences hidden by the prototype's substitute fonts.
- Opening, paper and page greetings are decorative, `aria-hidden`, non-interactive and unfocusable. The semantic heading stays available to assistive technology. A single shared timeline controls which visual heading paints at handoff.
- Independent panel projection and explicit stacking replace nested 3D depth sorting. Generated face-opacity steps follow each panel's complete normal and change only at edge-on. These share the compositor clock with panel rotation; discrete visibility updates could lag one frame and flash reversed labels during live playback. The complementary paper face is fully opaque throughout. The cover stays above the closed inner panels without hiding those panels wholesale. Rendered-image checks verify cover occlusion and that hiding back faces does not change the open map.
- The transition uses a fresh namespaced overlay at z-index 59, below the persistent header. A synchronous React view update happens beneath the paper. On completion the marker renderer refreshes clipping after the stage translation is cancelled, restoring correct keyboard targets without rebuilding the mountain.
- The original once-per-session, homepage-only, no-fragment gate and deployment base path remain intact. No JavaScript means no opening and a complete readable page. CSS completes the opening even when hydration fails; hydrated fallback is seven seconds.
- Pointer, keyboard, wheel, touch, resize, fragment navigation and page exit dismiss. Transition input listeners start in the next task so the activating click/Enter is not mistaken for dismissal. Completion removes listeners, timers and script animations. Strict Mode effect cleanup disposes the controller without consuming the opening.
- Reduced motion uses a still greeting on the selected page color and a 1.4-second opacity-only opening. List → Climb uses a 320ms opacity crossfade. A live preference change preserves the existing List View recovery behavior.

## Climb → List View return

Selecting List View from the illustrated Climb creates a namespaced copy of the same map, with all fold animations held at their fully open pose. The current mountain translates upward as the map and surrounding surface rise from below. The map tilts from 58° to a directly overhead view over 1100ms, holds at scale 1 for 500ms, then zooms into its cream center from 1600–2600ms.

The return hides both `.splash-shadow--soft` and `.splash-shadow--contact` through a `.splash--list` rule. These are separate flat, blurred table layers in the shared artwork; while the paper tilted, their unrotated rectangles produced the dark halo above and behind it. The paper's cream edge seal remains in place. The return's tilt, overhead hold and zoom timings are unchanged.

The return uses the actual `startSplash` camera/typography/reveal controller, rather than duplicating its timing or heading swap. Its screen-space CSS clock starts at opening time 1820ms; the physical fold clock stays frozen. At 1100ms, opaque map surroundings cover the scene while React switches to List View, scrolls to its landing hero and restores focus to `#list-view`. The opening's existing zoom, contour fade, greeting ink, selected-theme paper handoff and hero reveal then continue on that shared clock. The complete return lasts 4580ms. Cream paper remains opaque throughout the map and zoom; a saved Dark theme uses the existing dusk handoff into the Dark reading surface.

Reduced motion switches directly to List View with no map overlay or return animation. Input, resize, hash navigation and page exit can dismiss the sequence; both the tilt controller and the reused hero controller dispose their animations and listeners together. The last Climb scroll position remains available for a later opt-in. Automatic scene recovery and reading-link navigation keep their direct recovery paths.

Fragment navigation has its own cancellation path in both view transitions. It disposes the animation without running the ordinary dismissal's destination callback. The Climb reading-navigation handler reveals, scrolls to and focuses the requested fragment, including when a cancelled Climb entry leaves List View already visible. Cleanup removes the temporary overlay on cancellation as well as completion. This addresses [PR #35's navigation review](https://github.com/FastMartini/portfolio/pull/35#discussion_r4578033478), including browser Back before the 380ms entry switch and Case Study navigation before the 1100ms return switch.

`tests/list-transition.spec.ts` checks desktop and phone layouts in both themes, the exact half-second overhead hold, constant open panel transforms, zoom coverage, pixel-aligned semantic heading swap, focus, native completion, reduced motion, dismissal and resize cleanup. It also records uninterrupted desktop and phone returns. All 11 return cases passed in Chromium and all 11 passed in WebKit, with six additional WebKit checks covering the original intro heading handoff and List-to-Climb transition. Production export, typecheck, lint and whitespace checks passed. Uninterrupted desktop, phone and saved-Dark desktop returns were replayed and inspected. Copies are available in `test-results/climb-to-list-desktop.webm`, `test-results/climb-to-list-phone.webm` and `test-results/climb-to-list-desktop-dark.webm`.

The PR #35 follow-up adds rendered-pixel comparison in the halo band above the tilted map, plus desktop/phone fragment-navigation cases before and after each view-switch cue. Restoring the old shadow changes the tested band by 31 color levels; the fixed return matches the shadow-disabled frame. Native desktop and phone recordings were inspected frame by frame at 40ms intervals through the look-down and zoom handoff, with updated review storyboards in `map-opening-review/`. All 58 transition cases and 16 related theme/accessibility cases passed across the Chromium and WebKit verification runs. Production export, typecheck, lint and whitespace checks passed. Older accessibility checks now assert the Light-first reading palette, and Dark-specific card checks select Dark explicitly.

## Artwork and regeneration

`public/splash/grain.png` and twelve generated `public/splash/print/*.png` sprites provide backdrop grain, contours, route, symbols, cover and legends. Every face owns a single SVG containing its print image and live lettering. URLs honor `NEXT_PUBLIC_BASE_PATH`.

`scripts/splash/print.mjs` ports the deterministic artwork builder. `scripts/generate-splash-art.mjs` generates namespaced text/face markup in `components/splash/map/print.generated.ts` and temporary sprite SVGs. `scripts/generate-splash-motion.mjs` ports the sampled drift/fold tracks and writes `motion.generated.css`. `scripts/rasterize-splash-print.mjs` renders sprites with the installed Playwright Chromium as transparent, lossless PNGs to avoid chroma bleed; it needs no Python environment or new dependency.

```bash
npm run splash:generate
```

The generated outputs make the normal static build independent of a browser installation. Re-run this command after editing the artwork or motion authoring sources. Paper remains rigid hinged panels with subtle printed hinge rules. No hands or forearms are generated or animated.

## Review and verification

The real-font heading handoff is checked to within one color level across desktop, portrait phone and landscape phone layouts in Light and Dark, with full and reduced motion. The unfolded-map comparison permits small rasterisation differences when a browser recomposes a layer, while rejecting reversed cover/legend artwork. Input dismissal and subsequent native scrolling are tested separately across the view switch.


```bash
npm run typecheck
npm run lint
npm test -- tests/map-polish.spec.ts tests/feather-splash.spec.ts tests/splash.spec.ts tests/climb-transition.spec.ts tests/theme.spec.ts tests/portfolio.spec.ts --project=chromium --project=webkit-adaptive --workers=1
```

The runner builds and serves the static export under `/portfolio/`. Opening tests retain session, deep-link, no-JavaScript, failed-hydration, blocked-storage, input and failsafe checks. Additional tests measure the copied heading boxes and compare the heading pixels immediately before and after the swap with the real fonts, on desktop, portrait and landscape phones in both themes. Controller review seeks pause only its own animations and CSS animations, hold the failsafe, and leave unrelated CSS transitions alone. Transition seeks preserve the settled CSS map pose and advance only the transition’s script animations; they do not replay the opening folds.

`test-results/` contains folded-map, unfolded-map, blank-paper, greeting and settled-page PNGs from the viewport checks; transition checks add pullback and look-up frames. These are paused review frames. The recording tests save uninterrupted desktop and phone openings as `video.webm`. Outputs are ignored by Git and replaced by subsequent runs.

To replay locally, run `npm run dev`, open the homepage without a fragment, remove the `splash-seen` session-storage entry in browser developer tools and reload. The Climb transition can be replayed with the normal List/Climb toggle.

### Browser coverage and limits

The latest polish is checked with real rendered frames on desktop, portrait and landscape phones in both themes. Checks cover entry from above, opening during the tail of the sway, uniform paper and sealed seams, face changes only when edge-on, a greeting already visible as the last contour ink disappears, and the copied heading swap. Actual SVG path sampling and label bounding boxes verify Waypoint clearance. SHA-256 checks of both trail path strings prevent accidental route movement.

Validation on 2026-11-15: 29 Chromium visual/heading checks passed, followed by eight Chromium spacing, continuity, fresh-theme and fallback checks. All 63 WebKit opening, transition, spacing, theme, keyboard and reduced-motion checks passed. After the greeting-timing and Climb-layer adjustments, all eight focused Chromium/WebKit checks passed again. Live playback then exposed a one-frame visibility/compositor mismatch; complementary opacity steps corrected it. All 16 final paper, fold, heading-overlap and Climb-transition checks passed across Chromium and WebKit, followed by new uninterrupted desktop/phone recordings in both themes. Production static exports, TypeScript, ESLint, artwork regeneration and Git whitespace checks passed.

Uninterrupted recordings of desktop and phone layouts were replayed in Light and saved Dark. Final copies are stored as `test-results/map-opening-desktop.webm`, `test-results/map-opening-phone.webm`, `test-results/map-opening-desktop-dark.webm` and `test-results/map-opening-phone-dark.webm`. The local preview remains at `http://127.0.0.1:4173/portfolio/`. Browser viewport checks are compatibility proxies, rather than evidence of a physical iOS device run.

Local Firefox exits before loading the page with `Could not find profile folder`, the existing macOS 27 limitation described in the README. Its production-browser checks remain for Linux CI. Frame-rate measurement on a physical mid-range phone is still outstanding.
