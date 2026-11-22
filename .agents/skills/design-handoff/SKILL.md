---
name: design-handoff
description: Package relevant, current frontend design code and a planning brief for Claude or another reviewer. Use when asked to hand off a design, portfolio section, animation, component, or UI workflow for critique, planning, or deliberation.
---

# Design handoff

Produce a single Markdown handoff the user can review and attach to Claude. Prepare evidence and planning questions. Preserve project files and leave implementation and transfer to separate user requests.

## Scope and snapshot

1. Identify the design decision and the surface it affects. Use the user's active task, named routes, and visible project context to infer scope when possible. With no specific brief, cover the primary design surface and ask Claude for a prioritized critique and plan. If no project source is accessible, ask for the project or a source export.
2. Identify the project root and trace the normal entry point into the affected components. Follow direct dependencies that materially control the result, such as shared layout, theme tokens, styles, fonts, responsive rules, motion and reduced-motion hooks, relevant configuration, and existing asset references. Include package or framework versions when they affect the analysis. Avoid boilerplate and unrelated modules.
3. For Git projects, inspect current branch or detached state, HEAD, status, and relevant staged and unstaged changes. Read current working-tree files directly, including relevant untracked files. Use HEAD only for baseline metadata and comparison unless the user requests a specific revision. Summarize relevant deletions and changes when they explain the current state. For non-Git projects, state the source and capture time. If an explicitly requested revision or incomplete remote snapshot limits freshness, state that in the brief.
4. Select full files for core behavior and labeled line-range excerpts for large supporting files. Preserve source verbatim except for marked redactions. Exclude credentials, environment files, private data, dependency folders, caches, build output, large binaries, and unrelated code. Screen selected text and any review notes before embedding them. Represent design assets with paths and explain any material visual context that requires a separate attachment. Use available screenshots or recordings only within scope and distinguish direct observations from expected behavior inferred from code.

## Assemble the Markdown

Use a descriptive filename such as `portfolio-hero-design-handoff.md`. Keep the sections in this order.

- **Prompt for Claude.** Explain the planning task, the user goal, hard constraints, and the decisions open to change. Ask Claude to ground findings in the supplied code, compare viable options and tradeoffs, recommend a direction, and produce a staged implementation plan with affected files, accessibility and responsive checks where relevant, and precise acceptance criteria. Ask for missing evidence or open questions. Ask Claude to stop at planning unless the user requests implementation.
- **Snapshot.** Include project identity, capture time with timezone, branch and short commit where available, and the status of relevant local edits. Describe the current implementation and visible behavior. Keep confirmed behavior, user preferences, and uncertainties distinct.
- **Source index.** List each included relative path, its role, and whether it is a full file or excerpt. Note relevant omitted dependencies, assets, and redactions.
- **Source.** Embed the actual selected code under path headings. Include real line ranges for excerpts and use fences long enough to contain any embedded fences. Keep the brief compact by trimming peripheral context first. Never silently truncate a file.

Verify that the package stands alone, the key paths and source blocks match the current snapshot, the evidence covers the planning question, and any gaps are visible. If files changed during packaging, refresh the affected source and metadata before delivery. Save and link the handoff using the available artifact workflow, then tell the user to attach it to Claude and use the prompt at the top. Only transmit source directly if the user explicitly requests it and an authorized destination is available.
