// Pause the whole SMIL timeline, including live preference changes. List View
// and hidden tabs also idle the decorative scene; scroll remains native.
export function observeMountainMotion(host: HTMLElement, active = true) {
  const svg = host.querySelector<SVGSVGElement>("svg.mtn");
  const preference = matchMedia("(prefers-reduced-motion: reduce)");
  const apply = () => {
    if (!svg) return;
    if (!active || preference.matches || document.hidden) svg.pauseAnimations();
    else svg.unpauseAnimations();
  };
  apply();
  preference.addEventListener("change", apply);
  document.addEventListener("visibilitychange", apply);
  return () => {
    preference.removeEventListener("change", apply);
    document.removeEventListener("visibilitychange", apply);
    svg?.pauseAnimations();
  };
}
