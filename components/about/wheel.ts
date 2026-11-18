// Requested List View wheel feel. One switch keeps this easy to disable.
export const GENTLE_WHEEL = true;
export function mountGentleWheel(main: HTMLElement, reduce: MediaQueryList, signal: AbortSignal) {
  let target = scrollY, position = scrollY, frame = 0, last = 0;
  const stop = () => { cancelAnimationFrame(frame); frame = 0; last = 0; };
  function glide(now: number) {
    const dt = Math.min(64, now - (last || now - 16)); last = now;
    // Keep subpixel progress independently of engines that round scrollY.
    position += (target - position) * (1 - Math.exp(-dt / 160));
    if (Math.abs(target - position) < 0.5) position = target;
    window.scrollTo(0, position);
    frame = position !== target ? requestAnimationFrame(glide) : 0;
  }
  window.addEventListener("wheel", event => {
    if (!GENTLE_WHEEL || reduce.matches || event.ctrlKey || event.defaultPrevented || Math.abs(event.deltaX) > Math.abs(event.deltaY)
      || document.documentElement.dataset.splash === "active" || document.querySelector("body > .splash--list, body > .splash--climb") || !main.offsetWidth) { stop(); return; }
    // Leave player controls, open Case Studies and nested scrolling surfaces native.
    if (!(event.target instanceof Element) || !event.target.closest(".list-sections") || event.target.closest("iframe, input, textarea, select, [role='dialog']")) return;
    for (let at: Element | null = event.target; at && at !== main; at = at.parentElement) {
      if (/(auto|scroll)/.test(getComputedStyle(at).overflowY) && at.scrollHeight > at.clientHeight) return;
    }
    if (!event.cancelable) return;
    event.preventDefault();
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1;
    if (!frame) target = position = scrollY;
    target = Math.max(0, Math.min(document.documentElement.scrollHeight - innerHeight, target + event.deltaY * unit * 0.55));
    if (!frame) { last = 0; frame = requestAnimationFrame(glide); }
  }, { passive: false, signal });
  window.addEventListener("pointerdown", stop, { signal });
  window.addEventListener("keydown", stop, { signal });
  window.addEventListener("touchstart", stop, { passive: true, signal });
  window.addEventListener("hashchange", stop, { signal });
  reduce.addEventListener("change", stop, { signal });
  signal.addEventListener("abort", stop, { once: true });
}
