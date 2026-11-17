import { HERO_READY_EVENT } from "../trailhead-art";
import { buildTrailGeometry, lengthAtHeight, type TrailGeometry } from "./trail-geometry";
import { buildBraid } from "./braid";
import { mountGentleWheel } from "./wheel";

export function mountJourneyTrail(main: HTMLElement, svg: SVGSVGElement) {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)"), abort = new AbortController(), signal = abort.signal;
  const line = svg.querySelector<SVGPathElement>(".journey-trail-line")!, head = svg.querySelector<SVGCircleElement>(".journey-trail-tip")!;
  const group = svg.querySelector<SVGGElement>(".journey-braid")!, pins = [...svg.querySelectorAll<SVGCircleElement>(".trail-pin")];
  let geo: TrailGeometry | null = null, braid: ReturnType<typeof buildBraid> | null = null;
  let shown = 0, floor = 0, introAt = Infinity, frame = 0, rebuildFrame = 0, last = 0, stopped = false;
  let ready = false;
  let tap: { id: number; x: number; y: number; time: number; completed: boolean } | null = null;
  const cancelTap = () => { tap = null; };
  const clamp = (n: number) => Math.max(0, Math.min(1, n));
  const busy = () => document.documentElement.dataset.splash === "active" || !!document.querySelector("body > .splash--list, body > .splash--climb");
  function sync() {
    if (busy()) { ready = false; introAt = Infinity; shown = 0; }
    else if (!ready) { ready = true; introAt = performance.now(); }
    kick();
  }
  function rebuild() { try { rebuildLayout(); } catch { cleanup(); } }
  function rebuildLayout() {
    rebuildFrame = 0;
    if (stopped) return;
    svg.setAttribute("width", String(main.clientWidth)); svg.setAttribute("height", String(main.scrollHeight));
    svg.setAttribute("viewBox", `0 0 ${main.clientWidth} ${main.scrollHeight}`);
    const next = buildTrailGeometry(main, line); if (!next) { main.classList.remove("has-journey-trail"); return; }
    const ratio = geo ? shown / geo.length : 0;
    geo = next; shown = reduce.matches ? geo.length : ratio * geo.length;
    line.style.strokeDasharray = `${geo.length} ${geo.length + 20}`;
    pins.forEach((pin, i) => { pin.setAttribute("cx", String(geo!.pins[i].x)); pin.setAttribute("cy", String(geo!.pins[i].y)); });
    braid = buildBraid(group, line, geo); cancelTap();
    braid.hit.addEventListener("pointerdown", event => {
      if (event.isPrimary && event.button === 0) tap = { id: event.pointerId, x: event.clientX, y: event.clientY, time: performance.now(), completed: false };
    });
    braid.hit.addEventListener("click", () => {
      const valid = tap?.completed; cancelTap();
      if (!valid || reduce.matches || busy()) return;
      // A native click is generated only after a completed tap/click, never a scroll.
      document.dispatchEvent(new Event("portfolio:braid-pluck"));
      braid!.string.getAnimations().forEach(animation => animation.cancel());
      braid!.string.animate([{ strokeWidth: 2.8 }, { strokeWidth: 1.1, offset: 0.15 }, { strokeWidth: 2.3, offset: 0.3 }, { strokeWidth: 1.2, offset: 0.45 }, { strokeWidth: 1.9, offset: 0.6 }, { strokeWidth: 1.3 }], { duration: 900, easing: "ease-out" });
    });
    main.classList.add("has-journey-trail");
    paint(); kick();
  }
  function target(now: number) {
    if (!geo) return 0;
    if (reduce.matches) return geo.length;
    if (!ready) return 0;
    const intro = 1 - (1 - clamp((now - introAt) / 1100)) ** 3;
    if (scrollY >= geo.endScroll - 1) return geo.length * intro;
    const initial = lengthAtHeight(geo, innerHeight * 0.62 - geo.mainTop);
    const even = initial + (geo.length - initial) * clamp(scrollY / geo.endScroll);
    const page = scrollY - geo.mainTop;
    const lo = lengthAtHeight(geo, page + innerHeight * 0.5), hi = Math.max(lo, lengthAtHeight(geo, page + innerHeight * 0.8));
    floor = lo * intro;
    return Math.min(Math.max(even, lo), hi) * intro;
  }
  function paint() {
    if (!geo) return;
    main.classList.toggle("journey-trail-motion", !reduce.matches && ready);
    line.style.strokeDashoffset = String(geo.length - shown);
    const p = line.getPointAtLength(shown);
    head.setAttribute("opacity", !reduce.matches && ready && shown > 2 && shown < geo.length - 2 ? "1" : "0");
    head.setAttribute("cx", String(p.x)); head.setAttribute("cy", String(p.y));
    pins.forEach((pin, i) => pin.classList.toggle("is-lit", reduce.matches || shown >= geo!.pins[i].length - 1));
    const revealRange = geo.length * 0.035;
    geo.pitches.forEach((pitch, i) => {
      // Use the same trail lead-in in either direction, without a timed reveal.
      const progress = reduce.matches ? 1 : clamp((shown - geo!.pins[i].length + revealRange) / revealRange);
      pitch.style.setProperty("--pitch-progress", String(progress));
      pitch.classList.toggle("is-shown", progress === 1);
    });
    geo.marker.classList.toggle("is-reached", shown >= geo.length - 2);
    braid?.paint(shown, reduce.matches);
  }
  function tick(now: number) { try { renderFrame(now); } catch { cleanup(); } }
  function renderFrame(now: number) {
    frame = 0;
    const dt = Math.min(64, now - (last || now - 16)); last = now;
    const goal = target(now), tau = shown < floor - 4 ? 35 : 90;
    shown = reduce.matches ? goal : shown + (goal - shown) * (1 - Math.exp(-dt / tau));
    if (Math.abs(goal - shown) < 0.5) shown = goal;
    paint();
    if (shown !== goal || (ready && now < introAt + 1100)) frame = requestAnimationFrame(tick); else last = 0;
  }
  function kick() { if (!stopped && !frame) frame = requestAnimationFrame(tick); }
  function schedule() { if (stopped) return; cancelAnimationFrame(rebuildFrame); rebuildFrame = requestAnimationFrame(rebuild); }
  let resize: ResizeObserver | undefined, theme: MutationObserver | undefined, splash: MutationObserver | undefined;
  const cleanup = () => {
    stopped = true;
    for (const stop of [() => abort.abort(), () => resize?.disconnect(), () => theme?.disconnect(), () => splash?.disconnect(), () => cancelAnimationFrame(frame), () => cancelAnimationFrame(rebuildFrame)]) { try { stop(); } catch { /* Release the other resources after an optional API failure. */ } }
    main.classList.remove("has-journey-trail", "journey-trail-motion");
    geo?.pitches.forEach(pitch => { pitch.classList.remove("is-shown"); pitch.style.removeProperty("--pitch-progress"); }); geo?.marker.classList.remove("is-reached");
    group.replaceChildren(); line.removeAttribute("d");
  };
  try {
    resize = new ResizeObserver(schedule); resize.observe(main);
    theme = new MutationObserver(schedule); theme.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    splash = new MutationObserver(sync);
    splash.observe(document.documentElement, { attributes: true, attributeFilter: ["data-splash"] }); splash.observe(document.body, { childList: true });
    document.addEventListener(HERO_READY_EVENT, sync, { signal });
    window.addEventListener("scroll", () => { cancelTap(); kick(); }, { passive: true, signal });
    window.addEventListener("pointermove", event => { if (tap?.id === event.pointerId && Math.hypot(event.clientX - tap.x, event.clientY - tap.y) > 10) cancelTap(); }, { passive: true, signal });
    window.addEventListener("pointerup", event => { if (tap?.id === event.pointerId) tap.completed = event.button === 0 && performance.now() - tap.time < 700 && Math.hypot(event.clientX - tap.x, event.clientY - tap.y) <= 10; }, { signal });
    window.addEventListener("pointercancel", cancelTap, { signal }); window.addEventListener("blur", cancelTap, { signal });
    window.addEventListener("resize", schedule, { signal }); window.addEventListener("hashchange", schedule, { signal });
    reduce.addEventListener("change", schedule, { signal });
    void document.fonts?.ready.then(schedule);
    mountGentleWheel(main, reduce, signal); rebuild(); sync();
  } catch { cleanup(); }
  return cleanup;
}
