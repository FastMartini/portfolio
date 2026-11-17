/** A progressively enhanced ring. React owns content; this controller owns transforms and gestures. */
export function mountRing(root: HTMLElement, onFront: (index: number) => void, onTurn: () => void) {
  if (typeof ResizeObserver !== "function" || typeof matchMedia !== "function" || typeof requestAnimationFrame !== "function") return () => {};
  const stage = root.querySelector<HTMLElement>(".ring-stage")!, track = root.querySelector<HTMLElement>(".ring-track")!;
  const cards = [...root.querySelectorAll<HTMLElement>(".ring-card")], orbit = root.querySelector<HTMLElement>(".ring-orbit")!;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)"), step = 360 / cards.length;
  let angle = 0, target: number | null = null, velocity = 0, radius = 0, frame = 0, lastFrame = 0, current = -1;
  let drag: { id: number; x: number; y: number; last: number; time: number; moved: number } | null = null;
  let suppressClick = false, wheelIdle = 0;
  function render() {
    cards.forEach((card, i) => {
      const a = i * step + angle, face = Math.max(0, Math.cos(a * Math.PI / 180));
      card.style.transform = `rotateY(${a}deg) translateZ(${radius}px)`;
      card.style.opacity = String(0.2 + 0.8 * face);
      card.style.filter = face > 0.999 ? "none" : `brightness(${0.5 + 0.5 * face})`;
    });
    const index = ((Math.round(-angle / step) % cards.length) + cards.length) % cards.length;
    if (index !== current) {
      current = index;
      cards.forEach((card, i) => { card.inert = i !== index; card.setAttribute("aria-hidden", String(i !== index)); });
      onFront(index);
    }
  }
  function measure() {
    if (!root.offsetWidth) onTurn();
    const width = cards[0].offsetWidth;
    radius = width / 2 / Math.tan(Math.PI / cards.length) + width * 0.12;
    track.style.transform = `translateZ(${-radius}px)`;
    const size = 2 * radius + width * 0.15;
    Object.assign(orbit.style, { width: `${size}px`, height: `${size}px`, transform: "translate(-50%, -50%) translateY(26px) rotateX(90deg)" });
    render();
  }
  function tick(now: number) {
    frame = 0;
    const dt = Math.min(40, now - (lastFrame || now - 16)); lastFrame = now;
    if (target === null) {
      angle += velocity * dt / 16; velocity *= Math.pow(0.93, dt / 16);
      if (Math.abs(velocity) < 0.2) target = Math.round(angle / step) * step;
    }
    if (target !== null) {
      angle += (target - angle) * (1 - Math.pow(0.87, dt / 16));
      if (Math.abs(target - angle) < 0.05 || reduce.matches) { angle = target; target = null; velocity = 0; render(); lastFrame = 0; return; }
    }
    render(); frame = requestAnimationFrame(tick);
  }
  function settle(value: number) {
    onTurn();
    velocity = 0; target = value;
    if (reduce.matches) { angle = value; target = null; render(); }
    else if (!frame) { lastFrame = 0; frame = requestAnimationFrame(tick); }
  }
  const stepBy = (direction: number) => settle((target ?? Math.round(angle / step) * step) - direction * step);
  const face = (i: number) => { const base = -i * step, from = target ?? angle; settle(base + 360 * Math.round((from - base) / 360)); };
  const abort = new AbortController(), signal = abort.signal;
  let resize: ResizeObserver | undefined;
  const cleanup = () => {
    for (const stop of [() => abort.abort(), () => resize?.disconnect(), () => cancelAnimationFrame(frame), () => clearTimeout(wheelIdle)]) { try { stop(); } catch { /* Release the other optional resources as well. */ } }
    delete root.dataset.ringReady;
    cards.forEach(card => { card.removeAttribute("aria-hidden"); card.inert = false; for (const property of ["transform", "opacity", "filter"]) card.style.removeProperty(property); });
    track.style.transform = ""; stage.classList.remove("is-dragging");
  };
  try {
    stage.addEventListener("pointerdown", event => {
      if (event.button !== 0 || !event.isPrimary || (event.target instanceof Element && event.target.closest("iframe"))) return;
      cancelAnimationFrame(frame); frame = 0; target = null; velocity = 0; suppressClick = false;
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, last: event.clientX, time: performance.now(), moved: 0 };
    }, { signal });
    stage.addEventListener("pointermove", event => {
      if (!drag || event.pointerId !== drag.id) return;
      const dx = event.clientX - drag.last, now = performance.now();
      drag.moved = Math.max(drag.moved, Math.abs(event.clientX - drag.x));
      // Yield vertical gestures to native mobile scrolling before taking capture.
      if (drag.moved <= 4) return;
      if (Math.abs(event.clientY - drag.y) > drag.moved && !stage.hasPointerCapture(drag.id)) { drag = null; return; }
      if (!stage.hasPointerCapture(drag.id)) stage.setPointerCapture(drag.id);
      stage.classList.add("is-dragging"); suppressClick = true; onTurn();
      const delta = dx * 0.26;
      angle += delta; velocity = 0.75 * velocity + 0.25 * delta * 16 / Math.max(1, now - drag.time);
      drag.last = event.clientX; drag.time = now; render();
    }, { signal });
    function release(event: PointerEvent) {
      if (!drag || event.pointerId !== drag.id) return;
      const ended = drag; drag = null; stage.classList.remove("is-dragging");
      if (stage.hasPointerCapture(ended.id)) stage.releasePointerCapture(ended.id);
      if (event.type === "pointerup" && ended.moved <= 4) {
        const side = cards.findIndex((card, i) => { const r = card.getBoundingClientRect(); return i !== current && Number(card.style.opacity) > 0.3 && event.clientX >= r.left && event.clientX <= r.right && event.clientY >= r.top && event.clientY <= r.bottom; });
        if (side >= 0) { suppressClick = true; face(side); return; }
      }
      if (event.type !== "pointerup" || reduce.matches || Math.abs(velocity) < 0.2) settle(Math.round(angle / step) * step);
      else { lastFrame = 0; frame = requestAnimationFrame(tick); }
    }
    window.addEventListener("pointerup", release, { signal });
    window.addEventListener("pointercancel", release, { signal });
    stage.addEventListener("click", event => { if (suppressClick) { event.preventDefault(); event.stopPropagation(); suppressClick = false; } }, { capture: true, signal });
    stage.addEventListener("keydown", event => {
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); stepBy(event.key === "ArrowRight" ? 1 : -1); }
    }, { signal });
    stage.addEventListener("wheel", event => {
      if (event.ctrlKey || Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      event.preventDefault();
      cancelAnimationFrame(frame); frame = 0; target = null; velocity = 0;
      onTurn(); angle -= event.deltaX * 0.22;
      if (reduce.matches) settle(Math.round(angle / step) * step); else render();
      clearTimeout(wheelIdle); wheelIdle = window.setTimeout(() => settle(Math.round(angle / step) * step), 140);
    }, { passive: false, signal });
    root.querySelectorAll<HTMLElement>(".ring-nav").forEach(button => button.addEventListener("click", () => stepBy(Number(button.dataset.dir)), { signal }));
    root.querySelectorAll<HTMLElement>(".ring-dot").forEach((button, i) => button.addEventListener("click", () => face(i), { signal }));
    reduce.addEventListener("change", () => { if (reduce.matches) { cancelAnimationFrame(frame); frame = 0; settle(target ?? Math.round(angle / step) * step); } }, { signal });
    root.dataset.ringReady = "true";
    resize = new ResizeObserver(measure); resize.observe(stage); measure();
  } catch { cleanup(); onFront(0); return () => {}; }
  return cleanup;
}
