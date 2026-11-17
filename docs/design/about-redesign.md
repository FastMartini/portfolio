# About redesign

Implemented from `about-redesign-codex-handoff.zip` and the matching root `CODEX_HANDOFF.md` supplied on November 17, 2026. The prototype was served over HTTP and inspected on desktop and mobile.

The About section now has three pitches: The Design Idea, The Builder, and The Teacher. `content/about.ts` owns their approved copy, ring metadata, and the shorter Base camp stats. All copy, image metadata, captions, and external links render in the static HTML. The existing hero greeting, surprise hint, Resume action, theme selection, and map transitions remain in place; only its lead copy and trail presentation change.

## Components

- `components/about/About.tsx`: semantic server-rendered pitches and existing proportional ridge artwork.
- `PhotoRing.tsx` / `ring.ts`: one shared, progressively enhanced ring with delayed pointer capture, momentum, exact front-card settling, keyboard/dot/button/trackpad controls, and a plain caption/link fallback. Turning away unloads the Veritas iframe; clicking its poster mounts the privacy-enhanced YouTube player. The caption retains the separate in-depth video link. Ring images preload near the viewport so WebKit does not defer back-facing cards indefinitely.
- `JourneyTrail.tsx` / `trail-geometry.ts` / `trail.ts`: one measured SVG path from the unchanged visible hero route to Waypoint 01, started after either map handoff. It follows scrolling, lights pins, reveals pitches, and rebuilds after layout, font, viewport, and theme changes.
- `braid.ts`: rope, guitar string, and reversed binary text path, revealed through synchronized masks. Its click target follows only the drawn part of the string and rejects drag/cancel gestures.
- `wheel.ts`: optional List View wheel glide, controlled by `GENTLE_WHEEL`. It scales notches to 0.55 and uses a 160ms time constant. Touch, keyboard, reduced motion, Ctrl zoom, horizontal input, nested scrollers, and Case Studies retain native behavior. Subpixel progress is tracked independently of rounded browser scroll positions, so WebKit reaches its target and stops scheduling frames.

The measured trail includes parent borders when accumulating layout offsets. Two gap anchors keep the Builder controls and Teacher side cards clear without changing the hero geometry. Nearly vertical stretches have a gentle bow. A running maximum of sampled heights prevents backward jumps over the hero wiggles. Reduced motion draws the finished trail and braid; without JavaScript the original hero route stays visible and the About pitches and fallback lists remain readable.

The existing contour engine handles About's width-fitted, bottom-anchored four ridges using the same amp, blues scale, click/tap validation, and persisted mute setting. Both contour assets preload; the canvas changes section as needed. The initial observer notification preserves a first held tap; an explicit native 150ms touch regression covers it. Photo rings and the braid are excluded from contour hit testing. Browser capability failures, including a live motion-preference query failure, release enhancements and preserve the static content.

## Visual reference

Current rendered About sections, including the continuous trail:

- [Desktop, Light](about-redesign/1440-light.png)
- [Mobile, Dark](about-redesign/390-dark.png)

The four List View hero/Waypoint visual references are refreshed for the new lead and route. Other section and Climb references remain unchanged. CI's verification budget is 45 minutes to accommodate the added cross-browser coverage. The manually requested baseline-refresh job runs the two visual specs directly; normal PR verification runs the full suite.

## Before publication

The supplied Teacher images contain other people's names and faces, including the cohort, LinkedIn message, and session chat. As requested in the handoff, confirm their permission or redact/crop identifying details before publishing. This branch and PR do not deploy the site.

## Verification

- TypeScript, ESLint and production static export pass.
- Chromium and WebKit cover the three pitches, both rings, nine responsive sizes (including short landscape), both themes, clearance, fast-scroll catch-up, reduced motion, no JavaScript, DPR 2, native scrolling, first held touch, and both map handoffs.
- The broad regression run passed 160 cases initially. Its live preference-query failures were fixed; those cases and the resource-sensitive accessibility/landmark checks passed isolated reruns (7 passed, 1 Chromium-input-only skip).
- Final hero, link, navigation and canonical-content checks: 39 passed, 1 Chromium-input-only skip.
- Without a project base path, all 32 About cases passed; after fixing Safari's deferred back-facing images, all 28 metadata/asset/routing checks passed.
- The real Veritas iframe returned HTTP 200, created its video player and advanced to two seconds inside the card. Automated checks also verify that turning away unloads the iframe.
- Local Firefox cannot launch because its installed browser reports “Could not find profile folder”; the full GitHub Actions run includes Firefox. The PR's current check status remains the authority for merge readiness.
