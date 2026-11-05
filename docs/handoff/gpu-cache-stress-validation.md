# Visible Chrome GPU-cache regression

The fix reduces compositor work while preserving the live SVG scenery, mountain clipping, native scrolling, Snow, and SMIL animation. It removes the redundant cloud rectangles, applies Landmark and header highlight states without compositor transitions, and requests a CPU-backed context for the small Snow canvas.

The removed cloud clip covered `(-4000, -4000) → (5000, 5000)`. All 46 seeded clouds fit entirely inside it. A browser regression verifies those bounds; the scenery fixture still compares every shape and paint attribute byte-for-byte, allowing only removal of that clip attribute. Reference pixel limits and visual baselines remain unchanged.

## Same-session control

macOS, installed Chrome **156.0.8078.81**, physical content area **1200 × 760**, **DPR 2**, `--force-gpu-mem-available-mb=128`:

| Code | Captured frames | Frames exposing backing |
| --- | ---: | ---: |
| Previous head `0abf33f` | 418 | 57 |
| Fix, repetition 1 | 419 | 0 |
| Fix, repetition 2 | 413 | 0 |
| Fix, repetition 3 | 410 | 0 |

Every run asserted and captured settled rendered positions `0.0000 → 1.0000 → 0.0000`. The three final repetitions inspected **1,242 frames**. Four earlier runs of the candidate also passed. No memory limit, scroll input, endpoint assertion, or zero-missing-paint assertion was relaxed. The coverage attachment now records browser version, headed mode, viewport, and DPR alongside the existing results.

Reproduce using the production export:

```bash
SCROLL_BROWSER_CHANNEL=chrome SCROLL_BROWSER_HEADED=1 npm test -- tests/climb-rendering.spec.ts --project=chromium --workers=1 --grep 'whole route' --repeat-each=3
```

Chromium/WebKit reference comparisons, animation and resize checks, Snow recovery checks, and all 14 macOS visual comparisons passed without snapshot updates. The broader local run also reproduced the previously reviewed raw-coordinate pointer-test flake. Local Firefox could not launch its temporary profile, including after refreshing the Playwright installation; Linux CI supplies the Firefox verification.

The tradeoffs are CPU drawing for the bounded Snow effect and immediate hover/focus highlights. This validation covers the reproduced cache-stress failure; it does not establish that every possible rendering defect is absent.
