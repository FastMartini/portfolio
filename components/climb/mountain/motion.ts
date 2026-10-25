// Pause the whole SMIL timeline, including live preference changes. List View
// and hidden tabs also idle the decorative scene; scroll remains native.
export function observeMountainMotion(host: HTMLElement, active = true, onFailure: () => void = () => {}) {
  const timelines = Array.from(host.querySelectorAll<SVGSVGElement>("svg.climb-layer-svg"));
  const preference = matchMedia("(prefers-reduced-motion: reduce)");
  const apply = () => {
    try {
      timelines.forEach((svg) => {
        if (!active || preference.matches || document.hidden) svg.pauseAnimations();
        else svg.unpauseAnimations();
      });
    } catch { onFailure(); }
  };
  const cleanup = sceneCleanup(onFailure,
    () => preference.removeEventListener("change", apply),
    () => document.removeEventListener("visibilitychange", apply),
    ...timelines.map((svg) => () => svg.pauseAnimations()));
  try {
    apply();
    preference.addEventListener("change", apply);
    document.addEventListener("visibilitychange", apply);
  } catch (error) { cleanup(); throw error; }
  return cleanup;
}
import { sceneCleanup } from "../recovery";
