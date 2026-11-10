/* Map opening + Climb View transition — the JavaScript half.
 *
 * CSS alone plays the map handling and removes the opening overlay. This
 * controller adds what needs measurement or input:
 *   opening   frames the camera push on the real heading, lays the decorative
 *             greeting exactly over the List View <h1>, hands the paper off to
 *             the dark (or light) page, swaps the decorative heading for the
 *             real <h1> in a single frame, and forms the page around it;
 *   climb     on "Climb view": the page becomes paper, the camera pulls back
 *             to the unfolded map, the view tilts up off the map
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



const OPEN = { zoom: [1550, 800], handoff: [3420, 480], fade: [3420, 340], swap: 3960, end: 4400 };
const OPEN_REDUCED = { swap: 1190, end: 1400 };
const CLIMB = { cover: 380, pull: [380, 870], tilt: [1150, 1000], end: 2600 };
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

// ---------------------------------------------------------------- opening
function start(el, options = {}) {
  const doc = el.ownerDocument, win = doc.defaultView, root = doc.documentElement;
  if (root.dataset.splash !== "active") return null;
  el.classList.remove("splash--skipped", "splash--finished");
  const reduced = root.dataset.motion === "reduce" || win.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const T = reduced ? OPEN_REDUCED : OPEN;
  const clock = el.getAnimations().find((a) => a.animationName === "splash-exit" || a.animationName === "splash-rm-exit");
  const began = win.performance.now();
  const elapsed = () => (clock && clock.currentTime != null ? Number(clock.currentTime) : win.performance.now() - began);
  const cancelCss = (target, name) => target && target.getAnimations().forEach((a) => { if (a.animationName === name) a.cancel(); });

  const paper = el.querySelector(".splash-greeting--paper"), page = el.querySelector(".splash-greeting--page");
  const sheet = el.querySelector(".splash-sheet"), camera = el.querySelector(".splash-camera");
  let heading, section, usable = false;
  let layoutFrame = 0;

  const life = lifecycle(el, options, (skipped) => {
    el.classList.add(skipped ? "splash--skipped" : "splash--finished");
    if (options.remember !== false) { try { win.sessionStorage.setItem("splash-seen", "1"); } catch {} }
  });
  const { add } = life;
  life.cleanup(() => win.cancelAnimationFrame(layoutFrame));
  let zoomAnim = null;

  function layout() {
    copyType(paper, heading);
    copyType(page, heading);
    if (reduced || elapsed() > OPEN.zoom[0] - 50) return;
    const g = paper.getBoundingClientRect();
    const f = framing(el, { x: g.left + g.width / 2, y: g.top + g.height / 2 });
    if (!f) return;
    cancelCss(camera, "splash-zoom-fallback");
    camera.style.transformOrigin = `${f.F.x}px ${f.F.y}px`;
    zoomAnim?.cancel();
    zoomAnim = add(camera, scaleFrames(1, f.S, pushEase), { delay: OPEN.zoom[0], duration: OPEN.zoom[1], fill: "both" });
    el.dataset.zoom = JSON.stringify({ S: +f.S.toFixed(3), P: f.P, H: f.H, F: f.F });
  }

  function enhance() {
    if (!life.active) return;
    heading = doc.getElementById("trailhead-title");
    section = heading?.closest(".trailhead");
    usable = Boolean(section && heading.getClientRects().length && elapsed() < (reduced ? T.swap : 2250));
    if (!usable) {
      // Streamed content and hydration can arrive after the overlay's first paint.
      if (elapsed() < 1400 && win.performance.now() - began < 1400) layoutFrame = win.requestAnimationFrame(enhance);
      return;
    }
    layout();
    cancelCss(sheet, "splash-sheet-fallback");
    // Webfonts may settle after first paint; nothing depends on the geometry until the push begins.
    doc.fonts?.ready.then(() => { if (life.active && elapsed() < OPEN.zoom[0] - 50) layout(); else if (life.active && elapsed() < 2250) { copyType(paper, heading); copyType(page, heading); } });

    // One heading at a time: the real <h1> is hidden until the frame the page copy disappears.
    add(heading, [{ opacity: 0 }, { opacity: 0 }], { duration: T.swap, fill: "none" });
    add(page, [{ visibility: "visible" }, { visibility: "visible" }], { delay: reduced ? 0 : 3000, duration: T.swap - (reduced ? 0 : 3000), fill: "none" });

    const theme = root.dataset.theme === "light" ? "light" : "dark";
    if (!reduced) {
      if (theme === "light") {
        add(sheet, [{ opacity: 1 }, { opacity: 0 }], { delay: OPEN.fade[0], duration: OPEN.fade[1], easing: "ease-in-out", fill: "forwards" });
      } else {
        // Dusk passes over the paper, left to right; only a narrow band is ever between states.
        const vw = win.innerWidth, M = vw * 3.2, image = "linear-gradient(100deg, transparent 0 46%, #000 54% 100%)";
        const at = (x) => ({ maskImage: image, webkitMaskImage: image, maskSize: `${M}px 100%`, webkitMaskSize: `${M}px 100%`,
          maskRepeat: "no-repeat", webkitMaskRepeat: "no-repeat", maskPosition: `${x}px 0`, webkitMaskPosition: `${x}px 0` });
        add(sheet, [at(-0.2 * vw - M / 2), at(1.2 * vw - M / 2)], { delay: OPEN.handoff[0], duration: OPEN.handoff[1], easing: "cubic-bezier(0.45, 0, 0.4, 1)", fill: "forwards" });
      }
      const rise = (target, delay, duration, distance = 6) => add(target, [{ opacity: 0, translate: `0 ${distance}px` }, { opacity: 1, translate: "0 0" }],
        { delay, duration, easing: "cubic-bezier(0.2, 0.7, 0.3, 1)" });
      add(doc.querySelector(".site-header"), [{ opacity: 0, translate: "0 -8px" }, { opacity: 1, translate: "0 0" }], { delay: 3500, duration: 500, easing: "cubic-bezier(0.2, 0.7, 0.3, 1)" });
      rise(section.querySelector(".trailhead-portrait"), 3560, 620, 16);
      rise(section.querySelector(".eyebrow"), 3700, 420);
      rise(section.querySelector(".trailhead-lead"), 3760, 440);
      rise(section.querySelector(".trailhead-intro"), 3820, 440);
      rise(section.querySelector(".trailhead-actions"), 3880, 440);
      rise(section.querySelector(".scroll-cue"), 3960, 420);
    } else {
      [doc.querySelector(".site-header"), section.querySelector(".eyebrow"), section.querySelector(".trailhead-lead"),
        section.querySelector(".trailhead-intro"), section.querySelector(".trailhead-actions"),
        section.querySelector(".trailhead-portrait"), section.querySelector(".scroll-cue")]
        .forEach((target, i) => add(target, [{ opacity: 0 }, { opacity: 1 }], { delay: 520 + i * 60, duration: 480, easing: "ease-out" }));
    }
  }

  // Align script animations with the overlay's own CSS clock.
  const sync = () => { if (!life.active || !clock || clock.startTime == null) return; life.t0 = clock.startTime; life.created.forEach((a) => { a.startTime = life.t0; }); };
  if (clock) { if (clock.startTime != null) sync(); else clock.ready.then(sync).catch(() => {}); }
  enhance();
  const onEnd = (event) => { if (event.target === el) life.finish(false); };
  el.addEventListener("animationend", onEnd);
  life.cleanup(() => el.removeEventListener("animationend", onEnd));
  life.arm(reduced ? 2400 : 5000);
  return el[CONTROLLER] = { skip: life.skip, dispose: life.dispose, holdFailsafe: life.holdFailsafe, animations: life.created, get aligned() { return usable; }, reduced };
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
  const frozen = el.getAnimations({ subtree: true });
  for (const a of frozen) {
    if (!(a instanceof CSSAnimation)) continue;
    const n = a.animationName;
    if (/^splash-(exit|sheet|zoom-fallback)/.test(n)) { a.cancel(); continue; }
    a.pause();
    a.currentTime = /^splash-(face-grain|crease|sheen)/.test(n) ? 2200 : /^splash-world-off/.test(n) ? 0 : 1850;
  }
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
  // Cues run off the same animation clock as everything else, so pausing or seeking holds them too.
  const clock = add(el, [{ opacity: 1 }, { opacity: 1 }], { duration: CLIMB.end, fill: "none" });
  const cues = [];
  const at = (ms, fn) => cues.push({ ms, fn, done: false });
  let cueFrame = 0;
  life.cleanup(() => win.cancelAnimationFrame(cueFrame));
  const tick = () => {
    if (!life.active) return;
    const t = clock.currentTime ?? 0;
    for (const cue of cues) if (!cue.done && t >= cue.ms) { cue.done = true; cue.fn(); }
    if (life.active) cueFrame = win.requestAnimationFrame(tick);
  };
  cueFrame = win.requestAnimationFrame(tick);
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
  // 3. Look up from the map to the mountain: the sheet tips away and drops out of view,
  //    the table edge slides down, and the Climb (already behind) descends into place.
  const [t0, td] = CLIMB.tilt, lookUp = "cubic-bezier(0.5, 0, 0.3, 1)";
  add(el.querySelector(".splash-map"), [{ transform: "rotateX(0deg)" }, { transform: "rotateX(58deg)" }], { delay: t0, duration: td, easing: "cubic-bezier(0.45, 0, 0.6, 1)", fill: "forwards" });
  add(el.querySelector(".splash-rig"), [{ translate: "0 0" }, { translate: "0 112vh" }], { delay: t0 + 80, duration: td - 80, easing: lookUp, fill: "forwards" });
  add(el.querySelector(".splash-table"), [{ translate: "0 0" }, { translate: "0 140vh" }], { delay: t0, duration: td, easing: lookUp, fill: "forwards" });
  const stage = doc.querySelector(".climb-stage");
  add(stage, [{ translate: "0 -62vh" }, { translate: "0 0" }], { delay: t0, duration: td + 120, easing: "cubic-bezier(0.35, 0, 0.2, 1)" });

  // 4. Waypoints, rail, Trailhead card and portrait arrive; the scene becomes interactive.
  const markers = [...doc.querySelectorAll(".climb-marker:not([hidden])")].sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top);
  markers.forEach((m, i) => add(m, [{ opacity: 0, scale: "0.4" }, { opacity: 1, scale: "1" }], { delay: 1780 + i * 90, duration: 420, easing: "cubic-bezier(0.3, 1.45, 0.5, 1)" }));
  add(doc.querySelector(".climb-rail"), [{ opacity: 0 }, { opacity: 1 }], { delay: 1900, duration: 420 });
  add(doc.querySelector('.climb-card[data-card="0"]'), [{ opacity: 0, translate: "0 14px" }, { opacity: 1, translate: "0 0" }], { delay: 2000, duration: 480, easing: "cubic-bezier(0.2, 0.7, 0.3, 1)" });
  add(doc.querySelector(".climb-portrait"), [{ opacity: 0, translate: "0 14px" }, { opacity: 1, translate: "0 0" }], { delay: 2080, duration: 480, easing: "cubic-bezier(0.2, 0.7, 0.3, 1)" });
  add(world, [{ opacity: 1 }, { opacity: 1 }], { delay: C, duration: t0 + td - C, fill: "none" });
  add(world, [{ visibility: "hidden" }, { visibility: "hidden" }], { delay: t0 + td, duration: CLIMB.end, fill: "none" });

  // The climb stage's own markers are placed after switchView(); measure them then.
  at(C + 20, () => {
    [...doc.querySelectorAll(".climb-marker:not([hidden])")].sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top)
      .forEach((m, i) => { if (!markers.includes(m)) add(m, [{ opacity: 0, scale: "0.4" }, { opacity: 1, scale: "1" }], { delay: 1780 + i * 90, duration: 420, easing: "cubic-bezier(0.3, 1.45, 0.5, 1)" }); });
  });
  at(CLIMB.end - 1, () => life.finish(false));
  life.arm(CLIMB.end + 1500);
  return el[CONTROLLER] = { skip: life.skip, dispose: life.dispose, holdFailsafe: life.holdFailsafe, animations: life.created, reduced: false, framing: f, tick };
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
export { OPEN, CLIMB };
