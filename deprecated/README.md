# Archived portfolio files

Files here are retained for reference and recovery. They are outside the Next.js
application and public asset directories, and are excluded from linting and type
checking.

| Location | Original location | Reason |
| --- | --- | --- |
| `docs/handoff/CODEX_HANDOFF (1).md` | `docs/handoff/CODEX_HANDOFF (1).md` | Extra copy of the canonical handoff. |
| `docs/handoff/codex-handoff/` | `docs/handoff/codex-handoff/` | Duplicate handoff package; the maintained copy remains in `docs/handoff/`. |
| `assets/photos/dm.jpg` | `public/photos/dm.jpg` | Original portrait; the site serves the four responsive WebP versions instead. |
| `components/climb/TrailSign.tsx` | `components/climb/TrailSign.tsx` | Removed bottom-left orientation card; Waypoint markers and the Trail Rail provide navigation. |

The active handoff and `docs/handoff/reference/` remain in place because the
artwork acceptance tests use them. Application modules, test fixtures, visual
baselines, scripts, architecture decisions, and agent skills remain active.

`local/` and `generated/` contain local-only recovery material and are ignored by
Git. `local/before-cleanup/` preserves the former working tree's staged and
unstaged patches, index, untracked files (including the original root resume PDF
and files ending in ` 2`), branch list, and worktree list. Its verified
`before-cleanup.bundle` contains every branch and the existing Git stashes from
before branch cleanup. `generated/` preserves earlier build and test output.

To inspect the saved branches without changing the working tree:

```bash
git bundle list-heads deprecated/local/before-cleanup/before-cleanup.bundle
```

To recover a removed branch, replace `<branch>` with its original name:

```bash
git fetch deprecated/local/before-cleanup/before-cleanup.bundle 'refs/heads/<branch>:refs/heads/<branch>'
```

`local/resume-replacements/` preserves dated incoming résumé uploads and previous
published PDFs. The current PDF alone belongs in `public/resume/`, using its
existing filename so public links remain stable. These local copies are ignored
by Git and are not served by the site.

New build output still belongs in the ignored `.next/`, `out/`, `test-results/`,
and `playwright-report/` directories. Dependencies stay in `node_modules/`.
