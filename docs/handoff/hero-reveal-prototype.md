# Branding iron selected

Diego chose Branding iron as the production List View reveal. The five-option comparison is preserved in commit `712bdf9` on the history of `prototype/hero-reveal-comparison`; it is no longer mounted or selected through URL parameters.

Run `npm run preview:hero` and open `http://127.0.0.1:3001/portfolio/`. A fresh browser session plays the complete opening; switching Climb View → List View replays the chosen reveal after the look-down and map zoom. Clear `sessionStorage["splash-seen"]` and reload to replay the opening.

The production source lives in `components/hero/`: `brand.ts` defines the two heated presses; `reveal.ts` positions the decorative lettering and coordinates the intro/actions and copper route; `strings.ts` renders and plucks individual contours; `sound.ts` remembers the explicit sound setting. The single header sound slot shows guitar in List View and ambience in Climb View.

The greeting begins at opening clock 4420 ms, immediately after the map zoom. Its presses land at +120 and +900 ms and cool completely by +2150 ms. The paper handoff begins at 6570 ms, the decorative-to-semantic heading swap happens at 7110 ms, and the overlay ends at 7550 ms. Climb → List uses the same tracks with an 1820 ms offset and ends at 5730 ms. Physical map handling retains its original 6400 ms CSS tracks; only the overlay lifetime and hero cues are extended.

The paper stays cream in either theme; the page copy carries the final heading's deboss so the swap is continuous. Contours vibrate silently on pointer crossings, and only clicking or tapping a line plays its note. Muting silences active notes; the choice persists after reload. The small discovery note remains below the introduction. Hero text cannot be highlighted; links retain keyboard focus and normal activation.

String interaction mounts only when List View is visible and the map overlay has finished. It disposes on Climb entry, page hide, and reduced motion. With reduced motion, the finished debossed heading and route appear immediately, and the strings, guitar control and discovery note are hidden. Static contours and semantic content remain available without the enhancement.

The production integration adds `tests/hero-branding.spec.ts` for the default two-press sequence, effect cleanup, click-only sound, saved mute, view lifecycle, and reduced motion. Existing splash, return and hero tests use the chosen timing, including the pixel comparison across the heading swap.

Verification completed with lint, TypeScript and the production export. The full Chromium/WebKit suite executed 597 cases (566 passed, 29 failed, 2 skipped). After correcting the browser-API fallbacks and stale expectations, serial follow-ups cleared the failures: 45 passed with 2 expected skips in the first retry, followed by 7 passing checks for the remaining snapshot, deboss rounding and Safari capture deadlines. Screenshot-heavy WebKit tests use a longer test deadline; their paper-color, input and transition assertions remain in place. Heading swaps allow at most 3/255 edge rounding with mean difference below 0.1, rejecting displaced or duplicate lettering.

Reviewed stale platform baselines were refreshed: the macOS Waypoint capture comes from the current local export, and the Linux Waypoint/Climb Trailhead captures come from the existing CI evidence in [run 44004721710](https://github.com/FastMartini/portfolio/actions/runs/44004721710). That earlier run already showed the baseline drift. Fresh Linux CI will validate the updated PR head. Firefox could not launch locally because its profile initialization fails; its checks remain enabled in CI.
