// Reference per-frame UI token writer (from the approved prototype).
//
// Settled values live in theme.css on UI roots. While a transition runs, this writes
// inline custom properties ONLY on UI roots (header, .climb-list, .climb-cards / HUD,
// .climb-panel, the Case Study article). Never write them on html, body or
// .climb-stage: inherited custom properties would restyle the whole SVG every frame.
// When the controller reports settled, call clearUiTokens so the stylesheet takes over.

import tokens from "./tokens.json";
import { contrast, cssRgb, hexRgb, lerp, mixLab, smooth } from "./color";
import { uiEase, type Blend } from "./controller";

type Pair = [string, string]; // [dark, light]
const T = tokens as unknown as {
  surface: Record<string, Pair>;
  line: Record<string, [number[], number[]]>;
  ink: Record<string, { pair: Pair; on: string }>;
};

// Text blends over ~160 ms (±0.08 of phase), centred on the phase where that ink's
// dark and light values read equally well against its own surface. Reduced motion
// spreads it across the whole 150 ms change.
const TEXT_HALF_WINDOW = { normal: 0.08, reduced: 0.25 };

const crossCache = new Map<string, number>();
export function inkCrossPhase(key: string, reduced: boolean) {
  const id = key + (reduced ? ":r" : ":n");
  const hit = crossCache.get(id);
  if (hit !== undefined) return hit;
  const { pair, on } = T.ink[key];
  const [sd, sl] = T.surface[on];
  let best = 0.5, err = Infinity;
  for (let p = 0; p <= 1; p += 0.002) {
    const u = reduced ? p : uiEase(p);
    const S = mixLab(sd, sl, 1 - u);
    const e = Math.abs(contrast(S, hexRgb(pair[0])) - contrast(S, hexRgb(pair[1])));
    if (e < err) { err = e; best = p; }
  }
  crossCache.set(id, best);
  return best;
}

export function computeUiTokens(b: Blend): Record<string, string> {
  const m = 1 - b.ui; // 0 = dark values, 1 = light values
  const out: Record<string, string> = {};
  for (const k in T.surface) out[k] = cssRgb(mixLab(T.surface[k][0], T.surface[k][1], m));
  for (const k in T.line) {
    const [d, l] = T.line[k];
    out[k] = `rgba(${d.map((v, i) => (i < 3 ? Math.round(lerp(v, l[i], m)) : +lerp(v, l[i], m).toFixed(3))).join(",")})`;
  }
  const w = b.reduced ? TEXT_HALF_WINDOW.reduced : TEXT_HALF_WINDOW.normal;
  for (const k in T.ink) {
    const pc = inkCrossPhase(k, b.reduced);
    const towardLight = 1 - smooth(pc - w, pc + w, b.phase);
    out[k] = cssRgb(mixLab(T.ink[k].pair[0], T.ink[k].pair[1], towardLight));
  }
  return out;
}

const written = new WeakMap<HTMLElement, Record<string, string>>();
export function applyUiTokens(roots: Iterable<HTMLElement>, b: Blend) {
  const vals = computeUiTokens(b);
  for (const root of roots) {
    const prev = written.get(root) ?? {};
    for (const k in vals) if (prev[k] !== vals[k]) root.style.setProperty(`--${k}`, vals[k]);
    written.set(root, vals);
  }
}
export function clearUiTokens(roots: Iterable<HTMLElement>) {
  for (const root of roots) {
    for (const k in written.get(root) ?? {}) root.style.removeProperty(`--${k}`);
    written.delete(root);
  }
}
