import { campSite, landmarkSites, leftX, rightX, polygon, silhouette, shade, WORLD_WIDTH } from "./geometry";
import type { Point } from "./geometry";

export type DepthItem = { groundY: number; markup: string };

export function seededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function topAt(points: readonly Point[], x: number) {
  for (let index = 0; index < points.length - 1; index++) {
    const a = points[index], b = points[index + 1];
    if (a[0] !== b[0] && x >= Math.min(a[0], b[0]) && x <= Math.max(a[0], b[0]) && a[1] < 3255 && b[1] < 3255) {
      return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]);
    }
  }
  return Infinity;
}

function hills(y: number, amplitude: number, seed: number) {
  const random = seededRandom(seed);
  const points: Point[] = [[-3200, 3260]];
  for (let x = -3200; x <= 4600; x += 90 + random() * 120) {
    points.push([x, y - random() * amplitude - Math.sin(x * 0.002) * amplitude * 0.5]);
  }
  points.push([4600, 3260]);
  return points;
}

function far(base: number, amplitude: number, seed: number, fill: string) {
  const random = seededRandom(seed);
  const points: Point[] = [[-50, 600]];
  for (let x = -50; x <= 1650; x += 70 + random() * 90) points.push([x, base - random() * amplitude]);
  points.push([1650, 600]);
  return `<svg class="far" viewBox="0 0 1600 600" preserveAspectRatio="xMidYMax slice"><polygon points="${polygon(points)}" fill="${fill}" opacity="0.55"/></svg>`;
}

function inClearing(x: number, y: number) {
  return [...landmarkSites, campSite].some((site) =>
    Math.abs(x - site.x) < site.width * 1.05 + 14 &&
    y > site.y + site.top * 1.05 * 0.8 && y < site.y + 18,
  );
}

// Everything is generated from fixed numbers, not fetched or user-provided SVG.
// Keep random calls in reference order; even rejected trees affect later clouds.
export function buildScenery() {
  const random = seededRandom(7);
  function jag(y: number, amplitude: number, step: number) {
    const points: Point[] = [];
    for (let x = -1010; x <= WORLD_WIDTH + 1210; x += step) {
      points.push([x, y + (random() - 0.5) * amplitude + Math.sin(x * 0.02) * amplitude * 0.4]);
    }
    return points;
  }
  function pine(x: number, y: number, size: number) {
    return `<path d="M${x.toFixed(0)} ${(y - size * 2.1).toFixed(0)}l${(-size * 0.65).toFixed(1)} ${(size * 2.1).toFixed(1)}h${(size * 1.3).toFixed(1)}Z" fill="${random() > 0.5 ? "#203a2e" : "#2c4b39"}"/>`;
  }
  const snowEdge = jag(1320, 150, 38);
  const snow = [...snowEdge, [WORLD_WIDTH + 1210, -10], [-1010, -10]] as Point[];
  const forestEdge = jag(2200, 120, 34);
  const forest = [...forestEdge, [WORLD_WIDTH + 1210, 3210], [-1010, 3210]] as Point[];
  const meadow = [...jag(3020, 40, 40), [WORLD_WIDTH + 1210, 3210], [-1010, 3210]] as Point[];
  const hillsBack = hills(2620, 260, 5), hillsFront = hills(2950, 120, 9);

  let hillTrees = "";
  for (let y = 2520, row = 0; y < 3190; y += 30, row++) {
    for (let x = -3100 + (row % 2) * 35; x < 4500; x += 70) {
      if (random() < 0.3) continue;
      const px = x + (random() - 0.5) * 22, py = y + (random() - 0.5) * 8;
      if (px > leftX(py) - 20 && px < rightX(py) + 20 && py < 3100) continue;
      if (py < topAt(hillsBack, px) + 16) continue;
      hillTrees += pine(px, py, 12 + random() * 11);
    }
  }

  const trees: DepthItem[] = [];
  for (let y = 2160, row = 0; y < 3170; y += 30, row++) {
    for (let x = -960 + (row % 2) * 24; x < WORLD_WIDTH + 1160; x += 48) {
      if (random() < 0.24) continue;
      const px = x + (random() - 0.5) * 18, py = y + (random() - 0.5) * 9, size = 14 + random() * 12;
      if (py < topAt(forestEdge, px) + 14) continue;
      if (px < leftX(py) + size * 0.7 + 4 || px > rightX(py) - size * 0.7 - 4) continue;
      if (inClearing(px, py)) continue;
      trees.push({ groundY: py, markup: pine(px, py, size) });
    }
  }

  function cumulus(cx: number, cy: number, width: number) {
    const count = 5 + Math.floor(random() * 4), step = width / count;
    let base = "", top = "";
    for (let index = 0; index < count; index++) {
      const profile = Math.sin(Math.PI * (index + 0.5) / count);
      const radius = step * (0.75 + profile * 0.9 + random() * 0.3);
      const x = cx - width / 2 + step * (index + 0.5) + (random() - 0.5) * step * 0.4;
      const y = cy - radius * (0.35 + profile * 0.35);
      base += `<circle cx="${x.toFixed(0)}" cy="${(y + radius * 0.18).toFixed(0)}" r="${radius.toFixed(0)}"/>`;
      top += `<circle cx="${(x - radius * 0.12).toFixed(0)}" cy="${(y - radius * 0.08).toFixed(0)}" r="${(radius * 0.92).toFixed(0)}"/>`;
    }
    const flat = `<ellipse cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" rx="${(width * 0.55).toFixed(0)}" ry="${(step * 0.5).toFixed(0)}"/>`;
    return `<g clip-path="url(#cloud-base)" transform="translate(0 0)"><g fill="#d7dee5">${base}${flat}</g><g fill="#ffffff">${top}</g></g>`;
  }
  function cloudBand(count: number, yMin: number, yMax: number, wMin: number, wMax: number) {
    let markup = "";
    for (let index = 0; index < count; index++) {
      const width = wMin + random() * (wMax - wMin);
      markup += cumulus(-900 + random() * (WORLD_WIDTH + 1800), yMin + random() * (yMax - yMin), width);
    }
    return markup;
  }
  const cloudsBack = cloudBand(20, 560, 760, 260, 520);
  const cloudsFront = cloudBand(18, 700, 900, 240, 460);
  const cloudsHigh = cloudBand(8, -700, -150, 220, 420);
  let contours = "";
  for (let index = 0; index < 7; index++) {
    const y = 600 + index * 360;
    contours += `<path d="M${leftX(y) - 40} ${y} Q 1090 ${y - 140} ${rightX(y) + 40} ${y + 60}" />`;
  }
  const edgeTrees: DepthItem[] = [];
  for (let y = 2240; y < 3180; y += 20) {
    [leftX(y), rightX(y)].forEach((x, side) => {
      if (random() < 0.4) return;
      const direction = side ? 1 : -1, size = 13 + random() * 11;
      const px = x - direction * (size * 0.55 + random() * 8), py = y + (random() - 0.5) * 6;
      if (py < topAt(forestEdge, px) + 14) return;
      edgeTrees.push({ groundY: py, markup: pine(px, py, size) });
    });
  }

  return {
    distant: far(330, 220, 11, "#9fb0ad") + far(430, 180, 23, "#7d918d"),
    backdrop: `<g filter="url(#softer)" opacity="0.7">${cloudsHigh}</g><g filter="url(#softer)" opacity="0.75">${cloudsBack}</g>` +
      `<polygon points="${polygon(hillsBack)}" fill="#4b6447"/><polygon points="${polygon(hillsFront)}" fill="#6f7c55"/><polygon points="${silhouette}" fill="#8b8476"/>`,
    bands: `<polygon points="${polygon(forest)}" fill="#34503f"/><polygon points="${polygon(meadow)}" fill="#6f7c55"/><polygon points="${polygon(snow)}" fill="#f4f2ea"/>` +
      `<g fill="none" stroke="#fffbed" stroke-width="1.2" opacity="0.28">${contours}</g>`,
    trees,
    shade: `<polygon points="${shade}" fill="#1f2621" opacity="0.16" pointer-events="none"/>`,
    edgeTrees: edgeTrees.sort((a, b) => a.groundY - b.groundY).map((tree) => tree.markup).join(""),
    hillTrees,
    cloudsFront: `<g filter="url(#soft)" opacity="0.92">${cloudsFront}</g>`,
  };
}

// Landmarks enter the same depth order, beneath shade. The chairlift
// remains separate so its cables can hang above the forest.
export function paintDepth(trees: readonly DepthItem[], landmarks: readonly DepthItem[] = []) {
  return [...trees, ...landmarks].sort((a, b) => a.groundY - b.groundY).map((item) => item.markup).join("");
}
