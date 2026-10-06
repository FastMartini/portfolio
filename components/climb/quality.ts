export type ClimbQuality = "full" | "light";
type Connection = EventTarget & { saveData?: boolean };

function optionalHint<T>(read: () => T): T | undefined {
  try { return read(); }
  catch { return undefined; } // Privacy restrictions are not required-feature failures.
}

export function canEnhanceClimb() {
  return typeof ResizeObserver === "function" && typeof DOMPoint === "function"
    && typeof requestAnimationFrame === "function" && typeof cancelAnimationFrame === "function" && typeof matchMedia === "function"
    && typeof SVGGraphicsElement !== "undefined" && typeof SVGGraphicsElement.prototype.getBBox === "function"
    && typeof HTMLDialogElement !== "undefined" && typeof HTMLDialogElement.prototype.show === "function";
}

// Quality only downgrades during a visit: responsive changes cannot repeatedly
// restart expensive decoration or displace content/focus.
export function observeClimbQuality(onLight: () => void) {
  const connection = optionalHint(() => (navigator as Navigator & { connection?: Connection }).connection);
  let light = false;
  function apply() {
    const memory = optionalHint(() => (navigator as Navigator & { deviceMemory?: number }).deviceMemory);
    const cores = optionalHint(() => navigator.hardwareConcurrency);
    if (!light && (innerWidth <= 600 || optionalHint(() => connection?.saveData)
      || (typeof memory === "number" && memory > 0 && memory <= 2)
      || (typeof cores === "number" && cores > 0 && cores <= 2))) {
      light = true;
      onLight();
    }
  }
  apply();
  window.addEventListener("resize", apply);
  connection?.addEventListener?.("change", apply);
  return () => {
    window.removeEventListener("resize", apply);
    connection?.removeEventListener?.("change", apply);
  };
}

// Two consecutive windows must be poor (at least 75% of 60 frames over 50ms).
// Startup, visibility changes, and long suspension gaps reset the evidence.
export function watchClimbPerformance(onSlow: () => void) {
  let raf = 0, last = 0, samples = 0, slow = 0, poorWindows = 0, disposed = false;
  let warmup = performance.now() + 1000;
  function reset() {
    last = samples = slow = poorWindows = 0;
    warmup = performance.now() + 1000;
  }
  function frame(now: number) {
    raf = 0;
    if (disposed || document.hidden) return;
    const gap = last ? now - last : 0;
    last = now;
    if (gap > 500) reset();
    else if (gap > 0 && now >= warmup) {
      samples++;
      if (gap > 50) slow++;
      if (samples === 60) {
        poorWindows = slow >= 45 ? poorWindows + 1 : 0;
        samples = slow = 0;
        if (poorWindows === 2) { poorWindows = 0; onSlow(); }
      }
    }
    if (!disposed) raf = requestAnimationFrame(frame);
  }
  function visibility() {
    cancelAnimationFrame(raf);
    raf = 0;
    reset();
    if (!document.hidden && !disposed) raf = requestAnimationFrame(frame);
  }
  document.addEventListener("visibilitychange", visibility);
  visibility();
  return () => {
    disposed = true;
    cancelAnimationFrame(raf);
    document.removeEventListener("visibilitychange", visibility);
  };
}
