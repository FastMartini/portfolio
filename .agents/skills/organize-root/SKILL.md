---
name: organize-root
description: Organize a project or repository root by moving useful files and folders into appropriate locations and archiving confirmed obsolete items under deprecated/. Use when asked to clean up a project root, sort loose files, or archive old project material.
---

# Organize Project Root

## Inspect the project

1. Resolve the requested root, defaulting to the current project's root. Treat nested projects, workspaces, submodules, and symlinks as boundaries. Do not traverse symlinks outside the root.
2. Read applicable project instructions. Inventory root entries, including dotfiles, and inspect Git status when available so existing edits and untracked files are accounted for.
3. Inspect candidate contents and follow references through imports, scripts, configuration, CI and deployment, docs, and assets. Check implicit file discovery, globs, public URLs, and path conventions. A missing exact-name search result alone does not prove an item is unused.

## Choose destinations

- Keep files at the root when the project, its tooling, or its users expect them there. Common examples include manifests, lockfiles, root documentation, license files, version-control configuration, project instructions, and framework entry points.
- Move useful items to the project's existing locations. Where there is a clear group with no home, use a descriptive folder such as `docs/`, `scripts/`, or a project-appropriate assets directory. Check whether the destination changes how the runtime, build, or site exposes the item. Create folders only as needed.
- Move confirmed obsolete material such as superseded drafts, retired prototypes, and redundant backups to `deprecated/<original-relative-path>`. Look for evidence of replacement or retirement before archiving. Preserve file contents and use a unique destination when a name collides.
- Leave uncertain items in place and report what makes their purpose unclear. Keep secrets and local environments in place. Exclude tool-managed caches, dependency directories, and build output from routine reorganization. Check that the archive is outside active build, test, and publish discovery before moving anything into it.

## Move and verify

1. Record each proposed source, destination, reason, and required reference update. Apply supported moves directly when the user asks for cleanup. Return the proposed moves only if the user asks for a preview.
2. Check for collisions before moving and preserve existing local edits. Update references affected by moves, including relative paths inside relocated files, command invocations, CI settings, and documentation links. Keep changes scoped to the cleanup.
3. Review the resulting tree and Git diff, if available. Check active references and run relevant existing project checks. If a move breaks behavior and a scoped fix is unavailable, reverse that move and its associated edits while preserving the user's work.
4. Report the completed moves using old and new paths. Include uncertain items the user may want to review and the verification results. Never delete files as part of this workflow.
