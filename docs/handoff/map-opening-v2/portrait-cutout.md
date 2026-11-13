# List View portrait cutout

The List View hero uses an AI-assisted background extraction of the existing
portrait. The original photographs remain in `public/photos/dm-*.webp` and
continue to serve the Climb portrait.

- Tool: built-in image generation, edit mode, transparent background enabled.
- Input: `public/photos/dm-1920.webp`.
- Selected PNG: `public/photos/dm-cutout.png` (1086 × 1448, RGBA).
- Responsive browser assets: `dm-cutout-480.webp`, `dm-cutout-800.webp`,
  `dm-cutout-1086.webp`, with lossless alpha and quality 88 RGB compression.
- The reserved hero dimensions, cover crop, centered greeting and shared reveal
  timing remain unchanged. The rectangular photograph's edge masks are removed;
  the cutout's own alpha defines the natural hair/shoulder outline.

## Final edit prompt

Use case: background-extraction. Edit target: the attached existing photograph
of Diego for his portfolio hero. Remove ONLY the background to real alpha
transparency. Keep the exact original photographed person, face, smile, facial
features, skin texture, curly hair including fine loose strands, body silhouette,
shoulders, jacket, white shirt, strap, pose, original lighting and colors unchanged.
Do not redraw, beautify, retouch, reinterpret, relight or regenerate the person.
Remove all brick wall, plants, vases, chairs, handle, wires, and other environment
behind him. The person alone should remain on transparent pixels, with clean
natural detailed hair edges and no background halo. Preserve the original portrait
canvas, subject scale, position, and bottom/side crop. No added body parts, no text,
no border, no shadow, no solid or checkerboard backdrop. Output a genuine
transparent PNG cutout.
