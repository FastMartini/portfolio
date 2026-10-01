# Diego Martinez — Portfolio

An Editorial Alpine portfolio that presents Diego Martinez's work as a Mountain Journey. The application is a statically exported Next.js site designed for GitHub Pages, with semantic HTML as the durable experience and progressive visual layers added over time.

The homepage's SVG ridges and connected Waypoint trail remain available without JavaScript or WebGL. A Route Indicator tracks the current section and named narrative elevation from ordinary document scrolling; its landmark links remain usable before enhancement. One Motion scroll-progress signal drives section tracking and is available to future Atmospheric Layer consumers without frame-by-frame React renders. Reduced-motion preferences retain the static journey.

## Development

Use Node.js 22 or newer.

```bash
npm install
npm run dev
```

The local development server runs without a base path. Production acceptance tests build and serve the export beneath `/portfolio/`, matching the repository's GitHub Pages URL.

## Verification

```bash
npm run typecheck
npm run lint
npm test
```

Playwright tests exercise the public browser boundary against the production static export rather than component internals.

The Ascent suite includes desktop and mobile visual snapshots, native scrolling, direct section links, keyboard operation, and WCAG 2.2 AA checks. To intentionally refresh visual baselines, run `npm test -- --update-snapshots` and inspect the PNGs in `tests/ascent.spec.ts-snapshots/` before committing them.

## Deployment

Pull requests run type checking, linting, and the Playwright suite. A verified push to `main` builds the static export with GitHub's reported Pages base path and deploys it through GitHub Actions.
