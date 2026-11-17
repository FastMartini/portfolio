// the hero's contour lines as guitar strings ("Branding iron" direction).
//   - Each contour in hero-contours.svg is its own string, redrawn as vectors on
//     a canvas. Crossing one plucks only that line: a fluid, damped wave runs
//     along it from the crossing point, and the line darkens while it rings.
//   - Each string has its own note — shorter contours sound higher — from an
//     E blues scale through a small overdriven amp with a room tail. Bends and
//     a fifth on hard strums give it a late-60s blues-rock bite.
//   - A quick swipe vibrates several lines in order, silently. Only a click or
//     tap on a line plays its note.
// Native cursor. Reduced motion: nothing mounts. Audio starts only on a
// click or tap on a contour, or when the sound toggle is explicitly enabled.
import { heroSound } from "./sound";

export const STRUM = {
  opacity: 0.22,        // base line strength (the CSS layer is 0.16): a little darker
  ringDarken: 2.6,      // extra strength on a ringing string, at full energy
  amp: [5, 14],         // px, slow → fast crossing
  hz: 6,                // visible vibration rate: slow enough to read as a wave
  wavelength: 190,      // px along the string
  spread: [36, 520],    // wave packet: start width (px) and growth (px/s)
  decay: 1.5,           // per second
  life: 2.6,            // s
  strumGap: 16,         // ms between notes of one swipe
  repluck: 90,          // ms before the same string can be plucked again
  volume: 0.5,
};
// E blues: E G A B♭ B D, E3 → D5. B♭ is the blue note.
const SCALE = [164.81, 196, 220, 233.08, 246.94, 293.66, 329.63, 392, 440, 466.16, 493.88, 587.33];
const BLUE = new Set([3, 9]);

type Pluck = { s: number; t0: number; amp: number; dir: number };
type Str = {
  pts: Float32Array; normals: Float32Array; lengths: Float32Array; width: number; closed: boolean;
  screen: Float32Array; note: number; plucks: Pluck[]; last: number;
};

// ------------------------------------------------------------------ geometry
function parsePath(d: string) {
  const out: number[] = [];
  const tokens = d.match(/[MLQ]|-?\d*\.?\d+(?:e-?\d+)?/gi) ?? [];
  let i = 0, cmd = "", x = 0, y = 0;
  const num = () => parseFloat(tokens[i++]);
  while (i < tokens.length) {
    if (/[MLQ]/i.test(tokens[i])) cmd = tokens[i++].toUpperCase();
    if (cmd === "M" || cmd === "L") { x = num(); y = num(); out.push(x, y); }
    else if (cmd === "Q") {
      const cx = num(), cy = num(), ex = num(), ey = num();
      for (let k = 1; k <= 6; k++) {
        const t = k / 6, u = 1 - t;
        out.push(u * u * x + 2 * u * t * cx + t * t * ex, u * u * y + 2 * u * t * cy + t * t * ey);
      }
      x = ex; y = ey;
    } else i++;
  }
  return out;
}
// Even spacing along the line, so a wave travels smoothly.
function resample(raw: number[], step: number) {
  const out: number[] = [raw[0], raw[1]];
  let carry = 0;
  for (let i = 2; i < raw.length; i += 2) {
    const ax = raw[i - 2], ay = raw[i - 1], bx = raw[i], by = raw[i + 1];
    const seg = Math.hypot(bx - ax, by - ay);
    let at = step - carry;
    while (at <= seg) { out.push(ax + ((bx - ax) * at) / seg, ay + ((by - ay) * at) / seg); at += step; }
    carry = seg - (at - step);
  }
  out.push(raw[raw.length - 2], raw[raw.length - 1]);
  return new Float32Array(out);
}
async function loadStrings(src: string): Promise<{ strings: Str[]; vw: number; vh: number } | null> {
    const text = await fetch(src).then(r => { if (!r.ok) throw new Error("Contour artwork unavailable"); return r.text(); });
  const svg = new DOMParser().parseFromString(text, "image/svg+xml").documentElement;
  const box = (svg.getAttribute("viewBox") ?? "0 0 1000 700").split(/[\s,]+/).map(Number);
  const strings: Str[] = [...svg.querySelectorAll("path")].map(path => {
    const pts = resample(parsePath(path.getAttribute("d") ?? ""), 3);
    const n = pts.length / 2, normals = new Float32Array(pts.length), lengths = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1);
      const tx = pts[b * 2] - pts[a * 2], ty = pts[b * 2 + 1] - pts[a * 2 + 1], m = Math.hypot(tx, ty) || 1;
      normals[i * 2] = -ty / m; normals[i * 2 + 1] = tx / m;
      if (i) lengths[i] = lengths[i - 1] + Math.hypot(pts[i * 2] - pts[i * 2 - 2], pts[i * 2 + 1] - pts[i * 2 - 1]);
    }
    const closed = Math.hypot(pts[0] - pts[pts.length - 2], pts[1] - pts[pts.length - 1]) < 2;
    return { pts, normals, lengths, closed, width: parseFloat(path.getAttribute("stroke-width") ?? "1"), screen: new Float32Array(pts.length), note: 0, plucks: [], last: 0 };
  }).filter(s => s.pts.length >= 4);
  if (!strings.length) return null;
  // Shorter strings sound higher, like a real instrument.
  [...strings].sort((a, b) => b.lengths[b.lengths.length - 1] - a.lengths[a.lengths.length - 1])
    .forEach((s, rank, all) => { s.note = Math.min(SCALE.length - 1, Math.floor((rank / all.length) * SCALE.length)); });
  return { strings, vw: box[2] || 1000, vh: box[3] || 700 };
}

// ------------------------------------------------------------------ the amp
function amp(win: Window) {
  let ctx: AudioContext | null = null, input: AudioNode | null = null, live = 0;
  let output: GainNode | null = null;
  let unlocking: Promise<void> | null = null;
  const cache = new Map<number, AudioBuffer>();
  const audioWindow = win as Window & { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
  const Ctor = audioWindow.AudioContext ?? audioWindow.webkitAudioContext;
  function build(c: AudioContext) {
    // Guitar → soft-clipping overdrive → mid-forward cabinet → small room.
    const pre = c.createBiquadFilter(); pre.type = "highpass"; pre.frequency.value = 110;
    const drive = c.createWaveShaper(), curve = new Float32Array(2048), k = 9;
    for (let i = 0; i < curve.length; i++) { const x = (i / (curve.length - 1)) * 2 - 1; curve[i] = Math.tanh(k * x) / Math.tanh(k); }
    drive.curve = curve; drive.oversample = "4x";
    const mid = c.createBiquadFilter(); mid.type = "peaking"; mid.frequency.value = 820; mid.Q.value = 0.9; mid.gain.value = 5;
    const cab = c.createBiquadFilter(); cab.type = "lowpass"; cab.frequency.value = 3300; cab.Q.value = 0.8;
    const room = c.createConvolver(), seconds = 1.6, ir = c.createBuffer(2, Math.floor(c.sampleRate * seconds), c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = ir.getChannelData(ch);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 3);
    }
    room.buffer = ir;
    const dry = c.createGain(), wet = c.createGain(), level = c.createDynamicsCompressor(), out = c.createGain();
    dry.gain.value = 0.85; wet.gain.value = 0.24; level.threshold.value = -20; level.ratio.value = 4; out.gain.value = heroSound.get() ? 0.32 : 0;
    output = out;
    pre.connect(drive); drive.connect(mid); mid.connect(cab);
    cab.connect(dry); cab.connect(room); room.connect(wet);
    dry.connect(level); wet.connect(level); level.connect(out); out.connect(c.destination);
    return pre;
  }
  function string(c: AudioContext, f: number) {
    let b = cache.get(f);
    if (b) return b;
    // Karplus–Strong with a bright pick and long sustain.
    const sr = c.sampleRate, length = Math.floor(sr * 2.6), N = Math.max(2, Math.round(sr / f));
    const ring = new Float32Array(N), data = new Float32Array(length);
    for (let i = 0; i < N; i++) ring[i] = Math.random() * 2 - 1;
    for (let i = 1; i < N; i++) ring[i] = 0.6 * ring[i] + 0.4 * ring[i - 1];
    let peak = 0;
    for (let i = 0, j = 0; i < length; i++) {
      const next = (j + 1) % N, value = ring[j];
      data[i] = value; peak = Math.max(peak, Math.abs(value));
      ring[j] = 0.9985 * (0.5 * value + 0.5 * ring[next]); j = next;
    }
    const fade = Math.floor(sr * 0.12);
    for (let i = 0; i < length; i++) data[i] = (data[i] / (peak || 1)) * Math.min(1, (length - i) / fade);
    b = c.createBuffer(1, length, sr); b.copyToChannel(data, 0);
    cache.set(f, b);
    return b;
  }
  function note(c: AudioContext, f: number, gain: number, pan: number, when: number, bend: number) {
    if (!input || live >= 10) return;
    const src = c.createBufferSource(), level = c.createGain(), side = c.createStereoPanner();
    src.buffer = string(c, f);
    // Blues bend: start flat, push up to pitch, then a little vibrato as it rings.
    const rate = src.playbackRate;
    rate.setValueAtTime(Math.pow(2, -bend / 1200), when);
    rate.linearRampToValueAtTime(1, when + (bend ? 0.13 : 0.001));
    const lfo = c.createOscillator(), depth = c.createGain();
    lfo.frequency.value = 5.4; depth.gain.setValueAtTime(0, when); depth.gain.linearRampToValueAtTime(0.006, when + 0.6);
    lfo.connect(depth); depth.connect(rate);
    level.gain.value = gain; side.pan.value = pan;
    src.connect(level); level.connect(side); side.connect(input);
    live++;
    src.onended = () => { live--; lfo.stop(); src.disconnect(); side.disconnect(); depth.disconnect(); };
    src.start(when); lfo.start(when); src.stop(when + 2.6);
  }
  function play(index: number, strength: number, pan: number, delay: number) {
    // Never create the context from hover: it may only start after a gesture.
    const c = ctx;
    if (!c) return;
    if (c.state !== "running") {
      // Safari resumes asynchronously on the first tap. Keep that pluck so
      // the gesture that unlocks the amp also plays the touched string.
      void unlocking?.then(() => {
        if (ctx === c && c.state === "running" && heroSound.get()) play(index, strength, pan, delay);
      });
      return;
    }
    const when = c.currentTime + delay / 1000, f = SCALE[index];
    const bend = BLUE.has(index) ? 160 : Math.random() < 0.28 ? 100 : 0;
    note(c, f, STRUM.volume * (0.5 + 0.5 * strength), pan, when, bend);
    // Dig in hard and a fifth rings with it: a little power chord.
    if (strength > 0.65) note(c, f * 1.5, STRUM.volume * 0.4 * strength, pan, when + 0.008, 0);
  }
  return {
    wake() {
      if (!heroSound.get()) return;
      try {
        if (!ctx && Ctor) { ctx = new Ctor(); input = build(ctx); }
        if (ctx?.state === "suspended") unlocking = ctx.resume().catch(() => {});
      } catch {
        void ctx?.close().catch(() => {});
        ctx = null; input = null; output = null; unlocking = null;
      }
    },
    setEnabled(enabled: boolean) {
      if (ctx && output) output.gain.setTargetAtTime(enabled ? 0.32 : 0, ctx.currentTime, 0.01);
    },
    play,
    close() { void ctx?.close().catch(() => {}); ctx = null; input = null; output = null; unlocking = null; },
  };
}

// ------------------------------------------------------------------ mount
export type HeroInteraction = { dispose: () => void };

export function mountHeroInteraction(doc: Document = document): HeroInteraction {
  const win = doc.defaultView!;
  const reduce = win.matchMedia("(prefers-reduced-motion: reduce)");
  const sound = amp(win);
  const unsubscribeSound = heroSound.subscribe(enabled => {
    if (enabled) sound.wake();
    sound.setEnabled(enabled);
  });
  let section: HTMLElement | null = null, contours: HTMLElement | null = null;
  let canvas: HTMLCanvasElement | null = null, ctx: CanvasRenderingContext2D | null = null;
  let strings: Str[] = [], view = { vw: 1000, vh: 700 }, grid = new Map<number, number[]>();
  let resize: ResizeObserver | null = null, frame = 0, active = true, building = 0;
  let size = { w: 0, h: 0, dpr: 1, scale: 1, ox: 0, oy: 0 };
  const pointer = { x: 0, y: 0, has: false, t: 0 };
  const CELL = 48;

  const busy = () => doc.documentElement.dataset.splash === "active" || !!doc.querySelector("body > .splash--list, body > .splash--climb");

  function cssUrl(value: string) { const m = /url\((['"]?)(.*?)\1\)/.exec(value); return m ? m[2] : null; }
  async function build(next: HTMLElement) {
    release();
    section = next;
    contours = next.querySelector<HTMLElement>(".trailhead-contours");
    if (!contours) return;
    // The theme provider pins palette tokens on this UI root while blending.
    // Repaint quiet strings too, including the final removal of inline tokens.
    const themeRoot = next.closest<HTMLElement>("[data-theme-root]");
    if (themeRoot) observer?.observe(themeRoot, { attributes: true, attributeFilter: ["style"] });
    const style = getComputedStyle(contours), src = cssUrl(style.maskImage || style.getPropertyValue("-webkit-mask-image"));
    if (!src) return;
    const token = ++building, loaded = await loadStrings(src).catch(() => null);
    if (!loaded || token !== building || section !== next || !active) return;
    strings = loaded.strings; view = loaded;
    canvas = doc.createElement("canvas"); canvas.className = "hero-strings"; canvas.setAttribute("aria-hidden", "true");
    ctx = canvas.getContext("2d");
    if (!ctx) { release(); return; }
    contours.after(canvas); contours.style.visibility = "hidden";
    resize = new ResizeObserver(fit); resize.observe(next);
    fit();
  }
  function fit() {
    if (!section || !canvas) return;
    const w = section.clientWidth, h = section.clientHeight, dpr = Math.min(win.devicePixelRatio || 1, 2);
    const scale = Math.max(w / view.vw, h / view.vh);
    size = { w, h, dpr, scale, ox: (w - view.vw * scale) / 2, oy: (h - view.vh * scale) / 2 };
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    // Screen positions and a coarse grid of segments for crossing tests.
    grid = new Map();
    strings.forEach((s, si) => {
      for (let i = 0; i < s.pts.length; i += 2) { s.screen[i] = size.ox + s.pts[i] * scale; s.screen[i + 1] = size.oy + s.pts[i + 1] * scale; }
      for (let i = 0; i < s.pts.length / 2 - 1; i++) {
        const key = Math.floor(s.screen[i * 2] / CELL) * 4096 + Math.floor(s.screen[i * 2 + 1] / CELL);
        const bucket = grid.get(key); if (bucket) bucket.push(si, i); else grid.set(key, [si, i]);
      }
    });
    draw(performance.now());
  }
  function release() {
    building++;
    const previousResize = resize; resize = null;
    canvas?.remove(); canvas = null; ctx = null;
    if (contours) contours.style.visibility = "";
    section = contours = null; strings = []; grid = new Map();
    try { previousResize?.disconnect(); } catch { /* The canvas is already released. */ }
  }

  // ---------------------------------------------------------------- drawing
  function draw(now: number) {
    if (!ctx || !canvas || !section) return false;
    const cs = getComputedStyle(contours!);
    const color = cs.backgroundColor.match(/[\d.]+/g)?.slice(0, 3).join(",") ?? "23,63,53";
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    // The artwork's own horizontal fade: quiet on the left, full on the right.
    const x0 = size.ox, x1 = size.ox + view.vw * size.scale;
    const stroke = (alpha: number) => {
      const g = ctx!.createLinearGradient(x0, 0, x1, 0);
      g.addColorStop(0, `rgba(${color},${0.12 * alpha})`); g.addColorStop(0.6, `rgba(${color},${0.2 * alpha})`); g.addColorStop(1, `rgba(${color},${alpha})`);
      return g;
    };
    const base = stroke(Math.min(1, STRUM.opacity));
    let ringing = false;
    const { hz, wavelength, spread, decay, life } = STRUM;
    for (const s of strings) {
      s.plucks = s.plucks.filter(p => (now - p.t0) / 1000 < life);
      const live = s.plucks.filter(p => p.t0 <= now);
      ctx.lineWidth = s.width * size.scale;
      ctx.beginPath();
      let energy = 0;
      const n = s.pts.length / 2, total = s.lengths[n - 1] * size.scale;
      for (let i = 0; i < n; i++) {
        let x = s.screen[i * 2], y = s.screen[i * 2 + 1];
        if (live.length) {
          const along = s.lengths[i] * size.scale;
          let d = 0;
          for (const p of live) {
            // On a closed contour the wave travels both ways round the loop and meets itself.
            const t = (now - p.t0) / 1000, gap = Math.abs(along - p.s), dist = s.closed ? Math.min(gap, total - gap) : gap;
            const width = spread[0] + spread[1] * t;
            const envelope = p.amp * Math.exp(-decay * t) * (1 - Math.exp(-t / 0.035)) * Math.sqrt(spread[0] / width);
            d += p.dir * envelope * Math.exp(-(dist * dist) / (2 * width * width)) * Math.cos(2 * Math.PI * (hz * t - dist / wavelength));
          }
          x += s.normals[i * 2] * d; y += s.normals[i * 2 + 1] * d;
        }
        if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      for (const p of live) energy = Math.max(energy, Math.exp(-decay * ((now - p.t0) / 1000)));
      ctx.strokeStyle = energy > 0.01 ? stroke(Math.min(1, STRUM.opacity * (1 + STRUM.ringDarken * energy))) : base;
      ctx.stroke();
      if (s.plucks.length) ringing = true;
    }
    return ringing;
  }

  // ---------------------------------------------------------------- plucking
  function pluck(si: number, i: number, frac: number, speed: number, dx: number, dy: number, order: number, playSound = false) {
    const s = strings[si], now = performance.now();
    const t = Math.min(1, speed / 2.2);
    // A click still sounds if a recent hover pluck is throttling the visual.
    if (playSound && heroSound.get()) sound.play(s.note, t, (s.screen[i * 2] / (size.w || 1)) * 1.2 - 0.6, order * STRUM.strumGap);
    if (now - s.last < STRUM.repluck) return;
    s.last = now;
    const along = (s.lengths[i] + (s.lengths[i + 1] - s.lengths[i]) * frac) * size.scale;
    const dir = s.normals[i * 2] * dx + s.normals[i * 2 + 1] * dy < 0 ? -1 : 1;
    s.plucks.push({ s: along, t0: now + order * STRUM.strumGap, amp: STRUM.amp[0] + (STRUM.amp[1] - STRUM.amp[0]) * t, dir });
    if (s.plucks.length > 4) s.plucks.shift();
    wake();
  }
  function crossings(ax: number, ay: number, bx: number, by: number, dt: number) {
    const dx = bx - ax, dy = by - ay, length = Math.hypot(dx, dy);
    if (!length) return;
    const seen = new Set<number>(), hits: { u: number; si: number; i: number; v: number }[] = [];
    const steps = Math.ceil(length / (CELL / 2));
    for (let k = 0; k <= steps; k++) {
      const cx = Math.floor((ax + (dx * k) / steps) / CELL), cy = Math.floor((ay + (dy * k) / steps) / CELL);
      for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
        const key = (cx + ox) * 4096 + cy + oy;
        if (seen.has(key)) continue; seen.add(key);
        const bucket = grid.get(key); if (!bucket) continue;
        for (let b = 0; b < bucket.length; b += 2) {
          const s = strings[bucket[b]], i = bucket[b + 1];
          const px = s.screen[i * 2], py = s.screen[i * 2 + 1], qx = s.screen[i * 2 + 2] - px, qy = s.screen[i * 2 + 3] - py;
          const den = dx * qy - dy * qx; if (!den) continue;
          const u = ((px - ax) * qy - (py - ay) * qx) / den, v = ((px - ax) * dy - (py - ay) * dx) / den;
          if (u >= 0 && u <= 1 && v >= 0 && v <= 1) hits.push({ u, si: bucket[b], i, v });
        }
      }
    }
    hits.sort((a, b) => a.u - b.u);
    const done = new Set<number>(); let order = 0;
    for (const hit of hits) {
      if (done.has(hit.si) || order >= 8) continue;
      done.add(hit.si);
      pluck(hit.si, hit.i, hit.v, length / Math.max(1, dt), dx, dy, order++);
    }
  }

  // ---------------------------------------------------------------- events
  function sectionFor(target: EventTarget | null) {
    if (!(target instanceof Element) || target.closest(".site-header")) return null;
    return target.closest<HTMLElement>(".trailhead");
  }
  const local = (x: number, y: number) => { const r = section!.getBoundingClientRect(); return { x: x - r.left, y: y - r.top }; };
  function onMove(event: PointerEvent) {
    const next = busy() ? null : sectionFor(event.target);
    if (!next) { pointer.has = false; return; }
    if (section !== next || !next.isConnected) { void build(next).catch(() => release()); pointer.has = false; return; }
    const at = local(event.clientX, event.clientY), now = performance.now();
    if (pointer.has && strings.length) crossings(pointer.x, pointer.y, at.x, at.y, now - pointer.t);
    pointer.x = at.x; pointer.y = at.y; pointer.t = now; pointer.has = true;
  }
  function onDown(event: PointerEvent) {
    const next = busy() ? null : sectionFor(event.target);
    if (!next || next !== section || !strings.length) return;
    if (event.target instanceof Element && event.target.closest("a, button, input, select, textarea, [role='button']")) return;
    // Tap or click: pluck the nearest string within reach.
    const at = local(event.clientX, event.clientY);
    let best: { si: number; i: number; d: number } | null = null;
    strings.forEach((s, si) => {
      for (let i = 0; i < s.screen.length / 2 - 1; i++) {
        const d = Math.hypot(s.screen[i * 2] - at.x, s.screen[i * 2 + 1] - at.y);
        if (d < 26 && (!best || d < best.d)) best = { si, i, d };
      }
    });
    const found = best as { si: number; i: number; d: number } | null;
    if (found) { sound.wake(); pluck(found.si, found.i, 0, 1.4, 0, 1, 0, true); }
  }

  function wake() { if (!frame && active) frame = win.requestAnimationFrame(tick); }
  function tick(now: number) { frame = 0; if (draw(now)) wake(); }

  // ---------------------------------------------------------------- lifecycle
  let observer: MutationObserver | null = null;
  function dispose() {
    if (!active) return;
    active = false;
    for (const stop of [
      () => win.cancelAnimationFrame(frame),
      () => win.removeEventListener("pointermove", onMove),
      () => win.removeEventListener("pointerdown", onDown),
      () => reduce.removeEventListener("change", onMotion),
      () => observer?.disconnect(), unsubscribeSound, release, () => sound.close(),
    ]) { try { stop(); } catch { /* Attempt every release after an API failure. */ } }
    frame = 0;
  }
  function onMotion() { if (reduce.matches) dispose(); }
  try {
    observer = new MutationObserver(() => draw(performance.now()));
    observer.observe(doc.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    if (reduce.matches) { dispose(); return { dispose }; }
    win.addEventListener("pointermove", onMove, { passive: true });
    win.addEventListener("pointerdown", onDown, { passive: true });
    reduce.addEventListener("change", onMotion);
    const first = doc.querySelector<HTMLElement>(".trailhead");
    if (first) void build(first).catch(() => release());
  } catch { dispose(); }
  return { dispose };
}
