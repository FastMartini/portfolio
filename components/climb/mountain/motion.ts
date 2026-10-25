// Pause the whole SMIL timeline, including live preference changes. List View
// and hidden tabs also idle the decorative scene; scroll remains native.
export function observeMountainMotion(host: HTMLElement, active = true, onFailure: () => void = () => {}) {
  const svg = host.querySelector<SVGSVGElement>("svg.mtn");
  const preference = matchMedia("(prefers-reduced-motion: reduce)");
  let observer: MutationObserver | undefined;
  const apply = () => {
    try {
      if (!svg) return;
      if (!active || preference.matches || document.hidden || host.dataset.motionCache === "true") svg.pauseAnimations();
      else svg.unpauseAnimations();
    } catch { onFailure(); }
  };
  const cleanup = sceneCleanup(onFailure,
    () => observer?.disconnect(),
    () => preference.removeEventListener("change", apply),
    () => document.removeEventListener("visibilitychange", apply),
    () => svg?.pauseAnimations());
  try {
    apply();
    observer = new MutationObserver(apply);
    observer.observe(host, { attributes: true, attributeFilter: ["data-motion-cache"] });
    preference.addEventListener("change", apply);
    document.addEventListener("visibilitychange", apply);
  } catch (error) { cleanup(); throw error; }
  return cleanup;
}
import { sceneCleanup } from "../recovery";
