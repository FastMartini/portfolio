// the hero's contour lines as guitar strings ("Branding iron" direction).
//   - Each contour in hero-contours.svg is its own string, redrawn as vectors on
//     a canvas. Touching or crossing one bends it silently: a slow pass leaves a
//     small ripple, a fast swipe pushes the line along the movement before it
//     springs back. Every string has its own pitch of vibration.
//   - Every click or tap plays the next note of a short blues riff on a warm,
//     clean electric guitar in a lively room. Each line has its own tone: where
//     it is picked, how bright the attack is, how long it rings. One position is shared by all the
//     lines: any trigger, on any line or the same one again, advances the riff.
//   - A quick sweep vibrates every line it crosses, in the order and at the
//     moment it crossed them. Only a click or tap on a line plays a note, and
//     it always shows a visible pluck, even right after a hover.
// Native cursor. Reduced motion: nothing mounts. Audio starts only on a
// click or tap on a contour, or when the sound toggle is explicitly enabled.
import { heroSound } from "./sound";

export const STRUM = {
  opacity: 0.22,        // matches the static contours before interaction mounts
  ringDarken: 2.6,      // extra strength on a ringing string, at full energy
  amp: [1.5, 9],        // px of ripple, light touch → fast swipe
  bend: 20,             // px a fast swipe pushes the line before it springs back
  bendTime: 0.07,       // s for the bend to spring back
  pluck: 0.75,          // strength of a click's visible pluck
  touch: 4,             // px: a cursor this close to a line touches it
  hz: 6,                // visible vibration rate: slow enough to read as a wave
  wavelength: 190,      // px along the string
  spread: [36, 520],    // wave packet: start width (px) and growth (px/s)
  decay: 1.5,           // per second
  life: 2.6,            // s
  repluck: 90,          // ms before the same string can be plucked again
  volume: 0.5,
};
// The About braid's single discovery note (G4).
const BRAID_NOTE = 392;
// A3 C4 D4 E4 G4 E4 C4 A3, then back to the first note.
export const RIFF = [220, 261.63, 293.66, 329.63, 392, 329.63, 261.63, 220] as const;
const NOTE = { attack: 0.004, hold: 0.2, release: 0.07, cut: 0.012 }; // s: ~300 ms ring, then the room

// A line's tone colour. Pick position: low is near the bridge (thin, bright),
// high toward the neck (round, hollow). Brightness shapes the pick attack,
// sustain how long the string rings, cutoff how dark the note sits.
type Tone = { id: number; pick: number; bright: number; sustain: number; cutoff: number };
const DEFAULT_TONE: Tone = { id: -1, pick: 0.13, bright: 0.55, sustain: 0.9985, cutoff: 3200 };
type Pluck = { s: number; t0: number; amp: number; bend: number; dir: number };
type Str = {
  pts: Float32Array; normals: Float32Array; lengths: Float32Array; width: number; closed: boolean;
  screen: Float32Array; plucks: Pluck[]; last: number;
  hz: number; decay: number; wavelength: number; // this string's own vibration
  tone: Tone;
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
    return { pts, normals, lengths, closed, width: parseFloat(path.getAttribute("stroke-width") ?? "1"), screen: new Float32Array(pts.length), plucks: [], last: 0,
      hz: STRUM.hz, decay: STRUM.decay, wavelength: STRUM.wavelength, tone: DEFAULT_TONE };
  }).filter(s => s.pts.length >= 4);
  if (!strings.length) return null;
  // Shorter strings vibrate faster with tighter waves, like a real instrument;
  // a fixed per-string jitter keeps neighbours of similar length distinct.
  [...strings].sort((a, b) => b.lengths[b.lengths.length - 1] - a.lengths[a.lengths.length - 1])
    .forEach((s, rank, all) => {
      const r = all.length > 1 ? rank / (all.length - 1) : 0;
      const jitter = (k: number) => { const v = Math.sin((rank + 1) * k) * 43758.5453; return v - Math.floor(v); };
      s.hz = STRUM.hz * (0.8 + 0.45 * r + 0.12 * jitter(12.9898));
      s.decay = STRUM.decay * (0.85 + 0.35 * jitter(78.233));
      s.wavelength = STRUM.wavelength * (1.15 - 0.3 * r);
      // Spread tones by a golden-ratio walk so neighbouring lines never sound alike.
      const w = (rank * 0.618034) % 1, w2 = (rank * 0.381966 + 0.5) % 1;
      s.tone = {
        id: rank,
        pick: 0.07 + 0.2 * w,
        bright: 0.42 + 0.33 * w2,
        sustain: 0.9975 + 0.0016 * jitter(39.425),
        cutoff: 1900 + 2600 * (1 - w) * (0.6 + 0.4 * w2),
      };
    });
  return { strings, vw: box[2] || 1000, vh: box[3] || 700 };
}

// ------------------------------------------------------------------ the amp
function amp(win: Window) {
  let ctx: AudioContext | null = null, input: AudioNode | null = null;
  // The riff is monophonic: a new note quickly fades whatever still rings.
  const voices: { src: AudioBufferSourceNode; level: GainNode }[] = [];
  let output: GainNode | null = null;
  let unlocking: Promise<void> | null = null;
  let monitor: AnalyserNode | null = null, monitoring = false;
  let visible = !win.document.hidden, generation = 0;
  const cache = new Map<string, AudioBuffer>();
  const audioWindow = win as Window & { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
  const Ctor = audioWindow.AudioContext ?? audioWindow.webkitAudioContext;
  function build(c: AudioContext) {
    // Guitar → barely-there valve warmth → rounded cabinet → a lively room.
    const pre = c.createBiquadFilter(); pre.type = "highpass"; pre.frequency.value = 90;
    const drive = c.createWaveShaper(), curve = new Float32Array(2048), k = 1.4;
    for (let i = 0; i < curve.length; i++) { const x = (i / (curve.length - 1)) * 2 - 1; curve[i] = Math.tanh(k * x) / Math.tanh(k); }
    drive.curve = curve; drive.oversample = "4x";
    const mid = c.createBiquadFilter(); mid.type = "peaking"; mid.frequency.value = 420; mid.Q.value = 0.8; mid.gain.value = 2.5;
    const cab = c.createBiquadFilter(); cab.type = "lowpass"; cab.frequency.value = 2600; cab.Q.value = 0.6;
    // A ~2 s room: a few early reflections, then a decorrelated stereo tail
    // that decays exponentially and darkens as it fades, like real walls.
    const sr = c.sampleRate, rt60 = 2, seconds = 2.4, ir = c.createBuffer(2, Math.floor(sr * seconds), sr);
    for (let ch = 0; ch < 2; ch++) {
      const data = ir.getChannelData(ch);
      let low = 0;
      for (let i = 0; i < data.length; i++) {
        const t = i / sr, damp = 0.25 + 0.7 * Math.min(1, t / seconds);
        low += (1 - damp) * ((Math.random() * 2 - 1) - low);
        data[i] = low * Math.exp((-6.9 * t) / rt60) * Math.min(1, (data.length - i) / (sr * 0.1));
      }
      for (const [at, gain] of [[0.011, 0.5], [0.019, -0.4], [0.027, 0.32], [0.041, -0.25]]) {
        data[Math.floor(sr * (at + ch * 0.003))] += gain;
      }
    }
    const room = c.createConvolver(); room.buffer = ir;
    const preDelay = c.createDelay(0.1); preDelay.delayTime.value = 0.022;
    const tail = c.createBiquadFilter(); tail.type = "lowpass"; tail.frequency.value = 4800;
    const dry = c.createGain(), wet = c.createGain(), level = c.createDynamicsCompressor(), out = c.createGain();
    dry.gain.value = 0.8; wet.gain.value = 0.42; level.threshold.value = -20; level.ratio.value = 4; out.gain.value = heroSound.get() ? 0.32 : 0;
    output = out;
    monitor = c.createAnalyser(); monitor.fftSize = 32;
    pre.connect(drive); drive.connect(mid); mid.connect(cab);
    cab.connect(dry); cab.connect(preDelay); preDelay.connect(room); room.connect(tail); tail.connect(wet);
    dry.connect(level); wet.connect(level); level.connect(out); out.connect(c.destination);
    return pre;
  }
  function string(c: AudioContext, f: number, tone: Tone) {
    const key = `${f}|${tone.id}`;
    let b = cache.get(key);
    if (b) return b;
    // Karplus–Strong. One smoothing pass keeps the pick soft without turning it
    // into a felt hammer, and the pick position notches out the harmonics a
    // pick there can't excite: the hollow sound of a plucked string.
    const sr = c.sampleRate, length = Math.floor(sr * 0.8), N = Math.max(2, Math.round(sr / f));
    const ring = new Float32Array(N), data = new Float32Array(length);
    for (let i = 0; i < N; i++) ring[i] = Math.random() * 2 - 1;
    for (let i = 1; i < N; i++) ring[i] = tone.bright * ring[i] + (1 - tone.bright) * ring[i - 1];
    const pick = Math.max(1, Math.round(N * tone.pick)), burst = ring.slice();
    for (let i = 0; i < N; i++) ring[i] = burst[i] - burst[(i - pick + N) % N];
    let peak = 0;
    for (let i = 0, j = 0; i < length; i++) {
      const next = (j + 1) % N, value = ring[j];
      data[i] = value; peak = Math.max(peak, Math.abs(value));
      ring[j] = tone.sustain * (0.5 * value + 0.5 * ring[next]); j = next;
    }
    const fade = Math.floor(sr * 0.05);
    for (let i = 0; i < length; i++) data[i] = (data[i] / (peak || 1)) * Math.min(1, (length - i) / fade);
    b = c.createBuffer(1, length, sr); b.copyToChannel(data, 0);
    cache.set(key, b);
    return b;
  }
  function note(c: AudioContext, f: number, tone: Tone, gain: number, pan: number, when: number) {
    if (!input) return;
    for (const old of voices.splice(0)) {
      old.level.gain.cancelScheduledValues(when);
      old.level.gain.setTargetAtTime(0, when, NOTE.cut);
      try { old.src.stop(when + NOTE.cut * 5); } catch { /* Already stopped. */ }
    }
    const src = c.createBufferSource(), color = c.createBiquadFilter(), level = c.createGain(), side = c.createStereoPanner();
    src.buffer = string(c, f, tone);
    color.type = "lowpass"; color.frequency.value = tone.cutoff; color.Q.value = 0.7;
    // Soft pick in, ring briefly, then let the room carry the tail.
    const g = level.gain;
    g.setValueAtTime(0, when);
    g.linearRampToValueAtTime(gain, when + NOTE.attack);
    g.setValueAtTime(gain, when + NOTE.hold);
    g.setTargetAtTime(0, when + NOTE.hold, NOTE.release);
    side.pan.value = pan;
    src.connect(color); color.connect(level); level.connect(side); side.connect(input);
    const voice = { src, level };
    voices.push(voice);
    src.onended = () => { const at = voices.indexOf(voice); if (at >= 0) voices.splice(at, 1); src.disconnect(); color.disconnect(); side.disconnect(); };
    src.start(when); src.stop(when + NOTE.hold + NOTE.release * 6);
  }
  function keepReady(ready: boolean) {
    if (!output || !monitor || ready === monitoring) return;
    if (ready) output.connect(monitor); else output.disconnect(monitor);
    // This sinkless analyser is an automatic-pull node: it keeps the native
    // interactive output out of idle standby without generating any samples.
    monitoring = ready;
  }
  function wake() {
    if (!heroSound.get() || !visible) return;
    try {
      if (!ctx && Ctor) { ctx = new Ctor({ latencyHint: "interactive" }); input = build(ctx); }
      keepReady(true);
      if (ctx && ctx.state !== "running" && ctx.state !== "closed") unlocking = ctx.resume().catch(() => {});
    } catch {
      void ctx?.close().catch(() => {});
      ctx = null; input = null; output = null; monitor = null; monitoring = false; unlocking = null;
    }
  }
  function play(f: number, strength: number, pan: number, delay: number, tone: Tone = DEFAULT_TONE) {
    // Never create the context from hover: it may only start after a gesture.
    const c = ctx, ticket = generation;
    if (!c || !visible || !heroSound.get()) return;
    if (c.state !== "running") {
      // Safari resumes asynchronously on the first tap. Keep that pluck so
      // the gesture that unlocks the amp also plays the touched string.
      void unlocking?.then(() => {
        if (ctx === c && ticket === generation && visible && c.state === "running" && heroSound.get()) play(f, strength, pan, delay, tone);
      });
      return;
    }
    const when = c.currentTime + delay / 1000;
    note(c, f, tone, STRUM.volume * (0.5 + 0.5 * strength), pan, when);
  }
  return {
    wake,
    setEnabled(enabled: boolean) {
      if (!enabled) generation++;
      keepReady(enabled && visible);
      if (ctx && output) output.gain.setTargetAtTime(enabled ? 0.32 : 0, ctx.currentTime, 0.01);
    },
    setVisible(next: boolean) {
      visible = next;
      if (next) { if (ctx) wake(); }
      else {
        generation++; keepReady(false);
        const pausing = ctx;
        void pausing?.suspend().then(() => { if (ctx === pausing && visible) wake(); }).catch(() => {});
      }
    },
    play,
    close() {
      generation++; keepReady(false);
      void ctx?.close().catch(() => {}); ctx = null; input = null; output = null; monitor = null; monitoring = false; unlocking = null;
    },
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
  let size = { w: 0, h: 0, dpr: 1, scale: 1, ox: 0, oy: 0, top: 0 };
  const pointer = { x: 0, y: 0, has: false, t: 0 };
  // One shared place in the riff for every contour line.
  let step = 0;
  // Strings the pointer is resting on or sliding along without crossing.
  let near = new Set<number>();
  let tap: { id: number; x: number; y: number; started: number; si: number; i: number } | null = null;
  const TAP_SLOP = 10, TAP_DURATION = 700;
  const CELL = 48;
  const artwork = new Map<string, NonNullable<Awaited<ReturnType<typeof loadStrings>>>>();
  const loading = new Map<string, Promise<Awaited<ReturnType<typeof loadStrings>>>>();
  function preload(src: string) {
    let pending = loading.get(src);
    if (!pending) { pending = loadStrings(src).then(value => { if (value) artwork.set(src, value); return value; }).catch(() => null); loading.set(src, pending); }
    return pending;
  }

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
    const token = ++building, loaded = artwork.get(src) ?? await preload(src);
    if (!loaded || token !== building || section !== next || !active) return;
    strings = loaded.strings; strings.forEach(s => { s.plucks = []; s.last = 0; }); view = loaded;
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
    // Observing a newly mounted section sends an initial notification even
    // when its dimensions did not change. Preserve the first held tap.
    if (w !== size.w || h !== size.h || dpr !== size.dpr) cancelTap();
    const bottom = contours?.dataset.fit === "width-bottom";
    const scale = bottom ? w / view.vw : Math.max(w / view.vw, h / view.vh);
    const oy = bottom ? h - view.vh * scale : (h - view.vh * scale) / 2;
    // Bottom-fitted artwork only needs a canvas over its own band (plus room
    // for the wave), which keeps tall sections under browser canvas limits.
    const top = bottom ? Math.max(0, Math.floor(oy - 40)) : 0;
    size = { w, h, dpr, scale, ox: (w - view.vw * scale) / 2, oy, top };
    canvas.width = Math.round(w * dpr); canvas.height = Math.round((h - top) * dpr);
    canvas.style.top = top ? `${top}px` : ""; canvas.style.height = top ? `${h - top}px` : "";
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
    cancelTap();
    building++;
    const previousResize = resize; resize = null;
    canvas?.remove(); canvas = null; ctx = null;
    if (contours) contours.style.visibility = "";
    section = contours = null; strings = []; grid = new Map(); near = new Set();
    try { previousResize?.disconnect(); } catch { /* The canvas is already released. */ }
  }

  // ---------------------------------------------------------------- drawing
  function draw(now: number) {
    if (!ctx || !canvas || !section) return false;
    const cs = getComputedStyle(contours!);
    const color = cs.backgroundColor.match(/[\d.]+/g)?.slice(0, 3).join(",") ?? "23,63,53";
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, -size.top * size.dpr);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    // The artwork's own horizontal fade: quiet on the left, full on the right.
    const x0 = size.ox, x1 = size.ox + view.vw * size.scale;
    const stroke = (alpha: number) => {
      if (contours?.dataset.fade === "none") return `rgba(${color},${alpha})`;
      const g = ctx!.createLinearGradient(x0, 0, x1, 0);
      g.addColorStop(0, `rgba(${color},${0.12 * alpha})`); g.addColorStop(0.6, `rgba(${color},${0.2 * alpha})`); g.addColorStop(1, `rgba(${color},${alpha})`);
      return g;
    };
    const opacity = contours?.dataset.fade === "none" ? 0.16 : STRUM.opacity;
    const base = stroke(Math.min(1, opacity));
    let ringing = false;
    const { spread, life, bendTime } = STRUM;
    for (const s of strings) {
      const { hz, wavelength, decay } = s;
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
            // A fast swipe drags the string along with it, then lets it spring back.
            if (p.bend) d += p.dir * p.bend * Math.exp(-t / bendTime) * (1 - Math.exp(-t / 0.012)) * Math.exp(-(dist * dist) / (2 * 70 * 70));
          }
          x += s.normals[i * 2] * d; y += s.normals[i * 2 + 1] * d;
        }
        if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      for (const p of live) energy = Math.max(energy, Math.exp(-decay * ((now - p.t0) / 1000)));
      ctx.strokeStyle = energy > 0.01 ? stroke(Math.min(1, opacity * (1 + STRUM.ringDarken * energy))) : base;
      ctx.stroke();
      if (s.plucks.length) ringing = true;
    }
    return ringing;
  }

  // ---------------------------------------------------------------- plucking
  // Silent visual pluck. strength 0 is the lightest touch, 1 a fast swipe.
  function pluck(si: number, i: number, frac: number, strength: number, dir: number, t0: number, force = false) {
    const s = strings[si], now = performance.now();
    if (!force && now - s.last < STRUM.repluck) return;
    s.last = now;
    const along = (s.lengths[i] + (s.lengths[i + 1] - s.lengths[i]) * frac) * size.scale;
    s.plucks.push({ s: along, t0, dir, amp: STRUM.amp[0] + (STRUM.amp[1] - STRUM.amp[0]) * strength, bend: STRUM.bend * strength * strength });
    if (s.plucks.length > 4) s.plucks.shift();
    if (canvas) canvas.dataset.plucks = String(Number(canvas.dataset.plucks ?? 0) + 1);
    wake();
  }
  // Which way the movement pushes a string across its segment.
  const side = (s: Str, i: number, dx: number, dy: number) => (s.normals[i * 2] * dx + s.normals[i * 2 + 1] * dy < 0 ? -1 : 1);
  const strength = (length: number, dt: number) => Math.min(1, length / Math.max(1, dt) / 2.5);
  // Every string crossed between two pointer samples, each at the moment the
  // pointer actually crossed it, so a quick sweep still reads as a strum.
  function crossings(ax: number, ay: number, bx: number, by: number, dt: number, now: number) {
    const dx = bx - ax, dy = by - ay, length = Math.hypot(dx, dy);
    const done = new Set<number>();
    if (!length) return done;
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
    const force = strength(length, dt), taken = new Map<number, number[]>();
    for (const hit of hits) {
      // A loop crossed twice moves at both points; one crossing that falls on a
      // segment joint (two hits a hair apart) counts once.
      const s = strings[hit.si], along = s.lengths[hit.i] + (s.lengths[hit.i + 1] - s.lengths[hit.i]) * hit.v;
      const seen = taken.get(hit.si) ?? [];
      if (seen.some(at => Math.abs(at - along) < 12)) continue;
      taken.set(hit.si, [...seen, along]); done.add(hit.si);
      pluck(hit.si, hit.i, hit.v, force, side(s, hit.i, dx, dy), now - (1 - hit.u) * Math.min(dt, 120), seen.length > 0);
    }
    return done;
  }
  function touches(x: number, y: number, dx: number, dy: number, dt: number, now: number, crossed: Set<number>) {
    const found = new Map<number, { i: number; v: number }>();
    const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
    for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
      const bucket = grid.get((cx + ox) * 4096 + cy + oy); if (!bucket) continue;
      for (let b = 0; b < bucket.length; b += 2) {
        const si = bucket[b], s = strings[si], i = bucket[b + 1];
        const px = s.screen[i * 2], py = s.screen[i * 2 + 1], qx = s.screen[i * 2 + 2] - px, qy = s.screen[i * 2 + 3] - py;
        const q = qx * qx + qy * qy, v = q ? Math.max(0, Math.min(1, ((x - px) * qx + (y - py) * qy) / q)) : 0;
        const reach = STRUM.touch + (s.width * size.scale) / 2;
        if (Math.hypot(px + qx * v - x, py + qy * v - y) <= reach && !found.has(si)) found.set(si, { i, v });
      }
    }
    // Only the moment of contact plucks; sliding along a line doesn't re-trigger it.
    for (const [si, at] of found) if (!near.has(si) && !crossed.has(si)) {
      pluck(si, at.i, at.v, strength(Math.hypot(dx, dy), dt), dx || dy ? side(strings[si], at.i, dx, dy) : 1, now);
    }
    near = new Set(found.keys());
  }

  // ---------------------------------------------------------------- events
  function sectionFor(target: EventTarget | null) {
    // The Summit register is a form: typing or moving across it never plucks.
    if (!(target instanceof Element) || target.closest(".site-header, .photo-ring, .journey-trail, .summit-register")) return null;
    return target.closest<HTMLElement>(".trailhead, .about, .work, .summit");
  }
  const local = (x: number, y: number) => { const r = section!.getBoundingClientRect(); return { x: x - r.left, y: y - r.top }; };
  function cancelTap() { tap = null; }
  function moved(event: PointerEvent) { return !!tap && Math.hypot(event.clientX - tap.x, event.clientY - tap.y) > TAP_SLOP; }
  function onMove(event: PointerEvent) {
    // Remember the entire gesture, including a drag that returns to its start.
    if (tap?.id === event.pointerId && moved(event)) cancelTap();
    const next = busy() ? null : sectionFor(event.target);
    if (!next) { pointer.has = false; near = new Set(); return; }
    if (section !== next || !next.isConnected) { void build(next).catch(() => release()); pointer.has = false; near = new Set(); return; }
    const at = local(event.clientX, event.clientY), now = performance.now();
    if (strings.length) {
      const dx = pointer.has ? at.x - pointer.x : 0, dy = pointer.has ? at.y - pointer.y : 0, dt = now - pointer.t;
      const crossed = pointer.has ? crossings(pointer.x, pointer.y, at.x, at.y, dt, now) : new Set<number>();
      touches(at.x, at.y, dx, dy, dt, now, crossed);
    }
    pointer.x = at.x; pointer.y = at.y; pointer.t = now; pointer.has = true;
  }
  function onDown(event: PointerEvent) {
    cancelTap();
    if (!event.isPrimary || event.button !== 0) return;
    const next = busy() ? null : sectionFor(event.target);
    // Both assets are preloaded, so the first direct tap in About can select
    // a string synchronously without requiring a hover to mount its canvas.
    if (next && next !== section) void build(next).catch(() => release());
    if (!next || next !== section || !strings.length) return;
    if (event.target instanceof Element && event.target.closest("a, button, input, select, textarea, [role='button']")) return;
    // Select a candidate only. A touch may become a native scroll and cancel.
    const at = local(event.clientX, event.clientY);
    let best: { si: number; i: number; d: number } | null = null;
    strings.forEach((s, si) => {
      for (let i = 0; i < s.screen.length / 2 - 1; i++) {
        const d = Math.hypot(s.screen[i * 2] - at.x, s.screen[i * 2 + 1] - at.y);
        if (d < 26 && (!best || d < best.d)) best = { si, i, d };
      }
    });
    const found = best as { si: number; i: number; d: number } | null;
    if (found) tap = { id: event.pointerId, x: event.clientX, y: event.clientY, started: performance.now(), si: found.si, i: found.i };
  }
  function onUp(event: PointerEvent) {
    const selected = tap;
    if (!selected || selected.id !== event.pointerId) return;
    const valid = event.isPrimary && event.button === 0 && !moved(event)
      && performance.now() - selected.started <= TAP_DURATION && !busy()
      && sectionFor(event.target) === section && section?.isConnected
      && !(event.target instanceof Element && event.target.closest("a, button, input, select, textarea, [role='button']"));
    cancelTap();
    if (valid) {
      // Pointer-up is the completed gesture, including the first Safari tap.
      // The click always shows its pluck, even if a hover just plucked this line.
      sound.wake();
      const s = strings[selected.si];
      pluck(selected.si, selected.i, 0, STRUM.pluck, 1, performance.now(), true);
      if (heroSound.get()) {
        const f = RIFF[step];
        step = (step + 1) % RIFF.length;
        sound.play(f, STRUM.pluck, (s.screen[selected.i * 2] / (size.w || 1)) * 1.2 - 0.6, 0, s.tone);
      }
    }
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
      () => win.removeEventListener("pointerup", onUp),
      () => win.removeEventListener("pointercancel", cancelTap),
      () => win.removeEventListener("scroll", cancelTap, true),
      () => win.removeEventListener("blur", cancelTap),
      () => doc.removeEventListener("portfolio:braid-pluck", onBraid),
      () => doc.removeEventListener("visibilitychange", onVisibility),
      () => reduce.removeEventListener("change", onMotion),
      () => observer?.disconnect(), unsubscribeSound, release, () => sound.close(),
    ]) { try { stop(); } catch { /* Attempt every release after an API failure. */ } }
    frame = 0;
  }
  function onMotion() { if (reduce.matches) dispose(); }
  function onVisibility() { sound.setVisible(!doc.hidden); }
  function onBraid() { if (!busy() && !reduce.matches && active && heroSound.get()) { sound.wake(); sound.play(BRAID_NOTE, 0.75, 0, 0); } }
  try {
    observer = new MutationObserver(() => draw(performance.now()));
    observer.observe(doc.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    if (reduce.matches) { dispose(); return { dispose }; }
    win.addEventListener("pointermove", onMove, { passive: true });
    win.addEventListener("pointerdown", onDown, { passive: true });
    win.addEventListener("pointerup", onUp, { passive: true });
    win.addEventListener("pointercancel", cancelTap, { passive: true });
    win.addEventListener("scroll", cancelTap, { passive: true, capture: true });
    win.addEventListener("blur", cancelTap);
    doc.addEventListener("portfolio:braid-pluck", onBraid);
    doc.addEventListener("visibilitychange", onVisibility);
    reduce.addEventListener("change", onMotion);
    for (const layer of doc.querySelectorAll<HTMLElement>(".trailhead-contours")) {
      const style = getComputedStyle(layer), src = cssUrl(style.maskImage || style.getPropertyValue("-webkit-mask-image"));
      if (src) void preload(src);
    }
    const first = doc.querySelector<HTMLElement>(".trailhead");
    if (first) void build(first).catch(() => release());
  } catch { dispose(); }
  return { dispose };
}
