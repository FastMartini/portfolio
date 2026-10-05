import { campSite, landmarkSites } from "../geometry";
import type { Point } from "../geometry";
import type { DepthItem } from "../scenery";
import { createParts } from "../parts";
import { watchtower } from "./watchtower";
import { liftBase } from "./liftBase";
import { skiLodge } from "./skiLodge";
import { radioStation } from "./radioStation";
import { climbingWall } from "./climbingWall";
import { highPass } from "./highPass";
import { chairlift } from "./chairlift";
import { campfire } from "./campfire";
import { waypoints } from "../../../../content/waypoints";

export const landmarkScale = 1.05;
export const landmarkAnchors = landmarkSites.map((site): Point => [site.x, site.y + site.top * landmarkScale - 4]);

export function buildLandmarks() {
  const parts = createParts();
  const builders = [watchtower, liftBase, skiLodge, radioStation, climbingWall, highPass];
  const built = landmarkSites.map((site, index) => ({
    ...site, art: builders[index](parts),
    flip: site.stopIndex === 3 ? (landmarkSites[2].x < site.x ? -1 : 1)
      : site.stopIndex === 4 ? (landmarkSites[1].x > site.x ? -1 : 1) : 1,
  }));
  const depth: DepthItem[] = built.map((site, index) => {
    const svg = site.flip === -1 ? site.art.svg.replace(/<text x="([-\d.]+)"/g,
      (_, x: string) => '<text transform="scale(-1 1)" x="' + (-Number(x)) + '"') : site.art.svg;
    const name = waypoints[index].name.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
    return { groundY: site.y, markup:
      '<g class="lm" role="button" tabindex="-1" aria-hidden="true" aria-label="Open ' + name + ' Landmark" aria-controls="waypoint-panel" aria-expanded="false" data-stop="' + site.stopIndex + '" transform="translate(' + site.x.toFixed(1) + " " + site.y.toFixed(1) + ") scale(" + (site.flip * landmarkScale) + " " + landmarkScale + ')">' +
      '<g class="lm-art" aria-hidden="true"><ellipse cx="0" cy="' + (site.top / 2) + '" rx="' + (site.width + 30) + '" ry="' + (-site.top / 2 + 12) + '" fill="transparent"/>' + svg + "</g></g>" };
  });
  depth.push({ groundY: campSite.y, markup:
    '<g class="campfire" aria-hidden="true" transform="translate(' + campSite.x.toFixed(1) + " " + campSite.y.toFixed(1) + ') scale(1.15)">' + campfire(parts) + "</g>" });
  const terminals = built.slice(1, 3).map((site): Point => {
    const cable = site.art.cable!;
    return [site.x + cable[0] * landmarkScale * site.flip, site.y + cable[1] * landmarkScale];
  });
  return { depth, lift: '<g class="lift">' + chairlift(parts, terminals[0], terminals[1], landmarkScale) + "</g>" };
}
