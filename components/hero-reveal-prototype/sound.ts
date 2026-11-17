// THROWAWAY: one shared on/off for the hero's string sound, used by the nav icon
// and the strum engine. On by default; an explicit choice persists like the theme.
const KEY = "hero-strum-sound";
let on = read();
const listeners = new Set<(on: boolean) => void>();

function read() {
  try { return typeof localStorage === "undefined" || localStorage.getItem(KEY) !== "off"; } catch { return true; }
}

export const heroSound = {
  get: () => on,
  set(next: boolean) {
    on = next;
    try { localStorage.setItem(KEY, next ? "on" : "off"); } catch { /* private mode: session only */ }
    listeners.forEach(fn => fn(on));
  },
  subscribe(fn: (on: boolean) => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },
};
