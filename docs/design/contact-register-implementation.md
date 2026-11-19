# Summit register implementation

Reference: [Codex contact register handoff](../handoff/contact-register/CODEX_HANDOFF.md), extracted from the supplied `contact-register-handoff.zip` design bundle. The prototype and reference captures remain in that local bundle.

1. Layout: add `components/summit/SummitRegister.tsx` and `summit.css`, update the Summit in `components/list-view.tsx`, move the profile links into four cells, and add the register action to `components/climb/StopCards.tsx`. Preserve the section copy, artwork, anchors, footer, and link destinations.
2. Keyless interactions: share copy in `content/contact.ts`; add accessible validation, copying the address, a client-rendered date, local draft persistence, and an encoded mailto fallback. Keep the native `mailto:` POST with `text/plain` encoding and native validation for visitors without JavaScript. Verify both views, themes, small screens, and the static export under `/portfolio`.
3. Hosted delivery: pending Diego’s approval of Web3Forms or another provider, as required by section 2 of the handoff. After approval, verify the provider’s current documentation, wire the build-time key, native POST/redirect, sending/sent/failure states, and mocked delivery tests. No service key is added in stages 1–2.

Run typecheck, lint, and relevant Playwright specs at each stage. Update only the changed Summit screenshot baseline. The original implementation stopped before committing, pushing, or deploying; Diego subsequently requested this pull request.

## Current implementation

Stages 1–2 are implemented. The keyless form uses a native `mailto:` POST with `text/plain` encoding without JavaScript; with JavaScript it validates the draft and opens an email composed from the subject, message, name, and reply address. Opening an email app does not clear the draft or claim successful delivery.

The register derives its palette from the existing animated UI tokens and registers its own theme root. Light uses the existing `--raised` cream (`#fffbed`), an allowed variation from the reference paper. Grain and contours use bundled CSS asset URLs, preserving the project base path. The existing Climb hash handler already reveals and focuses the form, so no navigation changes were needed.

Typecheck and lint pass. All 22 new register tests pass in Chromium and WebKit, including native validation without JavaScript, mailto encoding, draft restore, clipboard success/refusal, storage failure, honeypot suppression, heading order, Axe in both themes, responsive layout, keyboard order, textarea scrolling, and the Climb focus handoff with both motion preferences. The broader Chromium checks cover the existing List View, outbound links, all nine Climb stops, and artwork from 320–3840 pixels. The previous no-JavaScript assertion that the page contained no forms now requires the register instead.

Five affected macOS snapshots were refreshed: the List View Summit and the four Light/Dark desktop/mobile Climb Summit captures. The decorative date is fixed in the List View snapshot test. Linux baseline refresh remains pending: the local Docker daemon is unavailable, and no CI run, push, or deployment was initiated. Firefox tests are configured but could not launch locally: Playwright’s Firefox exits with “Could not find profile folder,” including with an alternate temporary directory.

Stage 3 remains pending the service decision. Sending/sent/failure states, hosted POST, success redirect, and delivery tests belong to that stage; no service endpoint or key is currently wired.
