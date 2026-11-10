# Map opening v2 integration

Source: the supplied `HANDOFF.md` and `map-opening-prototype-v2.zip`.
The supplied paper artwork, hand geometry, sampled motion and twelve WebPs are
preserved. The greeting is shared with `content/trailhead.ts`; lettering is
regenerated from the Waypoint registry and uses self-hosted Newsreader/Manrope.

## Production integration

- First visits land in List View; repeat sessions, deep links, standalone routes,
  no JavaScript, and blocked storage retain the previous gate behavior.
- CSS owns the 4400 ms opening clock and independent exit. The controller waits
  up to 1400 ms for the real heading to have layout, remeasures after font load,
  and synchronizes measured effects to that same CSS clock.
- Paper uses word spans for the ink reveal. The final page copy uses plain text
  and unitless leading copied from the real heading: inline-block word metrics
  and rounded pixel leading otherwise cause a visible swap with Newsreader.
- The real heading stays hidden through 3960 ms, and the page copy disappears on
  that exact frame. There is no whole-overlay fade or text filter.
- List-to-Climb switches under paper at 380 ms. The header remains above the
  overlay, the initiating input is excluded, and the mountain only translates.
- Controllers own their timers, input listeners, animation frames, and script
  animations. Completion, interruption, view reversal, hash navigation,
  enhancement failure, and unmount all release those resources.
- Reduced motion uses a 1400 ms still opening and 320 ms opacity-only entrance.
  Pointer, key, wheel, touch, resize and enabling reduced motion dismiss the
  active sequence. Climb-to-List remains immediate.

## Validation

The opening and transition acceptance tests cover desktop/mobile, both themes,
heading geometry and pixel equality across 3955–3965 ms, normal completion,
input dismissal, session/deep-link gates, no JavaScript, failed hydration,
blocked storage, stalled clocks, missing APIs, partial animation failure,
late heading layout, focus, and rapid reversal.

Chromium and WebKit passed the first 90 opening/transition cases locally.
Firefox's local binary cannot start ("Could not find profile folder"); Linux CI
runs the same checks in all three browsers. Broader regression and current CI
results are recorded on the PR.

`npm run splash:rasterize` was also executed successfully: twelve shape-only
WebPs were generated (444,898 bytes using Chromium's WebP encoder). The PR keeps
the supplied twelve WebPs (415 KB), whose Pillow encoding differs slightly.
Regeneration changes the encoding, not the authored map geometry.
