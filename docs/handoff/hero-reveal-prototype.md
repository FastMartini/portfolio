# Greeting reveal comparison — temporary prototype

Question: which motion should introduce “Howdy, I’m Diego.” after the map zoom? **No default has been chosen.** The ordinary landing page retains its current fade. These are disposable development-only variants on the existing homepage, not new production layouts.

Run `npm run preview:reveals`, then open:

| Variant | URL | Greeting duration |
| --- | --- | --- |
| Letterpress | http://127.0.0.1:3001/portfolio/?variant=letterpress | 1.08 s |
| Trail-drawn reveal | http://127.0.0.1:3001/portfolio/?variant=trail-drawn | 1.10 s |
| Paper-fold reveal | http://127.0.0.1:3001/portfolio/?variant=paper-fold | 1.04 s |
| Trail sign | http://127.0.0.1:3001/portfolio/?variant=trail-sign | 0.96 s |

The bottom bar’s arrows switch variants and replay. Left/right keyboard arrows do the same, except while editing a native control. The circular-arrow button replays the selected source. Expand **Controls** to choose a variant directly or change **Replay from** between **Opening map handoff** and **Climb → List**. Controls collapse during playback to keep the hero clear; expand them whenever needed. The status shows the duration and current phase. The variant lives only in the URL, with no saved preference.

Opening replays start at the fully open map, immediately before its existing zoom. The first normal visit to a preview URL also applies the chosen reveal to the complete opening splash. The normal header’s Climb/List toggle uses the selected reveal too. “Climb → List” replay uses the real transition; when already in Climb it preserves that reading position. Every greeting begins at opening-clock 4420 ms, after the zoom settles. Intro and actions arrive together when that greeting completes. Resume, copy, typography, layout and contours stay shared.

The single semantic heading is untouched. Decorative, aria-hidden copies use measured letter positions and hidden sizing text so animated letters retain the original spacing and baseline. Fold panels move over anchored text. The copper cue for Trail-drawn reveal meets the existing route, which then continues along its original geometry. Reduced motion skips the map and character effects and shows the completed layout immediately.

## Review evidence

The comparison was inspected with Chromium and WebKit at 1440 px and 390 px through both opening and Climb handoffs in light and dark themes: 64 combinations. The semantic heading count, original heading bounds, identical intro/action timing, Resume presence, overflow and browser errors were checked during those inspections. Additional checks cover reduced motion at desktop and 320 px, URL reload, keyboard cycling, and absence of the controls/variant flag in the production export. Uninterrupted dark-theme recordings cover all four variants and both handoffs on desktop Chromium and mobile WebKit. They exposed a decorative-letter stacking issue; isolating each greeting copy prevents page-colored letters from leaking over the cream sheet. The full dark-theme matrix was repeated after that fix. Fresh complete opening splashes were also replayed at desktop and mobile widths. Lint, TypeScript and a production build are checked; no permanent tests were added for this throwaway comparison.

Prototype source: `components/hero-reveal-prototype/`. Small opt-in hooks live in the splash controller, prepaint gate, global layout and trail-ready listener. The preview mounts only in development and only for one of the four explicit variant query values. Remove those hooks and this folder after a winner is selected and implemented properly.

Captured locally on `prototype/hero-reveal-comparison`. The decision remains pending; do not promote a variant or the preview bar to the default page before Diego chooses.
