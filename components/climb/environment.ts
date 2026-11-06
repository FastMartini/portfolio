// Approved night palette, composed with the existing altitude weather.
// One frame path owns all environment writes, including stationary toggles.

import { cssRgb, hexRgb, lerp, mixLab, rgbHex, smooth, type Rgb } from "../theme/color";
import { weather } from "./weather";
import type { Blend } from "../theme/controller";

type Frame = readonly [number, string, string]; // position, top, bottom
export const NIGHT: readonly Frame[] = [
  [0, "#1c2431", "#313a47"], [0.3, "#1d2530", "#343d48"], [0.52, "#283039", "#444c55"], [0.7, "#232b34", "#3b434c"],
  [0.84, "#333c47", "#4f5862"], [0.9, "#1f2a3f", "#364259"], [0.95, "#121b31", "#2a3a5b"], [1, "#0e172d", "#24345a"],
];

function frameAt(table: readonly Frame[], t: number): [Rgb, Rgb] {
  t = Math.min(1, Math.max(0, t));
  const i = Math.max(0, table.findIndex((f, k) => k < table.length - 1 && t <= table[k + 1][0]));
  const a = table[i], b = table[i + 1], s = smooth(a[0], b[0], t);
  const interpolate = (start: string, end: string): Rgb => {
    const A = hexRgb(start), B = hexRgb(end);
    return [lerp(A[0], B[0], s), lerp(A[1], B[1], s), lerp(A[2], B[2], s)];
  };
  return [interpolate(a[1], b[1]), interpolate(a[2], b[2])];
}

export const NIGHT_PAINT = {
  farA: ["#9fb0ad", "#3a4762"], farB: ["#7d918d", "#2a354c"],
  cloudBase: ["#d7dee5", "#4f5d74"], cloudTop: ["#ffffff", "#7a889e"],
  hazeInner: ["#ffffff", "#7d8aa0"], hazeOuter: ["#f0f4f6", "#5f6b80"],
  snowflake: ["#ffffff", "#c3d0e4"],
} as const;

export function environment(position: number, b: Blend) {
  const n = b.scene;
  const day = weather(position);
  const dTop = day.top.map((channel) => channel / 255) as unknown as Rgb;
  const dBottom = day.bottom.map((channel) => channel / 255) as unknown as Rgb;
  const [nTop, nBottom] = frameAt(NIGHT, position);
  const { snow, haze, sun } = day;
  // Cloud cover hides moon and stars; Summit is clearest.
  const cover = Math.max(smooth(0.42, 0.52, position) * (1 - smooth(0.84, 0.9, position)), haze / 0.85);
  const clear = 1 - cover, summit = smooth(0.88, 0.97, position);
  const mix = (pair: readonly [string, string]) => cssRgb(mixLab(pair[0], pair[1], n));
  return {
    skyTop: cssRgb(mixLab(rgbHex(dTop), rgbHex(nTop), n)),
    skyBottom: cssRgb(mixLab(rgbHex(dBottom), rgbHex(nBottom), n)),
    sunOpacity: sun * (1 - n),
    moonOpacity: n * clear * (0.62 + 0.38 * summit),
    starsOpacity: n * clear * (0.35 + 0.65 * summit),
    twilightOpacity: b.twilight * 4 * n * (1 - n) * 0.9,
    hazeOpacity: haze,
    hazeInner: mix(NIGHT_PAINT.hazeInner), hazeOuter: mix(NIGHT_PAINT.hazeOuter),
    veilOpacity: n, lightsOpacity: n,
    farA: mix(NIGHT_PAINT.farA), farB: mix(NIGHT_PAINT.farB),
    cloudBase: mix(NIGHT_PAINT.cloudBase), cloudTop: mix(NIGHT_PAINT.cloudTop),
    snowAmount: snow, snowflake: mix(NIGHT_PAINT.snowflake),
  };
}
export type Environment = ReturnType<typeof environment>;

// Cache scene references and write only changed paint values.
export function createEnvironmentRenderer(stage: HTMLElement) {
  const q = <E extends Element>(s: string) => stage.querySelector<E>(s)!;
  const sky = q<HTMLElement>(".climb-sky"), sun = q<HTMLElement>(".climb-sun"), moon = q<HTMLElement>(".climb-moon");
  const stars = q<HTMLElement>(".climb-stars"), twilight = q<HTMLElement>(".climb-twilight"), haze = q<HTMLElement>(".climb-haze");
  const veil = q<SVGGElement>("#night-veil"), lights = q<SVGGElement>("#night-lights");
  const farA = q<SVGPolygonElement>(".far-a"), farB = q<SVGPolygonElement>(".far-b");
  const clouds = Array.from(stage.querySelectorAll<SVGGElement>(".climb-mountain .clouds"));
  const cache: Record<string, string> = {};
  const set = (key: string, value: string, write: (v: string) => void) => { if (cache[key] !== value) { cache[key] = value; write(value); } };
  return (position: number, b: Blend) => {
    const e = environment(position, b);
    set("top", e.skyTop, (v) => sky.style.setProperty("--sky-top", v));
    set("bottom", e.skyBottom, (v) => sky.style.setProperty("--sky-bottom", v));
    set("sun", e.sunOpacity.toFixed(3), (v) => (sun.style.opacity = v));
    set("moon", e.moonOpacity.toFixed(3), (v) => (moon.style.opacity = v));
    set("stars", e.starsOpacity.toFixed(3), (v) => (stars.style.opacity = v));
    set("twilight", e.twilightOpacity.toFixed(3), (v) => (twilight.style.opacity = v));
    set("haze", e.hazeOpacity.toFixed(3), (v) => (haze.style.opacity = v));
    set("hazeColor", e.hazeInner + e.hazeOuter, () => {
      const rgba = (c: string, a: number) => c.replace("rgb(", "rgba(").replace(")", `,${a})`);
      haze.style.background = `radial-gradient(ellipse at 50% 55%, ${rgba(e.hazeInner, 0.95)}, ${rgba(e.hazeOuter, 0.75)})`;
    });
    set("veil", e.veilOpacity.toFixed(3), (v) => (veil.style.opacity = v));
    set("lights", e.lightsOpacity.toFixed(3), (v) => (lights.style.opacity = v));
    set("farA", e.farA, (v) => (farA.style.fill = v));
    set("farB", e.farB, (v) => (farB.style.fill = v));
    set("clouds", e.cloudBase + e.cloudTop, () => clouds.forEach((g) => {
      g.style.setProperty("--cloud-base", e.cloudBase); g.style.setProperty("--cloud-top", e.cloudTop);
    }));
    return e; // e.snowAmount and e.snowflake go to Snow.tsx
  };
}
