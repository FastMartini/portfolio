import { silhouette, trailLength, trailPath, WORLD_HEIGHT, WORLD_WIDTH } from "./geometry";
import { buildScenery, paintDepth } from "./scenery";
import { buildLandmarks } from "./landmarks";
import { summitFlag } from "./landmarks/summitFlag";
import { trailheadSign } from "./landmarks/trailheadSign";

// Pure, local builders only. Never interpolate arbitrary content into this SVG.
export function buildMountainMarkup() {
  const scenery = buildScenery();
  const landmarks = buildLandmarks();
  return scenery.distant +
    `<svg class="mtn" viewBox="0 0 ${WORLD_WIDTH} ${WORLD_HEIGHT}" width="${WORLD_WIDTH}" height="${WORLD_HEIGHT}">` +
    `<defs><clipPath id="mtn-clip"><polygon points="${silhouette}"/></clipPath>` +
    '<clipPath id="cloud-base" clipPathUnits="userSpaceOnUse"><rect x="-4000" y="-4000" width="9000" height="9000"/></clipPath>' +
    '<filter id="soft" x="-20%" y="-40%" width="140%" height="180%"><feGaussianBlur stdDeviation="7"/></filter>' +
    '<filter id="softer" x="-20%" y="-40%" width="140%" height="180%"><feGaussianBlur stdDeviation="14"/></filter>' +
    '<filter id="lm-blur" x="-30%" y="-200%" width="160%" height="500%"><feGaussianBlur stdDeviation="4"/></filter>' +
    '<filter id="lm-smoke" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="2.2"/></filter>' +
    '<filter id="lm-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="3.5"/></filter></defs>' +
    scenery.backdrop +
    `<g clip-path="url(#mtn-clip)">${scenery.bands}${paintDepth(scenery.trees, landmarks.depth)}${landmarks.lift}${scenery.shade}</g>` +
    scenery.edgeTrees +
    `<path id="a-trail" d="${trailPath}" fill="none" stroke="#7a5236" stroke-width="3" stroke-dasharray="2 8" stroke-linecap="round" opacity="0.85"/>` +
    `<path id="a-walked" d="${trailPath}" fill="none" stroke="#b5653b" stroke-width="4" stroke-linecap="round" stroke-dasharray="${trailLength} ${trailLength}" stroke-dashoffset="${trailLength}"/>` +
    '<g transform="translate(1090 150)"><rect x="-1.75" y="-76" width="3.5" height="76" fill="#1f2621"/><circle cx="0" cy="-77" r="2.6" fill="#1f2621"/>' + summitFlag() + "</g>" +
    scenery.hillTrees + trailheadSign() + scenery.cloudsFront +
    '<g id="a-climber" transform="translate(600 3150)"><circle r="13" fill="#b5653b" opacity="0.25"/><circle r="7" fill="#1f2621" stroke="#fffbed" stroke-width="2.5"/></g></svg>';
}
