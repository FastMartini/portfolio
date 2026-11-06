import { silhouette, trailLength, trailPath } from "./geometry";

export function nightDefs(hillsBackPoints: string) {
  return (
    // Moonlight veil: cool and light over snow, deeper over forest. userSpaceOnUse = world rows (0..3200).
    '<linearGradient id="night-veil-grad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="3200">' +
    '<stop offset="0" stop-color="#2d4064" stop-opacity="0.34"/>' +
    '<stop offset="0.40" stop-color="#2d4064" stop-opacity="0.38"/>' +
    '<stop offset="0.48" stop-color="#1b2844" stop-opacity="0.50"/>' +
    '<stop offset="0.70" stop-color="#0f1a2e" stop-opacity="0.56"/>' +
    '<stop offset="1" stop-color="#0c1526" stop-opacity="0.60"/></linearGradient>' +
    // Mountain body + foreground hills, raised 40 units so the top row of spruce crowns is covered.
    `<clipPath id="night-clip"><polygon points="${silhouette}"/><polygon points="${hillsBackPoints}"/>` +
    `<polygon points="${hillsBackPoints}" transform="translate(0 -40)"/></clipPath>`
  );
}

// ---- 2. Nodes inserted AFTER trailheadSign() and BEFORE the cloudsFront group ----
// `landmarkLights` = markup collected from the Landmark builders (see 3). Static at build time.
export function nightNodes(landmarkLights: string) {
  return (
    `<g id="night-veil" aria-hidden="true" clip-path="url(#night-clip)" opacity="0" pointer-events="none">` +
    `<rect x="-1100" y="-120" width="4400" height="3420" fill="url(#night-veil-grad)"/></g>` +
    `<g id="night-lights" aria-hidden="true" opacity="0" pointer-events="none">` +
    `<path id="n-trail" d="${trailPath}" fill="none" stroke="#c9a27c" stroke-width="3" stroke-dasharray="2 8" stroke-linecap="round" opacity="0.8"/>` +
    `<path id="n-walked" d="${trailPath}" fill="none" stroke="#d27a4a" stroke-width="4" stroke-linecap="round" stroke-dasharray="${trailLength} ${trailLength}" stroke-dashoffset="${trailLength}"/>` +
    `<g id="n-sources">${landmarkLights}</g></g>`
  );
}
// render.ts: whenever #a-walked's stroke-dashoffset is set, set #n-walked to the same value.

