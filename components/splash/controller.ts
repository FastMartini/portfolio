import { mapAssetStyles, mapOverlayMarkup } from "./map/markup";
import { trailheadIntro } from "../../content/trailhead";

type Options = { rate?: number; failsafe?: boolean; remember?: boolean; allowSeen?: boolean; seekCss?: boolean; preserveFragment?: boolean; onDone?: (skipped: boolean) => void };
const part = (root: ParentNode, selector: string) => {
  const element = root.querySelector<HTMLElement>(selector);
  if (!element) throw new Error(`Missing map overlay part: ${selector}`);
  return element;
};
const animationTime = (animation?: Animation | null) => typeof animation?.currentTime === "number" ? animation.currentTime : 0;
/* Map opening + Climb View transition — the JavaScript half.
 *
 * CSS alone plays the map handling and removes the opening overlay. This
 * controller adds what needs measurement or input:
 *   opening   frames the camera push on the real heading, lays the decorative
 *             greeting exactly over the List View <h1>, hands the paper off to
 *             the dark (or light) page, swaps the decorative heading for the
 *             real <h1> in a single frame, and forms the page around it;
 *   climb     on "Climb view": the page becomes paper, the camera pulls back
 *             to the floating map, the view tilts up off the map
 *             to the mountain, and the Waypoints arrive.
 * Both dismiss on pointer, key, wheel, touch or resize. Every animation they
 * create is cancelled on finish or dismissal, which restores the page.
 *
 * Stability rules (from the flicker review):
 *   - one visible copy of the heading at a time; swaps happen on one shared clock;
 *   - no filters on text; the ink mask is dropped on the last frame;
 *   - only opacity/translate on page layers; the mountain is never scaled;
 *   - geometry is measured again once webfonts settle, while nothing depends on it yet.
 */


export const OPEN = { zoom: [3420, 1000], handoff: [5420, 480], fade: [5420, 340], swap: 5960, end: 6400 };
const OPEN_REDUCED = { swap: 1190, end: 1400 };
export const CLIMB = { cover: 380, pull: [380, 870], tilt: [1150, 1000], end: 2600 };
export const LIST = { tilt: 1100, hold: 500, zoom: 1600, end: 4580 };
const LIST_OPEN_OFFSET = OPEN.zoom[0] - LIST.zoom;
const EVENTS = ["pointerdown", "keydown", "wheel", "touchstart"];

function bezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  return (x: number) => {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const e = ((ax * t + bx) * t + cx) * t - x, d = (3 * ax * t + 2 * bx) * t + cx;
      if (Math.abs(e) < 1e-6 || Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    t = Math.min(1, Math.max(0, t));
    return ((ay * t + by) * t + cy) * t;
  };
}
const pushEase = bezier(0.6, 0, 0.16, 1), pullEase = bezier(0.45, 0, 0.2, 1);

// ---------------------------------------------------------------- shared
function copyType(target: HTMLElement, heading: HTMLElement) {
  const cs = getComputedStyle(heading), r = heading.getBoundingClientRect();
  Object.assign(target.style, {
    left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`,
    fontFamily: cs.fontFamily, fontSize: cs.fontSize, fontWeight: cs.fontWeight, fontStyle: cs.fontStyle,
    letterSpacing: cs.letterSpacing,
    lineHeight: String(Math.round(parseFloat(cs.lineHeight) / parseFloat(cs.fontSize) * 1e6) / 1e6),
    fontVariationSettings: cs.fontVariationSettings,
    fontFeatureSettings: cs.fontFeatureSettings, fontKerning: cs.fontKerning,
    textWrap: cs.textWrap, wordSpacing: cs.wordSpacing, textAlign: cs.textAlign,
  });
  target.dataset.aligned = "";
  // The page copy needs no word masks. Keeping it one text run preserves the
  // font's subpixel advances across spaces, exactly like the semantic heading.
  if (target.classList.contains("splash-greeting--page")) target.textContent = heading.textContent;
  // Newsreader's spacing across word boundaries differs slightly from the
  // prototype's substitute font. Use the semantic text's actual word ranges,
  // keeping the mask spans in normal flow and avoiding transformed text layers.
  const text = heading.ownerDocument.createTreeWalker(heading, NodeFilter.SHOW_TEXT).nextNode();
  const words = Array.from(target.querySelectorAll<HTMLElement>(".splash-word"));
  words.forEach((word) => { word.style.position = "relative"; word.style.left = "0px"; word.style.top = "0px"; });
  if (text) {
    const matches = [...(text.textContent ?? "").matchAll(/\S+/g)];
    const offsets = words.map((word, i) => {
      const match = matches[i];
      if (!match) return { x: 0, y: 0 };
      const real = heading.ownerDocument.createRange(), copy = heading.ownerDocument.createRange();
      real.setStart(text, match.index); real.setEnd(text, match.index + match[0].length);
      copy.selectNodeContents(word);
      const a = real.getBoundingClientRect(), b = copy.getBoundingClientRect();
      return { x: a.left - b.left, y: a.top - b.top };
    });
    words.forEach((word, i) => { word.style.left = `${offsets[i].x}px`; word.style.top = `${offsets[i].y}px`; });
  }
  return { rect: r, style: cs };
}

// Scale S and fixed point F that push the camera from the whole sheet into the
// blank centre pane so that the pane covers the viewport and the pane point P
// under the greeting lands on the heading centre H. A pure scale about F: no drift.
function framing(el: HTMLElement, H: { x: number; y: number }) {
  const win = window;
  const rig = part(el, ".splash-rig"), probe = part(el, ".splash-probe");
  const vw = win.innerWidth, vh = win.innerHeight, w = probe.offsetWidth, ph = probe.offsetHeight;
  const cx = rig.offsetLeft, cy = rig.offsetTop;
  const c = { left: cx - w / 2, right: cx + w / 2, top: cy - ph, bottom: cy + ph };
  // Keep the pane's edges (and the hinge creases just inside them) a clear margin off screen.
  const m = w * 0.09;
  let S = Math.max(vw / (w - 2 * m), vh / (2 * ph - 2 * m)) * 1.05;
  for (let i = 0; i < 10; i++) {
    const lo = { x: c.left + m + H.x / S, y: c.top + m + H.y / S }, hi = { x: c.right - m - (vw - H.x) / S, y: c.bottom - m - (vh - H.y) / S };
    if (lo.x <= hi.x && lo.y <= hi.y) {
      const P = { x: Math.min(hi.x, Math.max(lo.x, cx)), y: Math.min(hi.y, Math.max(lo.y, cy)) };
      return { S, P, H, F: { x: (S * P.x - H.x) / (S - 1), y: (S * P.y - H.y) / (S - 1) }, map: { left: cx - w, top: cy - ph } };
    }
    S *= 1.12;
  }
  return null;
}
const scaleFrames = (from: number, to: number, ease: (x: number) => number) => Array.from({ length: 25 }, (_, i) => ({ offset: i / 24, transform: `scale(${(from * Math.pow(to / from, ease(i / 24))).toFixed(4)})` }));

export type SplashController = {
  skip: () => void;
  dispose: () => void;
  holdFailsafe: () => void;
  animations: Animation[];
  seek: (time: number) => void;
};
export type SplashElement = HTMLElement & { splashController?: SplashController };

function reducedMotion() {
  try {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.documentElement.dataset.motion = reduced ? "reduce" : "full";
    return reduced;
  }
  catch { return document.documentElement.dataset.motion === "reduce"; }
}

function lifecycle(el: HTMLElement, options: Options, onEnd: (skipped: boolean) => void) {
  const created: Animation[] = [], cleanups: (() => void)[] = [];
  let active = true, failsafe = 0, inputTask = 0;
  let motion: MediaQueryList | undefined;
  try { motion = matchMedia("(prefers-reduced-motion: reduce)"); } catch { /* CSS has the same preference rules. */ }
  const api = {
    created,
    t0: null as number | null,
    get active() { return active; },
    add(target: Element | null, keyframes: Keyframe[], timing: KeyframeAnimationOptions) {
      if (!target || !active) return null;
      const animation = target.animate(keyframes, { fill: "backwards", ...timing });
      if (api.t0 !== null) animation.startTime = api.t0;
      created.push(animation);
      return animation;
    },
    cleanup(fn: () => void) { cleanups.push(fn); },
    finish(skipped: boolean, restore = true) {
      if (!active) return;
      active = false;
      clearTimeout(failsafe); clearTimeout(inputTask);
      EVENTS.forEach((type) => window.removeEventListener(type, skip, true));
      window.removeEventListener("resize", skip);
      window.removeEventListener("hashchange", navigate);
      window.removeEventListener("pagehide", skip);
      try { motion?.removeEventListener("change", onMotion); } catch { /* Optional preference observation. */ }
      cleanups.forEach((fn) => fn());
      try { if (restore) onEnd(skipped); } finally { created.forEach((animation) => animation.cancel()); }
      delete (el as SplashElement).splashController;
      options.onDone?.(skipped);
    },
    skip: () => api.finish(true),
    holdFailsafe() { clearTimeout(failsafe); },
    arm(ms: number) {
      if (options.failsafe !== false) failsafe = window.setTimeout(skip, ms);
      // Starting click/Enter must finish dispatching before interruption begins.
      inputTask = window.setTimeout(() => {
        if (active) EVENTS.forEach((type) => window.addEventListener(type, skip, { capture: true, passive: true }));
      }, 0);
      window.addEventListener("resize", skip, { passive: true });
      window.addEventListener("hashchange", navigate);
      window.addEventListener("pagehide", skip);
      try { motion?.addEventListener("change", onMotion); } catch { /* CSS still responds to the preference. */ }
    },
    // The Climb transition holds its CSS map pose; only the opening seeks CSS.
    review(advance?: () => void, seekCss = true): SplashController {
      const controller = {
        skip: api.skip, dispose: () => api.finish(false, false), holdFailsafe: api.holdFailsafe, animations: created,
        seek(time: number) {
          api.holdFailsafe();
          // Keep transitions from hover/theme controls on their own clock.
          for (const animation of el.getAnimations({ subtree: true })) {
            if (seekCss && animation instanceof CSSAnimation) { animation.pause(); animation.currentTime = time; }
          }
          for (const animation of created) { animation.pause(); animation.currentTime = time; }
          advance?.();
          // Switching the view can add marker arrivals on this same cue.
          if (active) for (const animation of created) { animation.pause(); animation.currentTime = time; }
        },
      };
      (el as SplashElement).splashController = controller;
      return controller;
    },
  };
  const skip = () => api.finish(true);
  // Browser navigation owns its reading destination. Cancelling a view
  // transition must not run the ordinary dismissal's view-switch callback.
  const navigate = () => api.finish(true, !options.preserveFragment);
  const onMotion = (event: MediaQueryListEvent) => {
    document.documentElement.dataset.motion = event.matches ? "reduce" : "full";
    skip();
  };
  return api;
}

// ---------------------------------------------------------------- opening
export function startSplash(el: HTMLElement, options: Options = {}) {
  const doc = el.ownerDocument, win = window, root = doc.documentElement;
  if (root.dataset.splash !== "active" && !options.allowSeen) return null;
  if (typeof el.animate !== "function" || typeof el.getAnimations !== "function" || typeof requestAnimationFrame !== "function" || typeof CSSAnimation === "undefined") return null;
  const reduced = reducedMotion();
  const T = reduced ? OPEN_REDUCED : OPEN;
  const clock = el.getAnimations().find((a) => a instanceof CSSAnimation && a.animationName === "splash-exit" || a instanceof CSSAnimation && a.animationName === "splash-rm-exit");
  const elapsed = () => animationTime(clock);
  const cancelCss = (target: HTMLElement | null, name: string) => target && target.getAnimations().forEach((a) => { if (a instanceof CSSAnimation && a.animationName === name) a.cancel(); });

  const paper = part(el, ".splash-greeting--paper"), page = part(el, ".splash-greeting--page");
  const sheet = part(el, ".splash-paper-stage"), camera = part(el, ".splash-camera");
  const life = lifecycle(el, options, (skipped) => {
    root.dataset.splash = "seen";
    if (skipped) el.classList.add("splash--skipped");
    if (options.remember !== false) { try { win.sessionStorage.setItem("splash-seen", "1"); } catch {} }
  });
  life.review(undefined, options.seekCss !== false);
  function setup() {
    const heading = doc.getElementById("trailhead-title");
    const section = heading?.closest<HTMLElement>(".trailhead");
    const usable = heading && section && heading.getClientRects().length && elapsed() < 4250;

    const { add } = life;
    let zoomAnim: Animation | null = null;

    function layout() {
      copyType(paper, heading!);
      copyType(page, heading!);
      if (reduced || elapsed() > OPEN.zoom[0] - 50) return;
      const g = paper.getBoundingClientRect();
      const f = framing(el, { x: g.left + g.width / 2, y: g.top + g.height / 2 });
      if (!f) return;
      cancelCss(camera, "splash-zoom-fallback");
      camera.style.transformOrigin = `${f.F.x}px ${f.F.y}px`;
      if (zoomAnim) { zoomAnim.cancel(); life.created.splice(life.created.indexOf(zoomAnim), 1); }
      zoomAnim = add(camera, scaleFrames(1, f.S, pushEase), { delay: OPEN.zoom[0], duration: OPEN.zoom[1], fill: "both" });
      el.dataset.zoom = JSON.stringify({ S: +f.S.toFixed(3), P: f.P, H: f.H, F: f.F });
    }

    if (usable) {
      layout();
      cancelCss(sheet, "splash-sheet-fallback");
      // Webfonts may settle after first paint; nothing depends on the geometry until the push begins.
      if (doc.fonts?.status !== "loaded") doc.fonts?.ready.then(() => {
        if (life.active && elapsed() < OPEN.zoom[0] - 50) {
          layout();
          if (clock?.playState === "paused" && zoomAnim) { zoomAnim.pause(); zoomAnim.currentTime = elapsed(); }
        } else if (life.active && elapsed() < 4250) { copyType(paper, heading!); copyType(page, heading!); }
      });

      // One heading at a time: the real <h1> is hidden until the frame the page copy disappears.
      add(heading, [{ opacity: 0 }, { opacity: 0 }], { duration: T.swap, fill: "none" });
      add(page, [{ visibility: "visible" }, { visibility: "visible" }], { delay: reduced ? 0 : 5000, duration: T.swap - (reduced ? 0 : 5000), fill: "none" });

      const theme = root.dataset.theme === "light" ? "light" : "dark";
      if (!reduced) {
        if (theme === "light") {
          add(sheet, [{ opacity: 1 }, { opacity: 0 }], { delay: OPEN.fade[0], duration: OPEN.fade[1], easing: "ease-in-out", fill: "forwards" });
        } else {
          // Dusk passes over the paper, left to right; only a narrow band is ever between states.
          const vw = win.innerWidth, M = vw * 3.2, image = "linear-gradient(100deg, transparent 0 46%, #000 54% 100%)";
          const at = (x: number) => ({ maskImage: image, webkitMaskImage: image, maskSize: `${M}px 100%`, webkitMaskSize: `${M}px 100%`,
            maskRepeat: "no-repeat", webkitMaskRepeat: "no-repeat", maskPosition: `${x}px 0`, webkitMaskPosition: `${x}px 0` });
          add(sheet, [at(-0.2 * vw - M / 2), at(1.2 * vw - M / 2)], { delay: OPEN.handoff[0], duration: OPEN.handoff[1], easing: "cubic-bezier(0.45, 0, 0.4, 1)", fill: "forwards" });
        }
        const rise = (target: Element | null, delay: number, duration: number, distance = 6) => add(target, [{ opacity: 0, translate: `0 ${distance}px` }, { opacity: 1, translate: "0 0" }],
          { delay, duration, easing: "cubic-bezier(0.2, 0.7, 0.3, 1)" });
        add(doc.querySelector<HTMLElement>(".site-header"), [{ opacity: 0, translate: "0 -8px" }, { opacity: 1, translate: "0 0" }], { delay: 5500, duration: 500, easing: "cubic-bezier(0.2, 0.7, 0.3, 1)" });
        rise(section.querySelector<HTMLElement>(".trailhead-portrait"), 5560, 620, 16);
        rise(section.querySelector<HTMLElement>(".eyebrow"), 5700, 420);
        rise(section.querySelector<HTMLElement>(".trailhead-lead"), 5760, 440);
        rise(section.querySelector<HTMLElement>(".trailhead-intro"), 5820, 440);
        rise(section.querySelector<HTMLElement>(".trailhead-actions"), 5880, 440);
        rise(section.querySelector<HTMLElement>(".scroll-cue"), 5960, 420);
      } else {
        [doc.querySelector<HTMLElement>(".site-header"), section.querySelector<HTMLElement>(".eyebrow"), section.querySelector<HTMLElement>(".trailhead-lead"),
          section.querySelector<HTMLElement>(".trailhead-intro"), section.querySelector<HTMLElement>(".trailhead-actions"),
          section.querySelector<HTMLElement>(".trailhead-portrait"), section.querySelector<HTMLElement>(".scroll-cue")]
          .forEach((target, i) => add(target, [{ opacity: 0 }, { opacity: 1 }], { delay: 520 + i * 60, duration: 480, easing: "ease-out" }));
      }
    }

  }
  // Align script animations with the overlay's own CSS clock.
  const sync = () => { if (!life.active || !clock || clock.startTime == null) return; life.t0 = Number(clock.startTime); life.created.forEach((a) => { a.startTime = life.t0; }); };
  if (clock) { if (clock.startTime != null) sync(); else clock.ready.then(sync).catch(() => {}); }
  const onEnd = (event: AnimationEvent) => { if (event.target === el) life.finish(false); };
  el.addEventListener("animationend", onEnd);
  life.cleanup(() => el.removeEventListener("animationend", onEnd));
  let layoutFrame = 0;
  const deadline = performance.now() + 1400;
  const waitForLayout = () => {
    if (!life.active) return;
    const heading = doc.getElementById("trailhead-title");
    if (heading?.getClientRects().length) { setup(); sync(); }
    else if (performance.now() < deadline) layoutFrame = requestAnimationFrame(waitForLayout);
  };
  life.cleanup(() => cancelAnimationFrame(layoutFrame));
  waitForLayout();
  life.arm(Math.max(0, (reduced ? 2400 : 7000) - elapsed()));
  return life.review(undefined, options.seekCss !== false);
}

// Climb → List: play only the opening's paper, camera and hero tracks. Its
// physical folds stay fixed at the fully open pose. The opening clock starts
// 1820ms in, placing its existing zoom immediately after the overhead hold.
function toListTransition(el: HTMLElement, switchView: () => void, options: Options = {}) {
  const doc = el.ownerDocument;
  let switched = false, landing: SplashController | null = null, frame = 0;
  const doSwitch = () => { if (!switched) { switched = true; switchView(); } };
  const life = lifecycle(el, { ...options, preserveFragment: true }, doSwitch);
  life.t0 = Number(doc.timeline.currentTime);
  const screenTracks: Animation[] = [];
  let clock: Animation | undefined;
  for (const animation of el.getAnimations({ subtree: true })) {
    if (!(animation instanceof CSSAnimation)) continue;
    if (/^splash-(exit|sheet|zoom-fallback|world-off|ink|print-fade)/.test(animation.animationName)) {
      animation.startTime = life.t0 - LIST_OPEN_OFFSET;
      screenTracks.push(animation);
      if (animation.animationName === "splash-exit") clock = animation;
    } else {
      animation.pause();
      animation.currentTime = 3550;
    }
  }
  if (!clock) throw new Error("Missing List transition clock");
  const { add } = life;
  const easing = "cubic-bezier(0.45, 0, 0.3, 1)";
  add(part(el, ".splash-rig"), [{ translate: "0 112vh" }, { translate: "0 0" }], { duration: LIST.tilt, easing, fill: "both" });
  add(part(el, ".splash-map"), [{ transform: "rotateX(58deg)" }, { transform: "rotateX(0deg)" }], { duration: LIST.tilt, easing, fill: "both" });
  add(part(el, ".splash-table"), [{ translate: "0 145vh" }, { translate: "0 0" }], { duration: LIST.tilt, easing, fill: "both" });
  add(doc.querySelector(".climb-stage"), [{ translate: "0 0" }, { translate: "0 -62vh" }], { duration: LIST.tilt, easing, fill: "both" });
  // The original header reveal takes over while this short departure finishes.
  add(doc.querySelector(".site-header"), [{ opacity: 1, translate: "0 0" }, { opacity: 0, translate: "0 -8px", offset: 0.25 }, { opacity: 0, translate: "0 -8px" }], { duration: LIST.tilt + 200, fill: "none" });
  doc.querySelectorAll(".climb-rail, .climb-marker, .climb-card, .climb-portrait").forEach(target =>
    add(target, [{ opacity: getComputedStyle(target).opacity }, { opacity: 0 }], { duration: 300, fill: "forwards" }));

  const base = life.review(undefined, false);
  const controller: SplashController = {
    skip: base.skip, dispose: base.dispose,
    holdFailsafe() { base.holdFailsafe(); landing?.holdFailsafe(); },
    get animations() { return [...life.created, ...(landing?.animations ?? [])]; },
    seek(time) {
      if (!life.active) return;
      controller.holdFailsafe();
      for (const animation of screenTracks) {
        if (animation.playState !== "idle") { animation.pause(); animation.currentTime = time + LIST_OPEN_OFFSET; }
      }
      base.seek(time);
      advance();
      if (life.active) landing?.seek(time + LIST_OPEN_OFFSET);
    },
  };
  const advance = () => {
    if (!life.active) return;
    const time = animationTime(clock) - LIST_OPEN_OFFSET;
    if (!switched && time >= LIST.tilt) {
      doSwitch();
      landing = startSplash(el, { allowSeen: true, seekCss: false, remember: false, onDone: () => life.finish(false) });
      // startSplash owns the hero reveal; the outer controller owns the complete
      // look-down sequence, including review seeks and interruption cleanup.
      (el as SplashElement).splashController = controller;
    }
    if (time >= LIST.end) life.finish(false);
  };
  const tick = () => { advance(); if (life.active) frame = requestAnimationFrame(tick); };
  life.cleanup(() => { cancelAnimationFrame(frame); landing?.dispose(); el.remove(); });
  frame = requestAnimationFrame(tick);
  life.arm(LIST.end + 1500);
  (el as SplashElement).splashController = controller;
  return controller;
}

export function createListTransition(switchView: () => void, onDone?: () => void) {
  if (reducedMotion() || typeof Element.prototype.animate !== "function" || typeof CSSAnimation === "undefined") {
    switchView(); onDone?.(); return null;
  }
  const overlay = document.createElement("div");
  overlay.className = "splash splash--list";
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML = mapOverlayMarkup(trailheadIntro.heading, "splash-list");
  for (const [name, value] of Object.entries(mapAssetStyles)) overlay.style.setProperty(name, value);
  document.body.prepend(overlay);
  let switched = false;
  const once = () => { if (!switched) { switched = true; switchView(); } };
  try { return toListTransition(overlay, once, { onDone }); }
  catch { (overlay as SplashElement).splashController?.skip(); overlay.remove(); once(); onDone?.(); return null; }
}

// ------------------------------------------------- List View → Climb View
// el: a fresh copy of the opening overlay. switchView(): the app's own
// toggle (shows the Climb, hides the List View). Returns a controller.
export function toClimbTransition(el: HTMLElement, switchView: () => void, options: Options = {}) {
  const doc = el.ownerDocument, win = window, root = doc.documentElement;
  const reduced = reducedMotion();
  let switched = false;
  const doSwitch = () => { if (!switched) { switched = true; switchView(); } };

  if (reduced) {
    // Opacity only: the Climb fades in over the page background.
    doSwitch();
    const life = lifecycle(el, { ...options, preserveFragment: true }, () => {});
    life.cleanup(() => el.remove());
    life.review(undefined, false);
    life.t0 = Number(doc.timeline.currentTime);
    life.add(doc.querySelector<HTMLElement>(".climb-enhancement"), [{ opacity: 0 }, { opacity: 1 }], { duration: 320, easing: "ease-out" })
      ?.finished.then(() => life.finish(false)).catch(() => {});
    life.arm(1000);
    return life.review(undefined, false);
  }

  el.classList.add("splash--climb");
  doc.body.prepend(el);
  // Hold the opening's own CSS frames at the fully unfolded, centered sheet.
  for (const a of el.getAnimations({ subtree: true })) {
    if (!(a instanceof CSSAnimation)) continue;
    const n = a.animationName;
    if (/^splash-(exit|sheet|zoom-fallback)/.test(n)) { a.cancel(); continue; }
    a.pause();
    a.currentTime = /^splash-world-off/.test(n) ? 0 : /^splash-(print-fade)/.test(n) ? 0 : 3550;
  }
  const life = lifecycle(el, { ...options, preserveFragment: true }, doSwitch);
  life.cleanup(() => el.remove());
  life.review(undefined, false);
  const { add } = life;
  life.t0 = Number(doc.timeline.currentTime);

  const sheet = part(el, ".splash-paper-stage"), camera = part(el, ".splash-camera"), world = part(el, ".splash-world");
  const paper = part(el, ".splash-greeting--paper"), pageCopy = part(el, ".splash-greeting--page");
  const heading = doc.getElementById("trailhead-title")!, vw = win.innerWidth, vh = win.innerHeight;
  const headerBottom = doc.querySelector<HTMLElement>(".site-header")?.getBoundingClientRect().bottom ?? 0;
  const hr = heading.getBoundingClientRect();
  const showGreeting = hr.top >= headerBottom - 4 && hr.bottom <= vh;   // only if the heading is on screen
  const H = showGreeting ? { x: hr.left + hr.width / 2, y: hr.top + hr.height / 2 } : { x: vw / 2, y: vh / 2 };
  const f = framing(el, H);
  const C = CLIMB.cover;

  // 1. The page becomes paper (dark: dawn moves right to left; light: the paper fades up).
  if (showGreeting) {
    copyType(paper, heading!); copyType(pageCopy, heading);
    paper.querySelectorAll<HTMLElement>(".splash-word").forEach((w) => { w.style.animation = "none"; w.style.maskImage = w.style.webkitMaskImage = "none"; });
    add(heading, [{ opacity: 0 }, { opacity: 0 }], { duration: CLIMB.end, fill: "none" });
    add(pageCopy, [{ visibility: "visible" }, { visibility: "visible" }], { duration: C, fill: "none" });
  } else paper.hidden = true;
  if (root.dataset.theme === "light") {
    add(sheet, [{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: "ease-out", fill: "both" });
  } else {
    const M = vw * 3.2, image = "linear-gradient(100deg, transparent 0 46%, #000 54% 100%)";
    const at = (x: number) => ({ maskImage: image, webkitMaskImage: image, maskSize: `${M}px 100%`, webkitMaskSize: `${M}px 100%`, maskRepeat: "no-repeat", webkitMaskRepeat: "no-repeat", maskPosition: `${x}px 0`, webkitMaskPosition: `${x}px 0` });
    add(sheet, [at(1.2 * vw - M / 2), at(-0.2 * vw - M / 2)], { duration: C - 20, easing: "cubic-bezier(0.45, 0, 0.4, 1)", fill: "backwards" });
  }
  add(sheet, [{ visibility: "hidden" }, { visibility: "hidden" }], { delay: C, duration: CLIMB.end, fill: "none" });
  add(world, [{ opacity: 0 }, { opacity: 0 }], { duration: C, fill: "none" });
  // Cues run off the same animation clock as everything else, so pausing or seeking holds them too.
  const clock = add(el, [{ opacity: 1 }, { opacity: 1 }], { duration: CLIMB.end, fill: "none" });
  const cues: { ms: number; fn: () => void; done: boolean }[] = [];
  const at = (ms: number, fn: () => void) => cues.push({ ms, fn, done: false });
  let frame = 0;
  const advance = () => {
    if (!life.active) return;
    const t = animationTime(clock);
    for (const cue of cues) if (!cue.done && t >= cue.ms) { cue.done = true; cue.fn(); }
  };
  const tick = () => { advance(); if (life.active) frame = requestAnimationFrame(tick); };
  frame = requestAnimationFrame(tick);
  life.cleanup(() => cancelAnimationFrame(frame));
  at(C, doSwitch);

  // 2. Pull back from the page to the floating map.
  if (f) {
    camera.style.transformOrigin = `${f.F.x}px ${f.F.y}px`;
    if (showGreeting) {
      // The same words, printed on the centre pane where the camera will find them.
      const pg = part(el, ".splash-pane-greeting");
      const cs = getComputedStyle(heading), s = 1 / f.S;
      const lines: string[][] = []; let lastTop: number | null = null;
      paper.querySelectorAll<HTMLElement>(".splash-word").forEach((w) => { const t = Math.round(w.getBoundingClientRect().top); if (t !== lastTop) { lines.push([]); lastTop = t; } lines[lines.length - 1].push(w.textContent); });
      pg.innerHTML = lines.map((l) => l.join(" ").replace(/&/g, "&amp;").replace(/</g, "&lt;")).join("<br>");
      Object.assign(pg.style, {
        left: `${f.F.x + (hr.left - f.F.x) * s - f.map.left}px`, top: `${f.F.y + (hr.top - f.F.y) * s - f.map.top}px`,
        fontFamily: cs.fontFamily, fontWeight: cs.fontWeight, fontSize: `${parseFloat(cs.fontSize) * s}px`,
        letterSpacing: `${parseFloat(cs.letterSpacing || "0") * s}px`, lineHeight: `${parseFloat(cs.lineHeight) * s}px`,
      });
      pg.dataset.aligned = "";
    }
    add(camera, [{ transform: `scale(${f.S})` }, { transform: `scale(${f.S})` }], { duration: CLIMB.pull[0], fill: "backwards" });
    add(camera, scaleFrames(f.S, 1, pullEase), { delay: CLIMB.pull[0], duration: CLIMB.pull[1], fill: "forwards" });
  }
  // At full magnification the pane's row seam and edges would read as lines; a plain sheet
  // over the pane hides them and lifts as the folds come into view.
  add(part(el, ".splash-pane-cover"), [{ opacity: 1 }, { opacity: 0 }], { delay: 470, duration: 420, easing: "ease-in-out", fill: "both" });
  // 3. Look up from the map to the mountain: the sheet tips away and drops out of view,
  //    the backdrop slides down, and the Climb (already behind) descends into place.
  const [t0, td] = CLIMB.tilt, lookUp = "cubic-bezier(0.5, 0, 0.3, 1)";
  add(part(el, ".splash-map"), [{ transform: "rotateX(0deg)" }, { transform: "rotateX(58deg)" }], { delay: t0, duration: td, easing: "cubic-bezier(0.45, 0, 0.6, 1)", fill: "forwards" });
  add(part(el, ".splash-rig"), [{ translate: "0 0" }, { translate: "0 112vh" }], { delay: t0 + 80, duration: td - 80, easing: lookUp, fill: "forwards" });
  add(part(el, ".splash-table"), [{ translate: "0 0" }, { translate: "0 140vh" }], { delay: t0, duration: td, easing: lookUp, fill: "forwards" });
  const stage = doc.querySelector<HTMLElement>(".climb-stage");
  add(stage, [{ translate: "0 -62vh" }, { translate: "0 0" }], { delay: t0, duration: td + 120, easing: "cubic-bezier(0.35, 0, 0.2, 1)" });

  // 4. Waypoints, rail, Trailhead card and portrait arrive; the scene becomes interactive.
  const markers = [...doc.querySelectorAll<HTMLElement>(".climb-marker:not([hidden])")].sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top);
  markers.forEach((m, i) => add(m, [{ opacity: 0, scale: "0.4" }, { opacity: 1, scale: "1" }], { delay: 1780 + i * 90, duration: 420, easing: "cubic-bezier(0.3, 1.45, 0.5, 1)" }));
  add(doc.querySelector<HTMLElement>(".climb-rail"), [{ opacity: 0 }, { opacity: 1 }], { delay: 1900, duration: 420 });
  add(doc.querySelector<HTMLElement>('.climb-card[data-card="0"]'), [{ opacity: 0, translate: "0 14px" }, { opacity: 1, translate: "0 0" }], { delay: 2000, duration: 480, easing: "cubic-bezier(0.2, 0.7, 0.3, 1)" });
  add(doc.querySelector<HTMLElement>(".climb-portrait"), [{ opacity: 0, translate: "0 14px" }, { opacity: 1, translate: "0 0" }], { delay: 2080, duration: 480, easing: "cubic-bezier(0.2, 0.7, 0.3, 1)" });
  add(world, [{ opacity: 1 }, { opacity: 1 }], { delay: C, duration: t0 + td - C, fill: "none" });
  add(world, [{ visibility: "hidden" }, { visibility: "hidden" }], { delay: t0 + td, duration: CLIMB.end, fill: "none" });

  // The climb stage's own markers are placed after switchView(); measure them then.
  at(C + 20, () => {
    [...doc.querySelectorAll<HTMLElement>(".climb-marker:not([hidden])")].sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top)
      .forEach((m, i) => { if (!markers.includes(m)) add(m, [{ opacity: 0, scale: "0.4" }, { opacity: 1, scale: "1" }], { delay: 1780 + i * 90, duration: 420, easing: "cubic-bezier(0.3, 1.45, 0.5, 1)" }); });
  });
  at(CLIMB.end - 1, () => life.finish(false));
  life.arm(CLIMB.end + 1500);
  return life.review(advance, false);
}

// A fresh, namespaced copy keeps React ownership of the server-rendered opening
// separate from the short-lived transition DOM.
export function createClimbTransition(switchView: () => void, onDone?: () => void) {
  const overlay = document.createElement("div");
  overlay.className = "splash splash--climb";
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML = mapOverlayMarkup(trailheadIntro.heading, "splash-climb");
  for (const [name, value] of Object.entries(mapAssetStyles)) overlay.style.setProperty(name, value);
  try { return toClimbTransition(overlay, switchView, { onDone }); }
  catch { (overlay as SplashElement).splashController?.skip(); overlay.remove(); switchView(); onDone?.(); return null; }
}
