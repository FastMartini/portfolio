export type TeachingCarouselController = {
  closePreview(index: number): void;
  dispose(): void;
};

// Auto-scroll pauses the moment a drag or swipe starts and resumes from the
// current position this long after release; another drag restarts the wait.
const resumeDelay = 3000;
const speed = 18; // Pixels per second; positive screen motion is left → right.
type Gesture = { id: number; x: number; y: number; offset: number; dragging: boolean };

export function mountTeachingCarousel(root: HTMLElement, open: (index: number) => void, deactivate: () => void): TeachingCarouselController {
  const viewport = root.querySelector<HTMLElement>(".teaching-gallery-viewport")!;
  const track = root.querySelector<HTMLElement>(".teaching-gallery-track")!;
  const original = track.querySelector<HTMLElement>('[data-copy="1"]')!;
  const card = root.closest<HTMLElement>("[data-card]")!;
  const enhancement = root.closest<HTMLElement>(".climb-enhancement")!;
  const navigation = root.closest<HTMLElement>(".climb-navigation")!;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const events = new AbortController(), options = { signal: events.signal };
  let width = 0, offset = 0, last = 0, frame = 0, wake: ReturnType<typeof setTimeout> | undefined;
  let active = false, preview = false, keyboardFocus = false, disposed = false, imagesReady = false;
  let resumeAt = 0, pointerFocusUntil = 0, suppressClick = false, gesture: Gesture | null = null;

  const wrap = (value: number) => width ? ((value % width) + width) % width : 0;
  const paint = () => {
    offset = wrap(offset);
    track.style.transform = `translate3d(${-width - offset}px, 0, 0)`;
    // Focusing an offscreen link must not add native scrolling to the transform.
    viewport.scrollLeft = 0;
  };
  const blocked = () => !active || !imagesReady || document.hidden || reduce.matches || preview || keyboardFocus || !!gesture;
  function tick(now: number) {
    frame = 0;
    if (disposed || blocked()) return;
    if (last) { offset -= Math.min(50, Math.max(0, now - last)) * speed / 1000; paint(); }
    last = now;
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(frame); frame = 0; last = 0;
    clearTimeout(wake);
    root.dataset.playback = !active ? "inactive" : reduce.matches ? "reduced" : blocked() || performance.now() < resumeAt ? "paused" : "running";
    if (disposed || blocked() || !width) return;
    const delay = resumeAt - performance.now();
    if (delay > 0) wake = setTimeout(sync, delay);
    else frame = requestAnimationFrame(tick);
  }
  function rest() { resumeAt = performance.now() + resumeDelay; sync(); }
  function release() {
    const pointer = gesture; gesture = null;
    root.removeAttribute("data-dragging");
    if (pointer && viewport.hasPointerCapture(pointer.id)) viewport.releasePointerCapture(pointer.id);
  }
  function updateActive() {
    const next = card.dataset.active === "true" && !enhancement.hidden && !navigation.inert;
    if (next === active) return;
    active = next;
    if (!active) { release(); if (preview) deactivate(); }
    else if (!imagesReady) {
      const images = [...track.querySelectorAll("img")];
      images.forEach(image => { image.loading = "eager"; });
      void Promise.all(images.map(image => image.decode().catch(() => {}))).then(() => {
        if (!disposed) { imagesReady = true; sync(); }
      });
    }
    sync();
  }
  function measure() {
    const previous = width;
    width = original.getBoundingClientRect().width;
    if (previous) offset *= width / previous;
    paint(); sync();
  }
  root.dataset.ready = "true";
  const resize = new ResizeObserver(measure);
  resize.observe(original);
  const visibility = new MutationObserver(updateActive);
  visibility.observe(card, { attributes: true, attributeFilter: ["data-active"] });
  visibility.observe(enhancement, { attributes: true, attributeFilter: ["hidden"] });
  visibility.observe(navigation, { attributes: true, attributeFilter: ["inert"] });

  viewport.addEventListener("pointerdown", event => {
    if (!event.isPrimary || event.button !== 0 || !active || preview) return;
    pointerFocusUntil = performance.now() + 150;
    keyboardFocus = false; suppressClick = false;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, offset, dragging: false };
    sync();
  }, options);
  window.addEventListener("pointermove", event => {
    if (!gesture || event.pointerId !== gesture.id) return;
    const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
    if (!gesture.dragging) {
      if (Math.hypot(dx, dy) <= 8) return;
      suppressClick = true;
      if (Math.abs(dy) > Math.abs(dx)) { release(); rest(); return; }
      gesture.dragging = true;
      viewport.setPointerCapture(event.pointerId);
      root.dataset.dragging = "true";
    }
    event.preventDefault();
    offset = gesture.offset - dx; paint();
  }, { ...options, passive: false });
  window.addEventListener("pointerup", event => {
    if (gesture?.id !== event.pointerId) return;
    // Browsers can drop a coalesced pointermove when the release arrives, so
    // land the drag on the release point instead of the last painted move.
    if (gesture.dragging) { offset = gesture.offset - (event.clientX - gesture.x); paint(); }
    suppressClick ||= gesture.dragging || Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 8;
    release(); rest();
  }, options);
  window.addEventListener("pointercancel", event => {
    if (gesture?.id !== event.pointerId) return;
    suppressClick = true; release(); rest();
  }, options);
  // Touch input is implicitly captured by the photo under the finger; moving
  // capture to the viewport fires lostpointercapture there, which bubbles here.
  // Only losing the viewport's own capture ends the gesture.
  viewport.addEventListener("lostpointercapture", event => {
    if (event.target !== viewport || gesture?.id !== event.pointerId) return;
    suppressClick = true; release(); rest();
  }, options);
  window.addEventListener("blur", () => { suppressClick = true; release(); rest(); }, options);
  viewport.addEventListener("dragstart", event => event.preventDefault(), options);
  viewport.addEventListener("click", event => {
    const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("[data-photo-index]") : null;
    if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    event.preventDefault();
    if (suppressClick && event.detail !== 0) { suppressClick = false; event.stopPropagation(); return; }
    preview = true; release(); sync();
    open(Number(link.dataset.photoIndex));
  }, { ...options, capture: true });
  viewport.addEventListener("keydown", event => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    keyboardFocus = true;
    const photos = original.querySelectorAll<HTMLElement>("[data-photo-index]");
    const step = photos[1].getBoundingClientRect().left - photos[0].getBoundingClientRect().left;
    offset += step * (event.key === "ArrowRight" ? 1 : -1);
    paint(); rest();
  }, options);
  viewport.addEventListener("focusin", event => {
    if (performance.now() < pointerFocusUntil || !(event.target instanceof HTMLElement) || !event.target.matches(":focus-visible")) return;
    keyboardFocus = true;
    const link = event.target.closest<HTMLElement>('[data-copy="1"] [data-photo-index]');
    if (link) { offset = link.getBoundingClientRect().left - original.getBoundingClientRect().left; paint(); }
    sync();
  }, options);
  viewport.addEventListener("focusout", event => {
    if (event.relatedTarget instanceof Node && viewport.contains(event.relatedTarget)) return;
    keyboardFocus = false; rest();
  }, options);
  viewport.addEventListener("wheel", event => {
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.shiftKey ? event.deltaY : 0;
    if (!delta) return;
    event.preventDefault(); offset += delta; paint(); rest();
  }, { ...options, passive: false });
  reduce.addEventListener("change", sync, options);
  document.addEventListener("visibilitychange", () => { release(); sync(); }, options);
  measure(); updateActive();

  return {
    closePreview(index) {
      const link = original.querySelector<HTMLElement>(`[data-photo-index="${index}"]`);
      if (active && link) {
        offset = link.getBoundingClientRect().left - original.getBoundingClientRect().left;
        paint();
        pointerFocusUntil = performance.now() + 150;
        link.focus({ preventScroll: true });
      }
      preview = false; keyboardFocus = false; rest();
    },
    dispose() {
      disposed = true;
      for (const stop of [release, () => events.abort(), () => resize.disconnect(), () => visibility.disconnect(), () => cancelAnimationFrame(frame), () => clearTimeout(wake)]) {
        try { stop(); } catch { /* Release the other resources after an optional API failure. */ }
      }
      track.style.removeProperty("transform");
      delete root.dataset.ready; delete root.dataset.playback;
    },
  };
}
