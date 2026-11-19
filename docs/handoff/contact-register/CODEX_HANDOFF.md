# Codex handoff: the Summit register (an email form in the Contact section)

Diego Martinez portfolio · prepared 2026-11-17 · repo root `diego-martinez-portfolio` · based on branch `feat/about-continuous-trail` at `fd44c84`

## 1. Prompt for Codex

Implement the approved change to the homepage's Contact section, `#summit` ("Let’s build what comes next."). The "Email Diego" link is replaced by a **message form that sends from the page**, styled as a summit register, the logbook climbers sign at the top of a peak.

- **Placement:** the form sits **beside the heading**.
- **Other links:** LinkedIn, GitHub, Devpost and Resume move into one full-width row below.
- **Reference:** the design is finished in a working HTML prototype, `prototype/index.html` in this bundle. Treat it as the **visual and behavioral reference**, not code to paste. Rebuild it in this repo's Next.js, React, TypeScript and plain-CSS conventions.

Before writing code:

1. Read `AGENTS.md` and the relevant guides in `node_modules/next/dist/docs/` (forms, client components, static export, environment variables). This Next.js version has breaking changes.
2. Open the prototype over HTTP, for example with `npx serve prototype`, so the contour mask loads. The bar at the bottom has prototype-only controls, none of which ship:
   - **Theme** switches Light and Dark.
   - **Next send** switches the simulated result between success and failure.
   - **Fill sample** fills the form with sample text.
   - **Reset** clears it.
3. Compare against the reference screenshots in `screenshots/`. Fonts in those captures fell back to system serif and sans because the capture machine was offline. The real site uses Newsreader and Manrope.
4. Read the current source:
   - `components/list-view.tsx`: the `#summit` section.
   - `components/climb/StopCards.tsx`: the Summit card.
   - `content/contact.ts`
   - `components/portfolio-link.tsx`
   - `components/resume-link.tsx`
   - `components/journey-ridge.tsx`
   - `content/site.ts`
   - `app/globals.css`: the Summit, `.contact-list` and footer rules.
   - `app/ascent.css`
   - `components/climb/climb.css`
   - `components/theme/theme.css`
   - `components/about/wheel.ts`
   - `components/climb/Climb.tsx`: `listTarget` and `hashChange`.
   - `tests/external-links.spec.ts`
   - `tests/home-navigation.spec.ts`
   - `tests/ascent.spec.ts`
5. Write a short plan that lists files and stages, then implement in stages. Run `npm run typecheck`, `npm run lint` and the relevant Playwright specs after each stage.

Don't commit, push or deploy unless Diego asks.

## 2. Open decision: confirm with Diego before Stage 3

The site is a static export on GitHub Pages and has no server, so delivering mail from the page needs a hosted form endpoint. The earlier contact handoff said a new service needs Diego's sign-off.

- **Recommended: Web3Forms.** It's free, there's nothing to host, and its access key is designed to be public. A plain HTML `POST` to `https://api.web3forms.com/submit` works **without JavaScript** and supports a `redirect` field. With JavaScript, `fetch` it and show the inline states.
  - **Check first:** confirm the current API fields, free-tier limits and spam options in Web3Forms' docs at implementation time. Don't rely on this note for those.
- **Alternative: Formspree.** Same pattern, different fields.
- **Key:** read it from `NEXT_PUBLIC_WEB3FORMS_KEY` at build time. Diego creates the key with his inbox, `diegommart2004@gmail.com`, and adds it to the Pages build environment. It's public by design, so it's safe in the exported HTML. Still keep it out of the repo source, so it can be rotated.
- **Without a key** (local dev, forks, or Diego not set up yet), the form must still be useful:
  - **Submit:** goes straight to the mailto fallback (section 6) instead of posting.
  - **Note:** "Sends straight from this page" changes to "Opens your email app".
  - **Endpoint:** no network request is attempted.

Build Stages 1–2 and the keyless path regardless. Wire the real endpoint in Stage 3 once Diego confirms the service.

## 3. What stays exactly as it is

- **Section anchors:** `#summit`, `#summit-title`, the `03 / Contact` kicker, "The next ascent", the h2 **"Let’s build what comes next."** and the intro paragraph. The intro is: "If you’re assembling a team, shaping an ambitious product, or want to compare notes, I’d be glad to hear from you." Tests and navigation depend on these.
- **Artwork:** `JourneyRidge summit` (ridge, contours, route, sun) and the section's dark `--deepest` ground with the copper radial glow, in both themes.
- **Destinations:** LinkedIn, GitHub and Devpost, all opening in a new tab with `noopener noreferrer`. The résumé goes through `ResumeLink`, which keeps its accessible name "View résumé (PDF, opens in a new tab)".
- **Plain mail link:** a native `mailto:` link to Diego's address stays on the page (section 4, "Prefer your own inbox?").
- **Footer** and "Back to the trailhead ↑".
- **No invented claims:** no response-time promise, no availability claims, no numbers. The reference screenshot Diego liked said "I usually reply within a day". That isn't confirmed, so don't add it.

## 4. Layout and markup (List View `#summit`)

### Structure

```
section.summit#summit
  JourneyRidge summit
  .section-kicker            03 / Contact            (unchanged)
  .summit-top                ← NEW 2-column grid
    .summit-heading          (existing markup, moved inside)
    form.summit-register     ← NEW (section 5)
  aside.summit-elsewhere     ← NEW, replaces .contact-list
    h3  "Elsewhere on the trail"
    nav.contact-list[aria-label="Diego’s profiles and résumé"]
      01 LinkedIn · 02 GitHub · 03 Devpost · 04 Resume
    p.summit-direct          "Prefer your own inbox? Write to <mailto link>."
```

### Desktop (> 1000px)

- **`.summit-top`:** `display: grid; grid-template-columns: minmax(0,5fr) minmax(0,6fr); gap: clamp(2.5rem,5vw,5.5rem); align-items: start;` with `margin: clamp(5rem,10vw,9rem) 0 clamp(4rem,8vw,7rem)`.
  - That margin replaces `.summit-heading`'s current vertical margin.
  - Remove the margin from `.summit-heading` inside `.summit-top` only.
- **Heading size:** the Summit h2 drops to `clamp(3.4rem, 6vw, 6.4rem)` to fit the narrower column. `.about h2, .summit h2` is a **grouped rule**, so scope the override to `.summit-top h2` and don't change the group.
- **`.summit-elsewhere`:** a grid with the same 5fr/6fr columns.
  - The h3 and the link row span the full width (`grid-column: 1 / -1`). The direct-mail line sits on its own row below the links.
  - The link row is `display: grid; grid-template-columns: repeat(4, minmax(0,1fr))`, with a top rule.
  - Each link is a cell: number, then label (Newsreader `clamp(1.45rem,2vw,1.9rem)`), then detail, then arrow.
  - Cells after the first get a left divider (`1px solid rgba(255,251,237,0.25)`) and `padding-left: 1.25rem`.
  - Each link keeps a bottom rule.
  - Hover keeps the existing copper colour and shift (`padding-left` +0.6rem).
- **Numbering:** 01–04. The existing numbered-row language stays, with one fewer row.

### Tablet (≤ 1000px)

- **Stacking:** `.summit-top` becomes one column, heading first, and the form is capped at `max-width: 44rem`.
- **Links:** 2×2. Reset the divider and padding on the third cell.

### Phone (≤ 600px)

- **Links:** one column, with no vertical dividers.
- **Form fields:** labels stack above their inputs. The footer of the form puts the button first and full width, and the note below it.
- **Spacing:** the Summit's existing `padding-block: 6rem` rule stays.

### Selectors

- **Rename carefully:** `.contact-list` is styled in `app/globals.css`, including the ≤600px rule. Either restyle it in place for the new 4-cell row, or rename it to `.summit-links` and delete the old rules. Don't leave dead CSS.
- **New rules:** use new `.summit-*` selectors. Don't touch `.section-kicker`, `.eyebrow`, the grouped h2 rule or `.journey-ridge` sizing. Those style other sections too.

## 5. The register form

### Component

- **Files:** a new client component, `components/summit/SummitRegister.tsx` (`"use client"`), and `components/summit/summit.css`, imported once.
- **Server rendering:** client components are still server-rendered, so the full form must be in the static HTML and usable without JavaScript.
- **Shared content:** put the address and copy in `content/contact.ts` (section 8).

### Markup

Copy the exact text from here.

```html
<form class="summit-register" action="https://api.web3forms.com/submit" method="POST" aria-labelledby="register-title" novalidate>
  <!-- hidden: access_key, from_name="Portfolio · Summit register",
       redirect=publicUrl("/#summit-sent"), subject fallback, honeypot botcheck -->
  <div class="summit-register-top">
    <h3 id="register-title">Sign the summit register</h3>
    <p class="summit-register-date">Entry · 17 Nov 2026</p>   <!-- today's date, client-side; omit on the server -->
  </div>
  To          Diego Martinez · diegommart2004@gmail.com   [Copy address]
  From        <input name="name"    autocomplete="name"  placeholder="Your name">
  Reply to    <input name="email"   type="email" required autocomplete="email" inputmode="email" placeholder="you@company.com">
  Subject (optional) <input name="subject" placeholder="A role, a project, or just hello">
  <textarea name="message" required placeholder="Tell me what you’re building…">   (visually-hidden label "Message")
  <p>Sends straight from this page. No email app needed.</p>
  <button type="submit">Sign &amp; send ↗</button>
</form>
```

- **Headings:** the order inside `#summit` is h2 (section), then h3 "Sign the summit register", then h3 "Elsewhere on the trail".
- **Labels:** every input has a real `<label for>`. The To row is static text, not an input.
- **`novalidate`:** only when JavaScript is running. In the server HTML, leave native `required` validation active for no-JS visitors, and add `novalidate` on mount.
- **Date line:** the "Entry · <date>" text is decorative. Render it only after mount, so there's no hydration mismatch. Use `en-GB`, `{ day: "numeric", month: "short", year: "numeric" }`.

### Visual spec (match the prototype)

- **Card:**
  - **Light:** `#fbf4e2` paper with `#1f2621` ink.
  - **Dark:** `#252f29` with `#ece6d2` ink.
  - **Shape:** radius 4px, with shadow `0 30px 80px -40px rgba(0,0,0,.75), 0 2px 0 rgba(0,0,0,.25)`.
  - **Padding:** `clamp(1.4rem, 3vw, 2.4rem)`.
  - **Theme tokens:** the Summit section is a fixed dark surface, but this card follows the theme. Give the form `data-theme-root=""` and its own scoped custom properties. Alternatively, derive them from existing tokens (`--raised`, `--r-ink`, `--r-muted`, `--ink-label`, `--r-accent`, `--line`), if that matches visually: `--raised` is `#fffbed` in Light, close to `#fbf4e2`. Either way, follow ADR 0005 and keep palette variables off the SVG.
- **Paper grain:** `public/splash/grain.png` at 192px as a `::before`.
  - Light: `mix-blend-mode: multiply; opacity: .18`.
  - Dark: `screen` at `.08`.
- **Contours:** the hero contour artwork, `public/hero-contours.svg`, used as a mask, sitting in the top-right corner.
  - Colour and opacity: `#b5653b` at .32 in Light, `#e3a983` at .16 in Dark.
  - Make the URL base-path safe, the same way `globals.css` already references it.
- **Keyline:** 1px, `color-mix(in srgb, #b5653b 55%, transparent)`, inset 8px. This is the same language as the Topo photo frame in About.
- **Header:**
  - The h3 is Manrope 800, 0.67rem, letter-spacing .16em, uppercase, in `--ink-label`, with a 0.45rem copper dot before it.
  - The date is Newsreader italic, 0.95rem, muted.
- **Field rows:**
  - Grid `6.5rem | 1fr`, separated by hairline rules (`rgba(31,38,33,.16)` Light, `rgba(236,230,210,.16)` Dark). The first row also gets a top rule.
  - Labels are Manrope 800, 0.62rem, .14em, uppercase. "(optional)" is in muted text, not uppercase.
  - Inputs are transparent, Manrope 500, 1.05rem, min-height 2.6rem.
  - Focus is a 2px copper outline with offset 0. Inside the card, override the global double-ring focus style.
- **Message:**
  - Newsreader 1.25rem with a 2rem line-height, on ruled lines: `repeating-linear-gradient` with `background-attachment: local`, so the lines scroll with the text.
  - The placeholder is italic. Minimum height is 6 lines, with `resize: vertical`.
- **Copy address chip:**
  - A pill with a 1px rule border, Manrope 700, 0.68rem, min-height 32px.
  - Extend its hit area to 44px with a `::after` inset of −6px.
- **Send button:** a pill with min-height 3.25rem, Manrope 700, 0.85rem.
  - Light: `#173f35` / `#fffbed`, hovering to `#285d4f`.
  - Dark: `#e9e1cc` / `#173f35`, hovering to `#fffbed`.
  - It has the existing diagonal arrow and lifts 2px on hover. No lift with reduced motion.

### Behavior (with JavaScript)

- **Validation**, on submit and live after the first error:
  - **Reply to:** empty shows "Add an email so I can write back." An invalid address shows "That address looks incomplete."
  - **Message:** empty shows "Write a line or two first."
  - **Errors:** shown in copper (`#8b4428` Light, `#e3a983` Dark) under the field, linked through `aria-describedby`. Set `aria-invalid="true"` and a faint copper tint on the field.
  - **Focus:** moves to the first invalid field.
  - **Required fields:** From and Subject are optional.
- **Sending:**
  - `fetch(action, { method: "POST", headers: { Accept: "application/json" }, body: new FormData(form) })`.
  - While it runs, the button gets `aria-busy="true"`, is disabled, and reads "Sending…". The arrow nudges up and right, which is off for reduced motion.
- **Sent:**
  - The form body is replaced by the confirmation panel.
  - **Stamp:** a 9.5rem copper double-ring "Signed" stamp, rotated −9°, with the mountain-and-flag glyph and today's date. It presses in (scale 1.5 → 1 over 520ms). With reduced motion it appears without animating.
  - **Heading:** "Thanks, <first name>. It’s in my inbox." Without a name, it reads "Your note is in my inbox."
  - **Line:** "I’ll reply to <email>."
  - **Button:** "Write another note" resets the form and focuses From.
  - **Focus:** moves to the panel (`tabindex="-1"`).
- **Failure** (network error, a non-OK status, or `success: false`):
  - **Draft:** stays in place.
  - **Alert:** `role="alert"` with a copper left rule: "**That one didn’t reach me.** Your note is still here. Try again, or send it from your own email instead."
  - **Actions:** "Try again" (submit), "Open in my email app" (the prefilled mailto, section 6), and "Copy address".
- **Copy address:**
  - `navigator.clipboard.writeText` inside the click handler. The label changes to "Copied" for 1.8s.
  - If the clipboard is refused, show the address in the label instead.
- **Draft persistence:** store `{name, email, subject, message}` in `localStorage` under `summit-register-draft`, wrapped in try/catch. Restore it on mount and clear it after a successful send.
- **Honeypot:** a visually hidden, `tabindex="-1"`, `aria-hidden` checkbox named `botcheck`. If it's checked, don't submit.

### Without JavaScript

- **Submit:** native `required` validation runs, the form posts to Web3Forms, and Web3Forms redirects to `publicUrl("/#summit-sent")`. `publicUrl` comes from `content/site.ts`, so this works with the `/portfolio` base path.
- **Success note:** add a server-rendered `<p id="summit-sent" class="summit-sent-note" tabindex="-1">`. It's hidden by default and shown with `#summit-sent:target`.
  - Text: "Thanks — your note was sent. I’ll reply to the address you left."
  - Give it `scroll-margin-top` like other anchors.
  - `listTarget()` in `Climb.tsx` already treats List View hashes as reading targets. Confirm that landing on `#summit-sent` with JavaScript on doesn't break anything.
- **Keyless build:** the form's `action` falls back to `mailto:diegommart2004@gmail.com` with `method="post" enctype="text/plain"`. As a last resort, it can render the direct-mail line only. Pick whichever passes the no-JS test cleanly, and say which in the PR notes.

## 6. The mailto fallback

```
mailto:diegommart2004@gmail.com
  ?subject=<subject, or "Hello from <name>", or "Hello from your portfolio">
  &body=<message>\n\n— <name>\n<reply-to email>
```

Encode every part with `encodeURIComponent`. Mail links keep normal behavior: no `target`, as `PortfolioLink` already does.

## 7. Interactions with existing systems

- **Gentle wheel** (`components/about/wheel.ts`): it already returns early for `input, textarea`. Confirm wheel scrolling inside a long message scrolls the textarea, not the page glide.
- **Climb header navigation:** "Contact" still targets `#summit` in both views. The Trailhead "Contact me" button is unchanged.
- **Focus styles:** the global `:where(a, button):focus-visible` copper and edge ring stays for buttons and links. Only text fields inside the card use the simpler 2px copper outline.
- **Theme transitions:** with `data-theme-root` on the card, `ThemeProvider` animates it with the rest of the UI. If you use custom card properties instead, make sure they don't jump mid-transition. Deriving from the tokens avoids this.

## 8. Content changes (`content/contact.ts`)

```ts
export const contactEmail = "diegommart2004@gmail.com";
export const contactLinks = [ /* LinkedIn, GitHub, Devpost: unchanged, Email removed */ ] as const;
export const summitRegister = {
  title: "Sign the summit register",
  note: "Sends straight from this page. No email app needed.",
  noteWithoutService: "Opens your email app.",
  placeholders: { name: "Your name", email: "you@company.com", subject: "A role, a project, or just hello", message: "Tell me what you’re building…" },
  // + error, sent and failure strings from section 5
} as const;
```

Update every importer of `contactLinks`. It's used in `list-view.tsx` and `StopCards.tsx`.

## 9. Climb view: the Summit card

The card is narrow (`min(30rem, 40vw)`) and capped at `52svh` on phones, so the full form doesn't go in it.

- **Content:** keep the heading and intro. Above the links, add **one primary action**, a `button-primary` styled link: **"Write to Diego"** → `href="#summit-register"`.
  - Give the List View form `id="summit-register"`.
  - `Climb.tsx`'s `hashChange` already reveals List View, scrolls to the target and focuses it when the hash points inside `.climb-list`. Verify that this lands focus on the form, or on its first field via a small focus handoff, in both reduced and normal motion.
- **Links:** LinkedIn, GitHub, Devpost and Resume stay in the existing `.climb-card-contact` list. Add a final row, "Email · diegommart2004@gmail.com", as a plain `mailto:`, so the address stays reachable from the card.
- **Reachability:** check the card at 1440×900 and 390×844. Every action must stay reachable, and keyboard-reachable, if the card scrolls internally.

## 10. Tests

### Update

- **`tests/home-navigation.spec.ts`:** Résumé and Devpost parity in both views and without JavaScript should still pass. Adjust the locators if the link container or name changed.
- **`tests/external-links.spec.ts`:**
  - The internal-links check expects at least one `mailto:` link with no `target`. The direct-mail line satisfies that, so keep it.
  - The Devpost popup tests stay as they are.
- **`tests/ascent.spec.ts`:**
  - The **`summit-desktop` snapshot** (Dark, 1440, reduced motion) changes by design. Regenerate it, and attach before and after images to the PR notes for Diego to approve.
  - The Summit sun and artwork test (320–3840, with and without JavaScript) must still pass. The taller content only grows the section.

### Add

- **No JavaScript:**
  - The form, its labels and the four links render, and native `required` blocks an empty submit.
  - Mock `api.web3forms.com` and submit. The page lands on `#summit-sent`, and the note is visible.
- **With JavaScript:**
  - An empty submit shows both errors, sets `aria-invalid`, and focuses Reply to.
  - Fixing the email clears its error live.
- **Success:** route the endpoint to `{ success: true }`. The confirmation shows the name and email, focus moves to the panel, and the localStorage draft is cleared.
- **Failure:** route to a 500. The alert appears, the draft is kept, and the "Open in my email app" `href` is a mailto containing the encoded subject, body, name and email.
- **Keyless build** (`NEXT_PUBLIC_WEB3FORMS_KEY` unset): no request to `api.web3forms.com` is made, and submit uses the mailto path.
- **Headings:** inside `#summit` the order is h2, then h3 "Sign the summit register", then h3 "Elsewhere on the trail". Axe passes on `#summit` in Light and Dark.
- **Climb:** the Summit card has "Write to Diego". Activating it reveals List View with focus in the register.

## 11. Acceptance checks

- [ ] **1440:** the heading is on the left and the register on the right, top-aligned. The four links run in one row below, with dividers. "Prefer your own inbox?" sits under them. This matches `screenshots/summit-1440-*.png`.
- [ ] **768:** the heading, then the register (max 44rem), then the links 2×2. Matches `summit-768-*`.
- [ ] **390 and 320:** a single column. Labels stack above their inputs, the button is full width, there's no horizontal overflow, and the links stack. Matches `summit-390-*`.
- [ ] **Landscape phone (844×390) and short heights:** the form stays usable, and the page scrolls normally to every field.
- [ ] **Light and Dark:** the Summit stays dark. The card follows the theme (cream paper in Light, dark green-grey in Dark). Body text and labels reach at least 4.5:1, and placeholders at least 3:1.
- [ ] **States** match `screenshots/state-errors-*`, `state-failure-*` and `state-sent-*`.
- [ ] **Keyboard:** the tab order is Copy address → From → Reply to → Subject → Message → Sign & send → the four links → the mail link. Focus is visible everywhere. Enter in a single-line field submits the form.
- [ ] **Screen reader:** errors, the alert and the sent panel are announced. The Copy chip's label change is announced politely.
- [ ] **200% zoom:** no overlap or clipped fields.
- [ ] **Reduced motion:** no stamp animation, no button lift, no arrow nudge.
- [ ] **No JavaScript:** the form posts and the `#summit-sent` note shows. All links work.
- [ ] **No key:** a mailto-only experience with no network request.
- [ ] **Base path:** works under `NEXT_PUBLIC_BASE_PATH=/portfolio` (`npm run preview:hero`). Grain, contours, résumé and the redirect URL all resolve.
- [ ] **Climb Summit card:** "Write to Diego" works, and the card doesn't trap any action at 1440×900 or 390×844.
- [ ] **Checks pass:** `npm run typecheck`, `npm run lint`, and the Playwright suite, with the regenerated `summit-desktop` baseline.

## 12. Out of scope

- Trailhead, About, the continuous trail, Selected Work and splash.
- Climb scenery and the Summit flag.
- Theme token values.
- Adding the Web3Forms key, which Diego does.
- Any analytics on submissions.

No commits or deploys without Diego's go-ahead.

## 13. Bundle contents

- `CODEX_HANDOFF.md`: this file.
- `prototype/index.html`: the working prototype. The form logic is in the final `<script>`.
  - The send is **simulated**, because the prototype host blocks outside requests. The production `fetch` call is noted in a comment above `deliver()`.
  - The Resume link points to `#resume`. Use `ResumeLink` in the repo.
- `prototype/grain.png`, `prototype/hero-contours.svg`: copies of the repo's existing `public/splash/grain.png` and `public/hero-contours.svg`. Use the repo copies, not these.
- `screenshots/`:
  - `summit-{1440,768,390}-{light,dark}.png`: the full section.
  - `state-{errors,failure,sent}-{light,dark}.png`: the register states at 1440.
  - Fonts in these captures are system fallbacks, because they were captured offline.
