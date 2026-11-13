import { landmarkAnchors } from "./mountain/landmarks";
import { PEAK_X } from "./mountain/geometry";

type Owner = {
  add(target: Element | null, frames: Keyframe[], timing: KeyframeAnimationOptions): Animation | null;
  cleanup(fn: () => void): void;
};

/** Reframe the existing live vectors, not a screenshot or a second mountain.
 * Both directions traverse the same overview pose and perspective slope. */
export function hillsideCamera(owner: Owner, stage: HTMLElement | null, direction: "down" | "up", start: number, duration: number) {
  if (!stage) return null;
  const scene = stage.querySelector<HTMLElement>(".climb-scene");
  const camera = scene?.querySelector<HTMLElement>(".climb-vector-camera");
  const root = stage.closest<HTMLElement>(".climb-enhancement");
  if (!scene || !camera || !root || !camera.style.transform) return null;
  const win = stage.ownerDocument.defaultView!;
  const width = stage.clientWidth, height = stage.clientHeight;
  if (!width || !height) return null;
  const normal = new DOMMatrix(getComputedStyle(camera).transform);
  const panel = new DOMMatrix(getComputedStyle(scene).transform);
  const pitch = 70, lens = height * 1.8;
  // Frame the lower trail beneath the viewer; the peak leaves the top edge
  // while the meadow and its shadows continue through the foreground.
  const scale = Math.min(height / 1800, width / 1500);
  const overview = { x: width / 2 - PEAK_X * scale, y: height * 1.14 - 2900 * scale, scale };
  const down = direction === "down";
  const timing = { delay: start, duration, easing: "cubic-bezier(0.45, 0, 0.2, 1)", fill: "both" as FillMode };
  const pair = (from: Keyframe, to: Keyframe) => down ? [from, to] : [to, from];
  const previousInert = root.inert;
  const origins = new Map<HTMLElement, string>();
  let frame = 0;

  // Extend the same meadow beyond the illustrator's lower world edge. It is
  // inside the existing vector camera, so pitch, scale and shadows stay joined.
  const ground = stage.ownerDocument.createElement("div");
  ground.className = "climb-terrain-continuation";
  ground.setAttribute("aria-hidden", "true");
  // Sparse, deterministic meadow detail continues the existing ground. The
  // spruce silhouettes reference the same live SVG definitions as the Climb.
  const contours = Array.from({ length: 8 }, (_, i) => {
    const y = 3310 + i * 145;
    return `<path d="M-1100 ${y} Q 450 ${y - 130} 1400 ${y + 35} T3300 ${y - 40}"/>`;
  }).join("");
  const grasses = Array.from({ length: 70 }, (_, i) => {
    const x = -700 + ((i * 349) % 3700), y = 3290 + ((i * 137) % 1300);
    return `<path d="M${x} ${y}l-3 -9m3 9l4 -13"/>`;
  }).join("");
  const trees = [[110, 3340], [180, 3385], [260, 3330], [2440, 3400], [2550, 3470], [2670, 3390]]
    .map(([x, y], i) => `<use href="#tv-spruce${i}" transform="translate(${x} ${y}) scale(1.1)" fill="#34503f"/>`).join("");
  ground.innerHTML = `<svg class="climb-terrain-detail" viewBox="-1100 3200 4400 6000" width="4400" height="6000" aria-hidden="true">
    <g fill="none" stroke="#fffbed" stroke-width="1.2" opacity=".12">${contours}</g>
    <g fill="none" stroke="#49644b" stroke-width="1.2" opacity=".55">${grasses}</g>${trees}
    <path d="M600 3150 C620 3230 640 3260 720 3300 S1600 3380 1540 3510 S570 3700 700 3860 S1660 4060 1420 4260" fill="none" stroke="#7a5236" stroke-width="3" stroke-dasharray="2 8" stroke-linecap="round"/>
  </svg><i class="climb-terrain-shadow"></i><i class="climb-terrain-night"></i>`;
  const veil = scene.querySelector<SVGElement>("#night-veil");
  let night = "";
  const syncLight = () => {
    const value = String(0.6 * Number(veil?.style.opacity || veil?.getAttribute("opacity") || 0));
    if (value !== night) { night = value; ground.style.setProperty("--hill-night", value); }
    frame = win.requestAnimationFrame(syncLight);
  };
  const releaseBackdrop = () => {
    win.cancelAnimationFrame(frame);
    root.removeAttribute("data-hillside-transition");
  };
  owner.cleanup(() => {
    win.cancelAnimationFrame(frame);
    ground.remove();
    releaseBackdrop();
    root.inert = previousInert;
    for (const [element, origin] of origins) element.style.transformOrigin = origin;
  });
  root.dataset.hillsideTransition = direction;
  root.inert = true;
  camera.append(ground);
  syncLight();
  origins.set(scene, scene.style.transformOrigin);
  scene.style.transformOrigin = `50% ${height * 0.8}px`;
  owner.add(scene, pair(
    { transform: `translate(${panel.m41}px,0px) perspective(${lens}px) rotateX(0deg)` },
    { transform: `translate(0px,${-height * 0.6}px) perspective(${lens}px) rotateX(${pitch}deg)` },
  ), timing);
  owner.add(camera, pair(
    { transform: `translate(${normal.m41}px,${normal.m42}px) scale(${normal.m11})` },
    { transform: `translate(${overview.x}px,${overview.y}px) scale(${overview.scale})` },
  ), timing);
  const ratio = scale / normal.m11;
  scene.querySelectorAll<HTMLElement>("[data-marker]").forEach((marker, index) => {
    const anchor = landmarkAnchors[index];
    if (!anchor) return;
    origins.set(marker, marker.style.transformOrigin);
    marker.style.transformOrigin = "22px 50px";
    owner.add(marker, pair(
      { transform: `${getComputedStyle(marker).transform} rotateX(0deg)` },
      { transform: `translate(${overview.x + anchor[0] * scale - 22}px,${overview.y + anchor[1] * scale - 50}px) scale3d(${ratio},${ratio},${ratio}) rotateX(${-pitch}deg)` },
    ), timing);
  });
  const haze = scene.querySelector<HTMLElement>(".climb-haze");
  owner.add(haze, pair({ opacity: haze ? getComputedStyle(haze).opacity : "0" }, { opacity: 0 }), timing);
  owner.add(stage.querySelector(".climb-sky"), pair({ translate: "0 0" }, { translate: "0 -18vh" }), timing);
  owner.add(stage.querySelector(".climb-navigation"), down
    ? [{ opacity: 1 }, { opacity: 0 }]
    : [{ opacity: 0 }, { opacity: 1 }], {
    delay: down ? start : start + duration - 500,
    duration: down ? 220 : 500, fill: "both", easing: "ease-out",
  });
  return { releaseBackdrop };
}
