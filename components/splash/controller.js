/* CSS owns the map and paper on one shared clock. The opening reveals the
 * actual Trailhead heading once; decorative type is reserved for Climb View.
 * Both transitions release every page animation on completion or dismissal.
 */

import OPEN from "./timing.json";
import VIEWS from "./view-timing.json";
import { hillsideCamera } from "../climb/hillside-camera";
const LIST = (() => {
  const { tilt, hold } = VIEWS.list;
  const zoom = [tilt + hold, OPEN.zoom[1]];
  const hero = [zoom[0] + zoom[1], OPEN.hero[1]];
  return { tilt, hold, zoom, hero, end: hero[0] + hero[1] };
})();
const CLIMB = VIEWS.climb;
const CONTROLLER = Symbol.for("portfolio.splash");
const EVENTS = ["pointerdown", "keydown", "wheel", "touchstart"];

function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  return (x) => {
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
function copyType(target, heading) {
  const cs = getComputedStyle(heading), r = heading.getBoundingClientRect();
  Object.assign(target.style, {
    left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`,
    fontFamily: cs.fontFamily, fontSize: cs.fontSize, fontWeight: cs.fontWeight, fontStyle: cs.fontStyle,
    // Keep the unitless leading: rounded computed pixel values can shift a baseline.
    letterSpacing: cs.letterSpacing, lineHeight: String(parseFloat(cs.lineHeight) / parseFloat(cs.fontSize)), fontVariationSettings: cs.fontVariationSettings,
    fontFeatureSettings: cs.fontFeatureSettings, fontKerning: cs.fontKerning,
  });
  target.dataset.aligned = "";
  return { rect: r, style: cs };
}

// Scale S and fixed point F that push the camera from the whole sheet into the
// blank centre pane so that the pane covers the viewport and the pane point P
// under the greeting lands on the heading centre H. A pure scale about F: no drift.
function framing(el, H) {
  const win = el.ownerDocument.defaultView;
  const rig = el.querySelector(".splash-rig"), probe = el.querySelector(".splash-probe");
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
const scaleFrames = (from, to, ease) => Array.from({ length: 25 }, (_, i) => ({ offset: i / 24, transform: `scale(${(from * Math.pow(to / from, ease(i / 24))).toFixed(4)})` }));

function lifecycle(el, options, onEnd) {
  const win = el.ownerDocument.defaultView, created = [];
  let active = true, failsafe = 0, armTimer = 0;
  const cleanups = [];
  const api = {
    created,
    cleanup(fn) { cleanups.push(fn); },
    add(target, keyframes, timing) {
      if (!target) return null;
      const anim = target.animate(keyframes, { fill: "backwards", ...timing });
      if (api.t0 != null) anim.startTime = api.t0;
      if (options.rate) anim.playbackRate = options.rate;
      created.push(anim);
      return anim;
    },
    t0: null,
    get active() { return active; },
    finish(skipped, disposed = false) {
      if (!active) return;
      active = false;
      win.clearTimeout(failsafe);
      win.clearTimeout(armTimer);
      // Release every resource even if an optional browser API fails during
      // teardown. No animation may keep page content hidden after dismissal.
      const safely = (fn) => { try { fn(); } catch {} };
      cleanups.forEach(safely);
      EVENTS.forEach((type) => safely(() => win.removeEventListener(type, skip, true)));
      safely(() => win.removeEventListener("resize", skip));
      safely(() => motion.removeEventListener?.("change", onMotion));
      safely(() => onEnd(skipped, disposed));
      created.forEach((a) => safely(() => a.cancel()));
      delete el[CONTROLLER];
      options.onDone?.(skipped);
    },
    // Review tools that pause the clock must also hold the failsafe.
    holdFailsafe() { win.clearTimeout(failsafe); },
    arm(ms) {
      if (options.failsafe !== false) failsafe = win.setTimeout(skip, ms / (options.rate || 1));
      // Listen from the next task, so the click that started a transition does not end it.
      armTimer = win.setTimeout(() => { if (active) EVENTS.forEach((type) => win.addEventListener(type, skip, { capture: true, passive: true })); }, 0);
      win.addEventListener("resize", skip);
      motion.addEventListener?.("change", onMotion);
    },
  };
  const skip = () => api.finish(true);
  const onMotion = (event) => { if (event.matches) skip(); };
  const motion = win.matchMedia("(prefers-reduced-motion: reduce)");
  api.skip = skip;
  api.dispose = () => api.finish(true, true);
  el[CONTROLLER] = api;
  return api;
}

// One cue clock for both view transitions; input, disposal and failures all
// release its frame loop with the rest of the owned animations.
function cueTimeline(life, el, duration) {
  const win = el.ownerDocument.defaultView;
  const clock = life.add(el, [{ opacity: 1 }, { opacity: 1 }], { duration, fill: "none" });
  const cues = [];
  let frame = 0;
  life.cleanup(() => win.cancelAnimationFrame(frame));
  const tick = () => {
    win.cancelAnimationFrame(frame);
    if (!life.active) return;
    const t = clock.currentTime ?? 0;
    for (const cue of cues) if (!cue.done && t >= cue.ms) {
      cue.done = true;
      try { cue.fn(); } catch { life.skip(); break; }
    }
    if (life.active) frame = win.requestAnimationFrame(tick);
  };
  frame = win.requestAnimationFrame(tick);
  return { tick, at: (ms, fn) => cues.push({ ms, fn, done: false }) };
}

function freezeOpenMap(el, textured = false) {
  const frozen = el.getAnimations({ subtree: true }).filter((a) => a instanceof CSSAnimation);
  for (const a of frozen) {
    const n = a.animationName;
    if (/^splash-(exit|sheet|zoom-fallback)/.test(n)) { a.cancel(); continue; }
    a.pause();
    a.currentTime = /^splash-(face-grain|crease|sheen)/.test(n) ? (textured ? OPEN.unfold : OPEN.paper[0]) : /^splash-world-off/.test(n) ? 0 : OPEN.unfold + 100;
  }
  return frozen;
}

// Keep the real h1 in its final layout slot; only its visual position moves.
// Both List View entry paths use this clock, including the centered reading hold.
function revealHero(life, section, at, includeHeader = true) {
  const doc = section.ownerDocument, win = doc.defaultView;
  const heading = section.querySelector("#trailhead-title");
  // Center the printed words, excluding the block's unused line width.
  const words = doc.createRange(); words.selectNodeContents(heading);
  const r = words.getBoundingClientRect();
  const centered = `${win.innerWidth / 2 - r.left - r.width / 2}px ${win.innerHeight / 2 - r.top - r.height / 2}px`;
  const ease = "cubic-bezier(0.4, 0, 0.2, 1)";
  const rise = (target, offset, duration, distance = 6) => life.add(target,
    [{ opacity: 0, translate: `0 ${distance}px` }, { opacity: 1, translate: "0 0" }],
    { delay: at + offset, duration, easing: "cubic-bezier(0.2, 0.7, 0.3, 1)" });
  life.add(heading, [{ opacity: 0 }, { opacity: 1 }], { delay: at, duration: 280, easing: "ease-out", fill: "both" });
  life.add(heading, [{ translate: centered }, { translate: "0 0" }],
    { delay: at + 600, duration: 850, easing: ease, fill: "both" });
  if (includeHeader) rise(doc.querySelector(".site-header"), 100, 450, -8);
  rise(section.querySelector(".eyebrow"), 1180, 420);
  rise(section.querySelector(".trailhead-lead"), 1220, 480);
  rise(section.querySelector(".trailhead-intro"), 1280, 460);
  rise(section.querySelector(".trailhead-actions"), 1340, 460);
  // The stacked portrait follows the copy; on desktop it joins the leftward glide.
  rise(section.querySelector(".trailhead-portrait"), win.innerWidth <= 900 ? 1360 : 680,
    win.innerWidth <= 900 ? 440 : 1000, 20);
  rise(section.querySelector(".scroll-cue"), 1400, 400);
}

// The same paper takeover as the generated opening CSS, shifted to a new
// zoom start. A single effect owns opacity and color throughout the handoff.
function paperHandoff(life, el, zoomStart) {
  const sheet = el.querySelector(".splash-sheet");
  const delay = zoomStart + OPEN.paper[0] - OPEN.zoom[0];
  const solid = OPEN.paper[1], fadeAt = OPEN.paperFade[0] - OPEN.paper[0];
  const duration = fadeAt + OPEN.paperFade[1];
  const paper = getComputedStyle(el).getPropertyValue("--paper").trim();
  const page = getComputedStyle(el.ownerDocument.body).backgroundColor;
  life.add(sheet, [
    { opacity: 0, backgroundColor: paper, offset: 0 },
    { opacity: 1, backgroundColor: page, offset: solid / duration },
    { opacity: 1, backgroundColor: page, offset: fadeAt / duration },
    { opacity: 0, backgroundColor: page, offset: 1 },
  ], { delay, duration, fill: "both" });
  life.add(sheet, [{ opacity: 1 }, { opacity: 0 }], { delay, duration: solid, pseudoElement: "::before", fill: "both" });
}

// ---------------------------------------------------------------- opening
function start(el, options = {}) {
  const doc = el.ownerDocument, win = doc.defaultView, root = doc.documentElement;
  const reduced = root.dataset.motion === "reduce" || win.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // Disposed React effects may reconnect, but completed/dismissed intros never replay.
  if (root.dataset.splash !== "active" || reduced || el.matches(".splash--skipped,.splash--finished")) return null;
  const css = el.getAnimations({ subtree: true }).filter((a) => a instanceof CSSAnimation);
  const clock = css.find((a) => a.animationName === "splash-exit");
  if (Number(clock?.currentTime) >= OPEN.end) return null;
  const began = win.performance.now();
  const elapsed = () => clock?.currentTime != null ? Number(clock.currentTime) : win.performance.now() - began;
  let frame = 0, readyTimer = 0, held = false, ready = false, waiting = false, assetsReady = false, timedOut = false;
  let heading, section;

  const life = lifecycle(el, options, (skipped, disposed) => {
    if (disposed) return;
    el.classList.add(skipped ? "splash--skipped" : "splash--finished");
    if (options.remember !== false) { try { win.sessionStorage.setItem("splash-seen", "1"); } catch {} }
  });
  life.cleanup(() => {
    win.cancelAnimationFrame(frame);
    win.clearTimeout(readyTimer);
    // Strict Mode's setup/cleanup/setup must not restart or strand the CSS clock.
    if (held) css.forEach((a) => { if (a.playState === "paused") a.play(); });
  });

  function prepare() {
    if (!life.active) return;
    ready = true;
    win.clearTimeout(readyTimer);
    const t = elapsed();
    // Late hydration must not rewind a visible hero or start a second reveal.
    if (t >= OPEN.hero[0]) return;
    const camera = el.querySelector(".splash-camera");
    const f = t < OPEN.zoom[0] ? framing(el, { x: win.innerWidth / 2, y: win.innerHeight / 2 }) : null;
    if (f) {
      camera.getAnimations().forEach((a) => { if (a.animationName === "splash-zoom-fallback") a.cancel(); });
      camera.style.transformOrigin = `${f.F.x}px ${f.F.y}px`;
      life.add(camera, scaleFrames(1, f.S, pushEase), { delay: OPEN.zoom[0], duration: OPEN.zoom[1], fill: "both" });
      el.dataset.zoom = JSON.stringify({ S: +f.S.toFixed(3), P: f.P, H: f.H, F: f.F });
    }
    // Resolve the page surface before exposing it. There is no heading clone,
    // mask swap, or second opacity animation fighting the sheet's CSS effect.
    el.style.setProperty("--splash-page-bg", getComputedStyle(doc.body).backgroundColor);
    revealHero(life, section, OPEN.hero[0]);

    // Resume the entire sequence from the held frame, sharing one origin.
    life.t0 = !held && clock?.startTime != null ? clock.startTime : Number(doc.timeline.currentTime) - t;
    css.forEach((a) => {
      // The prepaint texture gate may have just released a pending CSS clock.
      // Resolve every live effect to one origin; canceled camera fallbacks stay canceled.
      if (a.playState === "idle") return;
      if (held && a.playState === "paused") a.play();
      a.startTime = life.t0;
    });
    held = false;
    life.created.forEach((a) => { a.startTime = life.t0; });
  }

  function enhance() {
    if (!life.active || ready) return;
    if (root.dataset.splash !== "active") { life.skip(); return; }
    const printReady = root.dataset.splashArt !== "loading";
    const t = elapsed();
    heading = doc.getElementById("trailhead-title");
    section = heading?.closest(".trailhead");
    const laidOut = Boolean(section && heading.getClientRects().length);
    if (laidOut && !waiting) {
      waiting = true;
      const portrait = section.querySelector("img");
      // Readiness is bounded. A slow font/image holds the settled map rather
      // than exposing an unfinished page; a failed request cannot trap visitors.
      Promise.allSettled([doc.fonts?.ready, portrait?.decode?.()]).then(() => { assetsReady = true; });
    }
    if (laidOut && printReady && (assetsReady || timedOut)) {
      try { prepare(); } catch { life.skip(); }
      return;
    }
    if (timedOut && printReady && !laidOut) { life.skip(); return; }
    if (!held && clock && t >= OPEN.unfold && t < OPEN.hero[0]) {
      css.forEach((a) => { a.pause(); a.currentTime = t; });
      held = true;
    }
    frame = win.requestAnimationFrame(enhance);
  }
  readyTimer = win.setTimeout(() => { timedOut = true; }, OPEN.readyTimeout);
  enhance();
  const onEnd = (event) => { if (event.target === el && event.animationName === "splash-exit") life.finish(false); };
  el.addEventListener("animationend", onEnd);
  life.cleanup(() => el.removeEventListener("animationend", onEnd));
  life.arm(OPEN.failsafe);
  return el[CONTROLLER] = {
    skip: life.skip, dispose: life.dispose, holdFailsafe: life.holdFailsafe,
    animations: life.created, get ready() { return ready; }, get aligned() { return Boolean(el.dataset.zoom); }, reduced: false,
  };
}

// ------------------------------------------------- List View → Climb View
// el: a fresh copy of the opening overlay. switchView(): the app's own
// toggle (shows the Climb, hides the List View). Returns a controller.
function transitionToClimb(el, switchView, options = {}) {
  const doc = el.ownerDocument, win = doc.defaultView, root = doc.documentElement;
  const reduced = root.dataset.motion === "reduce" || win.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let switched = false;
  const doSwitch = () => { if (!switched) { switched = true; switchView(); } };

  if (reduced) {
    // Opacity only: the Climb fades in over the page background.
    doSwitch();
    const life = lifecycle(el, options, () => {});
    life.t0 = doc.timeline.currentTime;
    life.add(doc.querySelector(".climb-enhancement"), [{ opacity: 0 }, { opacity: 1 }], { duration: 320, easing: "ease-out" })
      ?.finished.then(() => life.finish(false)).catch(() => {});
    life.arm(1000);
    life.cleanup(() => el.remove());
    return el[CONTROLLER] = { skip: life.skip, dispose: life.dispose, holdFailsafe: life.holdFailsafe, animations: life.created, reduced: true };
  }

  el.classList.add("splash--climb");
  doc.body.prepend(el);
  // Hold the opening's own CSS frames with the sheet settled flat.
  const frozen = freezeOpenMap(el);
  const life = lifecycle(el, options, (_skipped, disposed) => { if (!disposed) doSwitch(); el.remove(); });
  life.cleanup(() => frozen.forEach((animation) => animation.cancel()));
  const { add } = life;
  life.t0 = doc.timeline.currentTime;

  const sheet = el.querySelector(".splash-sheet"), camera = el.querySelector(".splash-camera"), world = el.querySelector(".splash-world");
  const paper = el.querySelector(".splash-greeting--paper"), pageCopy = el.querySelector(".splash-greeting--page");
  const heading = doc.getElementById("trailhead-title"), vw = win.innerWidth, vh = win.innerHeight;
  const headerBottom = doc.querySelector(".site-header")?.getBoundingClientRect().bottom ?? 0;
  const hr = heading?.getBoundingClientRect();
  const showGreeting = hr && hr.width > 0 && hr.top >= headerBottom - 4 && hr.bottom <= vh;   // only if the heading is on screen
  const H = showGreeting ? { x: hr.left + hr.width / 2, y: hr.top + hr.height / 2 } : { x: vw / 2, y: vh / 2 };
  const f = framing(el, H);
  const C = CLIMB.cover;

  // 1. The page becomes paper (dark: dawn moves right to left; light: the paper fades up).
  if (showGreeting) {
    copyType(paper, heading); copyType(pageCopy, heading);
    paper.querySelectorAll(".splash-word").forEach((w) => { w.style.animation = "none"; w.style.maskImage = w.style.webkitMaskImage = "none"; });
    add(heading, [{ opacity: 0 }, { opacity: 0 }], { duration: CLIMB.end, fill: "none" });
    add(pageCopy, [{ visibility: "visible" }, { visibility: "visible" }], { duration: C, fill: "none" });
  } else paper.hidden = true;
  if (root.dataset.theme === "light") {
    add(sheet, [{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: "ease-out", fill: "both" });
  } else {
    const M = vw * 3.2, image = "linear-gradient(100deg, transparent 0 46%, #000 54% 100%)";
    const at = (x) => ({ maskImage: image, webkitMaskImage: image, maskSize: `${M}px 100%`, webkitMaskSize: `${M}px 100%`, maskRepeat: "no-repeat", webkitMaskRepeat: "no-repeat", maskPosition: `${x}px 0`, webkitMaskPosition: `${x}px 0` });
    add(sheet, [at(1.2 * vw - M / 2), at(-0.2 * vw - M / 2)], { duration: C - 20, easing: "cubic-bezier(0.45, 0, 0.4, 1)", fill: "backwards" });
  }
  // The paper's fine grain lifts just before the swap to the (grainless, magnified) centre pane;
  // the map's own grain returns as the camera pulls back.
  add(sheet, [{ opacity: 1 }, { opacity: 0 }], { delay: C - 170, duration: 150, pseudoElement: "::before", fill: "both" });
  add(sheet, [{ visibility: "hidden" }, { visibility: "hidden" }], { delay: C, duration: CLIMB.end, fill: "none" });
  add(world, [{ opacity: 0 }, { opacity: 0 }], { duration: C, fill: "none" });
  const { at, tick } = cueTimeline(life, el, CLIMB.end);
  at(C, doSwitch);

  // 2. Pull back from the page to the unfolded map.
  if (f) {
    camera.style.transformOrigin = `${f.F.x}px ${f.F.y}px`;
    if (showGreeting) {
      // The same words, printed on the centre pane where the camera will find them.
      const pg = el.querySelector(".splash-pane-greeting");
      const cs = getComputedStyle(heading), s = 1 / f.S;
      const lines = []; let lastTop = null;
      paper.querySelectorAll(".splash-word").forEach((w) => { const t = Math.round(w.getBoundingClientRect().top); if (t !== lastTop) { lines.push([]); lastTop = t; } lines[lines.length - 1].push(w.textContent); });
      pg.innerHTML = lines.map((l) => l.join(" ").replace(/&/g, "&amp;").replace(/</g, "&lt;")).join("<br>");
      Object.assign(pg.style, {
        left: `${f.F.x + (hr.left - f.F.x) * s - f.map.left}px`, top: `${f.F.y + (hr.top - f.F.y) * s - f.map.top}px`,
        fontFamily: cs.fontFamily, fontWeight: cs.fontWeight, fontSize: `${parseFloat(cs.fontSize) * s}px`,
        letterSpacing: `${parseFloat(cs.letterSpacing || 0) * s}px`, lineHeight: `${parseFloat(cs.lineHeight) * s}px`,
      });
      pg.dataset.aligned = "";
    }
    add(camera, [{ transform: `scale(${f.S})` }, { transform: `scale(${f.S})` }], { duration: CLIMB.pull[0], fill: "backwards" });
    add(camera, scaleFrames(f.S, 1, pullEase), { delay: CLIMB.pull[0], duration: CLIMB.pull[1], fill: "forwards" });
  }
  el.querySelectorAll(".splash-face").forEach((face) => add(face, [{ opacity: 0 }, { opacity: 1 }], { delay: 560, duration: 520, pseudoElement: "::before", fill: "both" }));
  // At full magnification the pane's row seam and edges would read as lines; a plain sheet
  // over the pane hides them and lifts as the folds come into view.
  add(el.querySelector(".splash-pane-cover"), [{ opacity: 1 }, { opacity: 0 }], { delay: 470, duration: 420, easing: "ease-in-out", fill: "both" });
  el.querySelectorAll(".splash-crease").forEach((c) => add(c, [{ opacity: 0 }, { opacity: 0.32 }], { delay: 640, duration: 560, fill: "both" }));
  // 3. Lower the sheet and retrace the live hillside toward the mountain.
  // The original table motion remains only as the optional-camera fallback.
  const [t0, td] = CLIMB.tilt, lookUp = "cubic-bezier(0.5, 0, 0.3, 1)";
  add(el.querySelector(".splash-map"), [{ transform: "rotateX(0deg)" }, { transform: "rotateX(58deg)" }], { delay: t0, duration: td, easing: "cubic-bezier(0.45, 0, 0.6, 1)", fill: "forwards" });
  add(el.querySelector(".splash-rig"), [{ translate: "0 0" }, { translate: "0 112vh" }], { delay: t0, duration: LIST.tilt - VIEWS.list.mapArrival, easing: lookUp, fill: "forwards" });
  add(el.querySelector(".splash-table"), [{ translate: "0 0" }, { translate: "0 140vh" }], { delay: t0, duration: td, easing: lookUp, fill: "forwards" });
  el.querySelectorAll(".splash-shadow").forEach((shadow) => add(shadow,
    [{ opacity: getComputedStyle(shadow).opacity }, { opacity: 0 }],
    { delay: t0, duration: (LIST.tilt - VIEWS.list.mapArrival) * 0.6, fill: "both", easing: "ease-in" }));
  const stage = doc.querySelector(".climb-stage");
  at(C, () => {
    const hill = hillsideCamera(life, stage, "up", t0, td);
    if (hill) el.dataset.terrain = "live";
    else {
      add(stage, [{ translate: "0 -62vh" }, { translate: "0 0" }], { delay: t0, duration: td, fill: "both" });
      [...doc.querySelectorAll(".climb-marker:not([hidden])")].forEach((marker, index) =>
        add(marker, [{ opacity: 0, scale: "0.4" }, { opacity: 1, scale: "1" }], { delay: 2180 + index * 90, duration: 420 }));
    }
  });

  // 4. Waypoints, rail, Trailhead card and portrait arrive; the scene becomes interactive.
  add(doc.querySelector(".climb-rail"), [{ opacity: 0 }, { opacity: 1 }], { delay: 2300, duration: 420 });
  add(doc.querySelector('.climb-card[data-card="0"]'), [{ opacity: 0, translate: "0 14px" }, { opacity: 1, translate: "0 0" }], { delay: 2400, duration: 480, easing: "cubic-bezier(0.2, 0.7, 0.3, 1)" });
  add(doc.querySelector(".climb-portrait"), [{ opacity: 0, translate: "0 14px" }, { opacity: 1, translate: "0 0" }], { delay: 2480, duration: 480, easing: "cubic-bezier(0.2, 0.7, 0.3, 1)" });
  add(world, [{ opacity: 1 }, { opacity: 1 }], { delay: C, duration: t0 + td - C, fill: "none" });
  add(world, [{ visibility: "hidden" }, { visibility: "hidden" }], { delay: t0 + td, duration: CLIMB.end, fill: "none" });

  at(CLIMB.end - 1, () => life.finish(false));
  life.arm(CLIMB.end + 1500);
  return el[CONTROLLER] = { skip: life.skip, dispose: life.dispose, holdFailsafe: life.holdFailsafe, animations: life.created, reduced: false, framing: f, tick };
}

// ------------------------------------------------- Climb View → List View
function transitionToList(el, switchView, options = {}) {
  const doc = el.ownerDocument, win = doc.defaultView;
  const reduced = doc.documentElement.dataset.motion === "reduce" || win.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let switched = false;
  const doSwitch = () => { if (!switched) { switched = true; switchView(); } };
  if (reduced) {
    doSwitch();
    el.remove();
    return { skip() {}, dispose() {}, holdFailsafe() {}, animations: [], reduced: true, destination: "list", active: false };
  }

  el.classList.add("splash--list");
  doc.body.prepend(el);
  const frozen = freezeOpenMap(el, true);
  el.querySelector(".splash-sheet").style.opacity = "0";
  const life = lifecycle(el, options, (_skipped, disposed) => { if (!disposed) doSwitch(); el.remove(); });
  life.cleanup(() => frozen.forEach((a) => a.cancel()));
  life.t0 = doc.timeline.currentTime;
  const { add } = life;
  const { at, tick } = cueTimeline(life, el, LIST.end);
  const stage = doc.querySelector(".climb-stage");
  const sky = stage?.querySelector(".climb-sky");
  const lookDown = "cubic-bezier(0.45, 0, 0.2, 1)";
  const hold = { duration: LIST.tilt, easing: lookDown, fill: "both" };

  // Preserve the sky behind the moving scene until the floor covers it. The
  // map rises during the same tilt, already open, rather than appearing later.
  const skyBottom = (sky && getComputedStyle(sky).getPropertyValue("--sky-bottom").trim()) || "#f6efdc";
  add(doc.querySelector(".climb-enhancement"), [{ backgroundColor: skyBottom }, { backgroundColor: skyBottom }], { duration: LIST.end, fill: "both" });
  const hill = hillsideCamera(life, stage, "down", 0, LIST.tilt);
  if (hill) el.dataset.terrain = "live";
  else add(stage, [{ translate: "0 0" }, { translate: "0 -62vh" }], hold);
  add(el.querySelector(".splash-table"), [{ translate: "0 140vh" }, { translate: "0 0" }], hold);
  const mapArrival = { delay: VIEWS.list.mapArrival, duration: LIST.tilt - VIEWS.list.mapArrival, easing: lookDown, fill: "both" };
  add(el.querySelector(".splash-rig"), [{ translate: "0 112vh" }, { translate: "0 0" }], mapArrival);
  add(el.querySelector(".splash-map"), [{ transform: "rotateX(58deg)" }, { transform: "rotateX(0deg)" }], mapArrival);
  at(LIST.hero[0], () => hill?.releaseBackdrop());
  // A flat contact shadow would arrive ahead of the still-tilted paper as a
  // dark rectangle. Let it gather only as the map approaches the ground.
  el.querySelectorAll(".splash-shadow").forEach((shadow) => add(shadow,
    [{ opacity: 0 }, { opacity: getComputedStyle(shadow).opacity }],
    { delay: VIEWS.list.mapArrival + (LIST.tilt - VIEWS.list.mapArrival) * 0.4,
      duration: (LIST.tilt - VIEWS.list.mapArrival) * 0.6, easing: "ease-out", fill: "both" }));

  // Keep the live hillside painted while the covered view commits. The paper
  // takeover releases it before the hero becomes visible.
  at(LIST.tilt, () => {
    doSwitch();
    const heading = doc.getElementById("trailhead-title");
    const section = heading?.closest(".trailhead");
    if (!section || !heading.getClientRects().length) { life.skip(); return; }
    const f = framing(el, { x: win.innerWidth / 2, y: win.innerHeight / 2 });
    const camera = el.querySelector(".splash-camera");
    if (f) {
      camera.style.transformOrigin = `${f.F.x}px ${f.F.y}px`;
      add(camera, scaleFrames(1, f.S, pushEase), { delay: LIST.zoom[0], duration: LIST.zoom[1], fill: "both" });
    } else {
      add(camera, [{ transform: "scale(1)" }, { transform: `scale(${getComputedStyle(el).getPropertyValue("--zoom-fallback")})` }],
        { delay: LIST.zoom[0], duration: LIST.zoom[1], easing: "cubic-bezier(0.6, 0, 0.16, 1)", fill: "both" });
    }
    paperHandoff(life, el, LIST.zoom[0]);
    revealHero(life, section, LIST.hero[0], false);
  });
  // Grain and creases stay visible through the overhead hold, then lift as
  // their magnified edges give way to the screen-space paper.
  el.querySelectorAll(".splash-face").forEach((face) => add(face, [{ opacity: 1 }, { opacity: 0 }], { delay: LIST.zoom[0], duration: 600, pseudoElement: "::before", fill: "both" }));
  el.querySelectorAll(".splash-crease").forEach((crease) => add(crease, [{ opacity: 0.22 }, { opacity: 0 }], { delay: LIST.zoom[0], duration: 600, fill: "both" }));
  add(el.querySelector(".splash-world"), [{ visibility: "visible" }, { visibility: "visible" }], { duration: LIST.hero[0], fill: "backwards" });
  add(el.querySelector(".splash-world"), [{ visibility: "hidden" }, { visibility: "hidden" }], { delay: LIST.hero[0], duration: LIST.end, fill: "none" });
  at(LIST.end - 1, () => life.finish(false));
  life.arm(LIST.end + 1500);
  return el[CONTROLLER] = {
    skip: life.skip, dispose: life.dispose, holdFailsafe: life.holdFailsafe, animations: life.created,
    reduced: false, destination: "list", get active() { return life.active; }, tick,
  };
}

// Animation enhancement is optional, including when a browser API throws.
export function startSplash(element) {
  try { return start(element); }
  catch {
    element[CONTROLLER]?.dispose();
    element.classList.add("splash--skipped");
    return null;
  }
}
export function toClimb(element, switchView) {
  try { return transitionToClimb(element, switchView); }
  catch {
    element[CONTROLLER]?.dispose();
    element.remove();
    switchView();
    return { skip() {}, dispose() {}, holdFailsafe() {}, animations: [], reduced: true };
  }
}
export function toList(element, switchView) {
  try { return transitionToList(element, switchView); }
  catch {
    element[CONTROLLER]?.dispose();
    element.remove();
    switchView();
    return { skip() {}, dispose() {}, holdFailsafe() {}, animations: [], reduced: true, destination: "list", active: false };
  }
}
export { OPEN, CLIMB, LIST };
