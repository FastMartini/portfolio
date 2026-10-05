import { WORLD_WIDTH } from "../geometry";

export function trailheadSign() {
  return '<g transform="translate(' + (WORLD_WIDTH * 0.3 - 70) + ' 3152) scale(1.35)">' +
        '<ellipse cx="6" cy="1" rx="44" ry="5" fill="#1f2621" opacity="0.22" filter="url(#lm-blur)"/>' +
        '<rect x="-33" y="-64" width="7" height="64" rx="2" fill="#5a3d28"/><rect x="-28.5" y="-64" width="2.5" height="64" fill="#3f2b1d"/>' +
        '<rect x="26" y="-64" width="7" height="64" rx="2" fill="#5a3d28"/><rect x="30.5" y="-64" width="2.5" height="64" fill="#3f2b1d"/>' +
        '<path d="M-42 -66 L0 -82 L42 -66 L38 -63 L0 -77 L-38 -63 Z" fill="#74432e"/><path d="M0 -82 L42 -66 L38 -63 L0 -77 Z" fill="#5f3624"/>' +
        '<rect x="-38" y="-62" width="76" height="34" rx="2" fill="#4b3a2c"/>' +
        '<rect x="-35" y="-59" width="70" height="28" rx="1.5" fill="#7b5f45"/>' +
        '<path d="M-33 -52 Q-10 -54 12 -51 T33 -52 M-33 -40 Q-8 -38 14 -41 T33 -39 M-33 -35 Q0 -36 33 -34" fill="none" stroke="#6a5240" stroke-width="0.8" opacity="0.8"/>' +
        '<text x="0" y="-41" font-family="Newsreader, Georgia, serif" font-size="13" font-weight="600" text-anchor="middle" fill="#f1e6cc" letter-spacing="0.5">Trailhead</text>' +
        '<circle cx="-31" cy="-55.5" r="1.1" fill="#3f2b1d"/><circle cx="31" cy="-55.5" r="1.1" fill="#3f2b1d"/><circle cx="-31" cy="-34.5" r="1.1" fill="#3f2b1d"/><circle cx="31" cy="-34.5" r="1.1" fill="#3f2b1d"/>' +
        '<path d="M-22 -24 H16 L24 -18 L16 -12 H-22 Z" fill="#d6ccb5"/><path d="M-22 -18 H24 L16 -12 H-22 Z" fill="#b3a891" opacity="0.6"/>' +
        '<text x="-1" y="-15.2" font-family="Manrope, sans-serif" font-size="6.2" font-weight="800" text-anchor="middle" fill="#2a2f2b">Summit trail</text>' +
        '</g>';
}
