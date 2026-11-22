# Active handoffs and implementation references

## Current design packages

- [Splash and Climb/List transitions brief](splash-and-view-transitions-design-handoff.md) and [source ZIP](splash-and-view-transitions-design-files.zip), covering the reported map glitch.

## Maintained implementation and validation notes

- [Map opening and transitions](map-opening-implementation.md), with review images in `map-opening-review/`.
- [Selected Branding iron reveal](hero-reveal-prototype.md).
- [Light/Dark implementation](theme-validation.md), with measurements and images in `theme-evidence/`.
- [GPU-cache regression validation](gpu-cache-stress-validation.md).
- [Alpine spruce implementation](alpine-spruce.md).
- [Optional ambient audio](ambient-audio.md).
- `reference/`: the approved illustrated Climb prototype, still read by the artwork acceptance tests and `content/journey.ts`. Its original build handoff has been retired; later implementation notes and ADRs supersede it.

Handoffs that have been implemented and merged are retired rather than kept
here: the illustrated Climb build handoff, and the contact section, contact
register and splash deboss packages from PR #38. The current packages and
maintained references above remain available.
