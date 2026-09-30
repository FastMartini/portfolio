# Diego Martinez — Portfolio

An Editorial Alpine portfolio that presents Diego Martinez's work as a Mountain Journey. The application is a statically exported Next.js site designed for GitHub Pages, with semantic HTML as the durable experience and progressive visual layers added over time.

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

## Deployment

Pull requests run type checking, linting, and the Playwright suite. A verified push to `main` builds the static export with GitHub's reported Pages base path and deploys it through GitHub Actions.
