// One framework-free transition clock shared by List View, Climb, panels,
// and Case Study routes through the root ThemeProvider.
//
// Model: one selected destination (light | dark) and one phase p in [0, 1]
// (0 = Light, 1 = Dark). Every visual is a pure function of p, so any view that
// mounts mid-transition renders the same instant.

import { clamp } from "./color";

export type Theme = "light" | "dark";
export type Blend = {
  phase: number;     // p, linear in time
  scene: number;     // n: sky, veil, lights, clouds (sine in-out)
  ui: number;        // u: UI surfaces (cubic in-out)
  twilight: number;  // 1 in normal motion, 0 in reduced motion
  reduced: boolean;
};
export type Listener = (blend: Blend, settled: boolean) => void;

export const STORAGE_KEY = "portfolio-theme";
export const NORMAL_MS = 1000;
export const REDUCED_MS = 150;
export const TURN_TAU_MS = 80; // velocity smoothing for reversals
const MAX_DT = 50;

export const sceneEase = (p: number) => -(Math.cos(Math.PI * p) - 1) / 2;            // cubic-bezier(.37,0,.63,1)
export const uiEase = (p: number) => (p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2); // cubic-bezier(.65,0,.35,1)

export function createThemeController(root: HTMLElement = document.documentElement) {
  let reducedQuery: MediaQueryList | undefined;
  try { reducedQuery = matchMedia("(prefers-reduced-motion: reduce)"); } catch { /* The full-text theme works without scene capabilities. */ }
  const initial = root.dataset.theme === "light" ? 0 : 1; // set by the pre-paint script
  const state = { target: initial, p: initial, v: 0, reduced: reducedQuery?.matches ?? true, raf: 0, last: 0, settled: true };
  const listeners = new Set<Listener>();

  const blend = (): Blend => state.reduced
    ? { phase: state.p, scene: state.p, ui: state.p, twilight: 0, reduced: true }
    : { phase: state.p, scene: sceneEase(state.p), ui: uiEase(state.p), twilight: 1, reduced: false };
  const emit = () => { const b = blend(); listeners.forEach((fn) => fn(b, state.settled)); };

  function step(dt: number) {
    const dir = Math.sign(state.target - state.p);
    if (dir === 0) { state.v = 0; return false; }
    const vT = dir / (state.reduced ? REDUCED_MS : NORMAL_MS);
    state.v = state.reduced ? vT : state.v + (vT - state.v) * (1 - Math.exp(-dt / TURN_TAU_MS));
    state.p = clamp(state.p + state.v * dt, 0, 1);
    if ((state.target - state.p) * dir <= 0 && state.v * dir > 0) { state.p = state.target; state.v = 0; }
    return state.p !== state.target;
  }

  function frame() {
    state.raf = 0;
    // Selection and frames use one clock. Native frame timestamps can describe
    // an earlier paint, especially in software WebKit. Integrate long gaps in
    // small steps instead of stretching a one-second fade over many seconds.
    const now = performance.now();
    const elapsed = state.last ? Math.max(0, now - state.last) : 16;
    state.last = now;
    let remaining = Math.min(elapsed, NORMAL_MS + TURN_TAU_MS * 5);
    let moving = state.p !== state.target;
    while (remaining > 0 && moving) {
      const dt = state.reduced ? remaining : Math.min(MAX_DT, remaining);
      moving = step(dt);
      remaining -= dt;
    }
    if (!moving) state.settled = true;
    emit(); // settled === true on the final frame: listeners remove inline values
    if (moving) state.raf = requestAnimationFrame(frame);
    else state.last = 0;
  }
  const kick = () => { if (!state.raf) state.raf = requestAnimationFrame(frame); };

  function jump() { // destination immediately: hidden tabs, route changes, motion-preference changes
    cancelAnimationFrame(state.raf); state.raf = 0; state.last = 0;
    state.p = state.target; state.v = 0; state.settled = true; emit();
  }

  function select(theme: Theme, opts: { persist?: boolean; instant?: boolean } = {}) {
    const t = theme === "dark" ? 1 : 0;
    if (t === state.target && state.p === t) return;
    // Pin the CURRENT look inline before the stylesheet flips, or one frame shows the destination.
    if (state.settled) { state.settled = false; emit(); state.last = performance.now(); }
    state.target = t;
    root.dataset.theme = theme;
    if (opts.persist !== false) { try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* in-memory only */ } }
    if (opts.instant || document.hidden) jump(); else kick();
  }

  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY || (e.newValue !== "light" && e.newValue !== "dark")) return;
    select(e.newValue, { persist: false }); // no write-back, so no loop between tabs
  };
  const onVisibility = () => { if (state.p !== state.target) jump(); };
  const onMotion = (e: MediaQueryListEvent) => { state.reduced = e.matches; if (state.p !== state.target) jump(); };
  addEventListener("storage", onStorage);
  document.addEventListener("visibilitychange", onVisibility);
  try { reducedQuery?.addEventListener("change", onMotion); } catch { /* Optional browser preference observation. */ }

  return {
    get theme(): Theme { return state.target ? "dark" : "light"; },
    blend,
    get settled() { return state.settled; },
    select,
    toggle: () => select(state.target ? "light" : "dark"),
    jump,
    subscribe(fn: Listener) { listeners.add(fn); fn(blend(), state.settled); return () => listeners.delete(fn); },
    dispose() {
      cancelAnimationFrame(state.raf);
      removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisibility);
      try { reducedQuery?.removeEventListener("change", onMotion); } catch { /* Optional browser preference observation. */ }
      listeners.clear();
    },
  };
}
export type ThemeController = ReturnType<typeof createThemeController>;
