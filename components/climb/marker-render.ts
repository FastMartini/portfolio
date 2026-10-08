import { landmarkAnchors } from "./mountain/landmarks";
import { mountainView } from "./mountain/geometry";
import type { ClimbFrame } from "./progress";
import { sceneCleanup } from "./recovery";

export function setLandmarkHot(stage: HTMLElement, stop: number, hot: boolean) {
  stage.querySelector<HTMLElement>(`[data-marker="${stop}"]`)?.setAttribute("data-hot", String(hot));
  stage.querySelector(`.lm[data-stop="${stop}"]`)?.classList.toggle("is-hot", hot);
}

export function createMarkerRenderer(stage: HTMLElement, onVisibilityChange: () => void, onFailure: () => void) {
  const scene = stage.querySelector<HTMLElement>(".climb-scene")!;
  const header = stage.ownerDocument.querySelector<HTMLElement>(".site-header:not(.site-header--case-study)");
  const markers = Array.from(stage.querySelectorAll<HTMLButtonElement>("[data-marker]"));
  const landmarks = markers.map((marker) => stage.querySelector<SVGGElement>(`.lm[data-stop="${marker.dataset.marker}"]`));
  // List View deep links mount the Climb while hidden. Cache world bounds only
  // once measurable; Chromium's SVG client rectangles can go stale after camera
  // transforms, so keep projecting local bounds with the current camera/origin.
  const landmarkBounds: ({ left: number; right: number; top: number; bottom: number } | null)[] = landmarks.map(() => null);
  let view: ReturnType<typeof mountainView> | null = null;
  let raf = 0, transitioning = false;

  function refreshVisibility() {
    if (!view) return;
    // Read rendered geometry in one batch before writing visibility. The scene
    // can move independently of the mountain camera while a panel animates.
    const clip = stage.getBoundingClientRect(), origin = scene.getBoundingClientRect();
    if (clip.width <= 0 || clip.height <= 0) return;
    landmarks.forEach((landmark, index) => {
      if (!landmark || landmarkBounds[index]) return;
      const box = landmark.getBBox();
      // A not-yet-measurable SVG must not permanently poison the cache.
      if (box.width <= 0 || box.height <= 0) return;
      const matrix = landmark.transform.baseVal.consolidate()!.matrix;
      const corners = [[box.x, box.y], [box.x + box.width, box.y],
        [box.x, box.y + box.height], [box.x + box.width, box.y + box.height]]
        .map(([x, y]) => new DOMPoint(x, y).matrixTransform(matrix));
      landmarkBounds[index] = { left: Math.min(...corners.map((point) => point.x)), right: Math.max(...corners.map((point) => point.x)),
        top: Math.min(...corners.map((point) => point.y)), bottom: Math.max(...corners.map((point) => point.y)) };
    });
    const left = Math.max(0, clip.left), right = Math.min(innerWidth, clip.right);
    const top = Math.max((header?.getBoundingClientRect().bottom ?? 72) + 4, clip.top), bottom = Math.min(innerHeight, clip.bottom);
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
      if (landmark) {
        const landmarkVisible = Boolean(box && visible && origin.left + camera.x + box.right * camera.scale > left
          && origin.left + camera.x + box.left * camera.scale < right
          && origin.top + camera.y + box.bottom * camera.scale > top
          && origin.top + camera.y + box.top * camera.scale < bottom);
        landmark.tabIndex = landmarkVisible ? 0 : -1;
        landmark.setAttribute("aria-hidden", String(!landmarkVisible));
      }
    });
    onVisibilityChange();
  }

  function refresh() {
    raf = 0;
    try { refreshVisibility(); }
    catch { onFailure(); return; }
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
  let resize: ResizeObserver | undefined;
  try {
    mutation.observe(stage, { attributes: true, attributeFilter: ["data-panel-open"] });
    resize = new ResizeObserver(schedule);
    resize.observe(stage);
  } catch (error) {
    sceneCleanup(onFailure, () => mutation.disconnect(), () => resize?.disconnect(), () => cancelAnimationFrame(raf))();
    throw error;
  }
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
    });
    refreshVisibility();
  }, dispose: sceneCleanup(onFailure,
    () => cancelAnimationFrame(raf),
    () => mutation.disconnect(),
    () => resize?.disconnect(),
    () => scene.removeEventListener("transitionrun", transition),
    () => scene.removeEventListener("transitionend", transition),
    () => scene.removeEventListener("transitioncancel", transition),
    () => document.removeEventListener("visibilitychange", schedule)) };
}
