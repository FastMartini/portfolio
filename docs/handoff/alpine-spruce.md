# Alpine spruce trees

The `c_tree_design_handoff` supplied on October 25, 2026 selects option 1c, Alpine spruce, for the illustrated Climb. [The supplied browser prototype](reference/alpine-spruce-reference.html) is retained as design evidence. Its alternate styles and review query parameters belong to that prototype; the portfolio renders the selected spruce design directly.

`components/climb/mountain/scenery.ts` implements the supplied shapes, colors, glades, crown clearance, and shorter, snowy trees near the treeline. Eighteen fixed SVG definitions (12 spruce and six snowy spruce) are reused through `<use>` instances. `scene.ts` inserts those definitions into the same mountain SVG as the trees. Drawing remains deterministic server content; scrolling and resizing do not rebuild the forest.

Tree appearance and thinning use a generator seeded from each tree's position. Each candidate tree still consumes its original single tone draw from the shared scenery generator, even when a glade or clearing removes it. This preserves cloud placement and all terrain output. `tests/fixtures/scenery-before-trees.json` was captured from the original renderer at `41e8848` before replacement; `tests/climb-trees.spec.ts` compares those non-tree layers byte for byte and checks deterministic output and resolved SVG references across Chromium, Firefox, and WebKit.

`tests/climb-mountain.spec.ts` compares the selected prototype and production scenery at desktop and mobile sizes, including tree definitions and `<use>` placements. The unused alternative tree definitions are excluded from the prototype comparison. Existing Landmark artwork checks continue to use the original Climb reference.
