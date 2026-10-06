import { landmarkAnchors } from "./mountain/landmarks";
import { mountainView } from "./mountain/geometry";
import { journeyStops } from "../../content/journey";
import type { ClimbFrame } from "./progress";

export function setLandmarkHot(stage: HTMLElement, stop: number, hot: boolean) {
  stage.querySelector<HTMLElement>(`[data-marker="${stop}"]`)?.setAttribute("data-hot", String(hot));
  stage.querySelector(`.lm[data-stop="${stop}"]`)?.classList.toggle("is-hot", hot);
}

export function createMarkerRenderer(stage: HTMLElement, onVisibilityChange: () => void) {
  const scene = stage.querySelector<HTMLElement>(".climb-scene")!;
  const markers = Array.from(stage.querySelectorAll<HTMLButtonElement>("[data-marker]"));
  const landmarks = markers.map((marker) => stage.querySelector<SVGGElement>(`.lm[data-stop="${marker.dataset.marker}"]`));
  // Cache each Landmark's world bounds once. Chromium can retain stale SVG
  // client rectangles after a CSS camera transform; local SVG bounds plus the
  // current camera and scene origin stay consistent with the painted position.
  const landmarkBounds = landmarks.map((landmark) => {
    if (!landmark) return null;
    const box = landmark.getBBox(), matrix = landmark.transform.baseVal.consolidate()!.matrix;
    const corners = [[box.x, box.y], [box.x + box.width, box.y],
      [box.x, box.y + box.height], [box.x + box.width, box.y + box.height]]
      .map(([x, y]) => new DOMPoint(x, y).matrixTransform(matrix));
    return { left: Math.min(...corners.map((point) => point.x)), right: Math.max(...corners.map((point) => point.x)),
      top: Math.min(...corners.map((point) => point.y)), bottom: Math.max(...corners.map((point) => point.y)) };
  });
  let view: ReturnType<typeof mountainView> | null = null;
  let raf = 0, transitioning = false;

  function refreshVisibility() {
    if (!view) return;
    // Read rendered geometry in one batch before writing visibility. The scene
    // can move independently of the mountain camera while a panel animates.
    const clip = stage.getBoundingClientRect(), origin = scene.getBoundingClientRect();
    const left = Math.max(0, clip.left), right = Math.min(innerWidth, clip.right);
    const top = Math.max(76, clip.top), bottom = Math.min(innerHeight, clip.bottom);
    const camera = view;
    markers.forEach((marker, index) => {
      const anchor = landmarkAnchors[index];
      const x = origin.left + camera.x + anchor[0] * camera.scale - 22;
      const y = origin.top + camera.y + anchor[1] * camera.scale - 50;
      const visible = x >= left && x + 44 <= right && y >= top && y + 44 <= bottom;
      marker.hidden = !visible;
      marker.tabIndex = visible ? 0 : -1;
      marker.dataset.hidden = String(!visible);
      // Retain the shared full-target visibility contract, and also reject
      // Landmarks whose rendered bounds fall outside the clipping rectangle.
      const landmark = landmarks[index], box = landmarkBounds[index];
      if (landmark && box) {
        const landmarkVisible = visible && origin.left + camera.x + box.right * camera.scale > left
          && origin.left + camera.x + box.left * camera.scale < right
          && origin.top + camera.y + box.bottom * camera.scale > top
          && origin.top + camera.y + box.top * camera.scale < bottom;
        landmark.tabIndex = landmarkVisible ? 0 : -1;
        landmark.setAttribute("aria-hidden", String(!landmarkVisible));
      }
    });
    onVisibilityChange();
  }

  function refresh() {
    raf = 0;
    refreshVisibility();
    if (transitioning && !document.hidden) raf = requestAnimationFrame(refresh);
  }
  function schedule() {
    if (!raf) raf = requestAnimationFrame(refresh);
  }
  function transition(event: TransitionEvent) {
    if (event.target !== scene || event.propertyName !== "transform") return;
    transitioning = event.type === "transitionrun";
    schedule();
  }
  const mutation = new MutationObserver(schedule);
  mutation.observe(stage, { attributes: true, attributeFilter: ["data-panel-open"] });
  const resize = new ResizeObserver(schedule);
  resize.observe(stage);
  scene.addEventListener("transitionrun", transition);
  scene.addEventListener("transitionend", transition);
  scene.addEventListener("transitioncancel", transition);
  document.addEventListener("visibilitychange", schedule);

  return { render({ position, nearest, u }: ClimbFrame) {
    const camera = mountainView(position, stage.clientWidth, stage.clientHeight);
    view = camera;
    markers.forEach((marker, index) => {
      const anchor = landmarkAnchors[index], stop = index + 2;
      const x = camera.x + anchor[0] * camera.scale - 22;
      const y = camera.y + anchor[1] * camera.scale - 50;
      marker.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
      marker.dataset.current = String(stop === nearest && Math.abs(u - nearest) < 0.3);
      marker.dataset.visited = String(journeyStops[stop].trailPosition <= position + 0.005);
    });
    refreshVisibility();
  }, dispose() {
    cancelAnimationFrame(raf);
    mutation.disconnect();
    resize.disconnect();
    scene.removeEventListener("transitionrun", transition);
    scene.removeEventListener("transitionend", transition);
    scene.removeEventListener("transitioncancel", transition);
    document.removeEventListener("visibilitychange", schedule);
  } };
}
