// Reference implementation (from the approved prototype). Framework-free, no dependencies.
// OKLab mixing for surfaces and inks; WCAG 2.x relative-luminance contrast.

export type Rgb = readonly [number, number, number]; // 0..1 sRGB

export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export function smooth(a: number, b: number, v: number) {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

export const hexRgb = (hex: string): Rgb =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as unknown as Rgb;
const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const gam = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function toLab(rgb: Rgb): [number, number, number] {
  const [r, g, b] = rgb.map(lin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}
function fromLab([L, a, b]: readonly number[]): Rgb {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((c) => clamp(gam(c), 0, 1)) as unknown as Rgb;
}

const labCache = new Map<string, [number, number, number]>();
const lab = (hex: string) => {
  let v = labCache.get(hex);
  if (!v) labCache.set(hex, (v = toLab(hexRgb(hex))));
  return v;
};

/** Mix two hex colors in OKLab. t = 0 returns `a`, t = 1 returns `b`. */
export function mixLab(a: string, b: string, t: number): Rgb {
  if (t <= 0) return hexRgb(a);
  if (t >= 1) return hexRgb(b);
  const A = lab(a), B = lab(b);
  return fromLab(A.map((v, i) => v + (B[i] - v) * t));
}

export const cssRgb = (rgb: Rgb) => `rgb(${rgb.map((c) => Math.round(c * 255)).join(",")})`;
export const rgbHex = (rgb: Rgb) => "#" + rgb.map((c) => Math.round(c * 255).toString(16).padStart(2, "0")).join("");

const luminance = (rgb: Rgb) => {
  const [r, g, b] = rgb.map(lin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export function contrast(x: Rgb, y: Rgb) {
  const a = luminance(x), b = luminance(y);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
