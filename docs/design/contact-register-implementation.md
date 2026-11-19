# Summit register implementation

Reference: [Codex contact register handoff](../handoff/contact-register/CODEX_HANDOFF.md), extracted from the supplied `contact-register-handoff.zip` design bundle. The prototype and reference captures remain in that local bundle.

1. Layout: add `components/summit/SummitRegister.tsx` and `summit.css`, update the Summit in `components/list-view.tsx`, move the profile links into four cells, and add the register action to `components/climb/StopCards.tsx`. Preserve the section copy, artwork, anchors, footer, and link destinations.
2. Keyless interactions: share copy in `content/contact.ts`; add accessible validation, copying the address, a client-rendered date, local draft persistence, and an encoded mailto fallback. Keep the native `mailto:` POST with `text/plain` encoding and native validation for visitors without JavaScript. Verify both views, themes, small screens, and the static export under `/portfolio`.
3. Hosted delivery: Diego selected Web3Forms after reviewing the keyless flow. Wire the build-time key, native POST/redirect, sending/sent/failure states, and mocked delivery tests. The key itself stays outside source control.

Run typecheck, lint, and relevant Playwright specs at each stage. Update only the changed Summit screenshot baseline. The original implementation stopped before committing, pushing, or deploying; Diego subsequently requested this pull request.

## Current implementation

The register now supports both configured Web3Forms delivery and the keyless fallback. The keyless form uses a native `mailto:` POST with `text/plain` encoding without JavaScript; with JavaScript it validates the draft and opens an email composed from the subject, message, name, and reply address. It then shows a “Note prepared” stamp with a way to reopen the email app or return to the saved draft. Opening an email app does not clear the draft or claim successful delivery.

With `NEXT_PUBLIC_WEB3FORMS_KEY` present at build time, the form sends directly to Web3Forms. “Sending…” disables duplicate submissions and makes fields read-only. Only an OK HTTP response with `success: true` shows the “Signed” visual, moves focus to the confirmation, and clears the stored draft. Network errors, a 20-second timeout, invalid responses, non-OK statuses, and service rejection keep the note and offer retry, a prefilled email-app fallback, and address copying. “Write another note” returns to the empty form with focus on From.

The root cause of the missing visual was the original keyless submit handler: it opened `mailto:` without ever rendering a confirmation. A regression reproduced that missing visual twice before the change. A prepared confirmation now covers that path, while the sent visual requires actual service acknowledgement.

Native forms POST to the service without JavaScript and redirect to the same-site `publicUrl("/#summit-sent")` note. The existing Climb hash handler reveals this List View destination when scripts are enabled. AJAX submissions omit `redirect` so the response stays JSON.

The register derives its palette from the existing animated UI tokens and registers its own theme root. Light uses the existing `--raised` cream (`#fffbed`), an allowed variation from the reference paper. Grain and contours use bundled CSS asset URLs, preserving the project base path. The existing Climb hash handler already reveals and focuses the form, so no navigation changes were needed.

Typecheck and lint pass. All 25 keyless register tests pass in Chromium and WebKit, including native validation without JavaScript, mailto encoding, draft restore, clipboard success/refusal, storage failure, honeypot suppression, heading order, Axe in both themes, responsive layout, keyboard order, textarea scrolling, and the Climb focus handoff with both motion preferences. The broader Chromium checks cover the existing List View, outbound links, all nine Climb stops, and artwork from 320–3840 pixels. The previous no-JavaScript assertion that the page contained no forms now requires the register instead.

Five affected snapshots were refreshed on both macOS and Linux: the List View Summit and the four Light/Dark desktop/mobile Climb Summit captures. The decorative date is fixed in the List View snapshot test. The [Linux refresh workflow](https://github.com/FastMartini/portfolio/actions/runs/44439839463) passed typecheck, lint, and all 21 visual snapshot tests; only its five changed Summit captures were added. Deployment jobs were skipped for the feature branch. Firefox tests are configured but could not launch locally: Playwright’s Firefox exits with “Could not find profile folder,” including with an alternate temporary directory.

## Activation

1. Create a free Web3Forms form for `diegommart2004@gmail.com` at <https://web3forms.com/#start> and verify the inbox.
2. For local development, copy `.env.example` to `.env.local`, supply the public form key, and restart the dev server. Never commit the configured file.
3. For GitHub Pages, set repository variable `NEXT_PUBLIC_WEB3FORMS_KEY` under Settings → Secrets and variables → Actions → Variables. The Pages build reads that variable. The key is embedded in static HTML by design; no inbox password or mail-server credentials are involved. Rebuild to apply key changes. No live key has been supplied or configured yet.

`npm run test:contact-delivery` builds with a fake key and mocks every submission. Its 14 cases cover delayed success, duplicate suppression, optional fields, five failure modes, retry, draft clearing/retention, normal/reduced motion, both themes with Axe at 320px, and native POST/redirect without JavaScript. They pass in Chromium and WebKit; the native redirect mock uses a meta refresh in WebKit because Playwright cannot fulfill a 303 there. CI runs it on the first shard of each browser in addition to the normal keyless suite. Tests explicitly override any local live key so validation cannot send real messages.

## Provider documentation checked

- [API reference](https://docs.web3forms.com/getting-started/api-reference): browser POST endpoint, `access_key`, `email` as reply-to, optional subject, JSON success, and native redirect.
- [Simple React form](https://docs.web3forms.com/how-to-guides/js-frameworks/react-js/simple-react-contact-form): multipart `FormData` and `success` response handling.
- [Custom redirection](https://docs.web3forms.com/getting-started/customizations/redirection): full same-domain URL for free-plan native redirects; omit the field with JavaScript.
- [Pricing](https://web3forms.com/pricing): free tier allows 250 monthly submissions, custom redirects, built-in spam protection, and hCaptcha. Uploads, autoresponders, domain restrictions, reCAPTCHA, and Turnstile require paid features and are unused here.
- [Spam protection](https://docs.web3forms.com/getting-started/customizations/spam-protection): Web3Forms performs server-side filtering. Its [honeypot page](https://docs.web3forms.com/getting-started/customizations/spam-protection/spam-protection) now discourages relying on the honeypot alone; the handoff’s client-side bot check remains a supplemental guard. No CAPTCHA script is added to the native no-JavaScript flow.
