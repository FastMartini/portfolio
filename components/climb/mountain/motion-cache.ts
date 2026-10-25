import { trailLength } from "./geometry";
import type { mountainView } from "./geometry";

type View = ReturnType<typeof mountainView> & { position: number; width: number; height: number };
type Bounds = { x: number; y: number; width: number; height: number };
const NS = "http://www.w3.org/2000/svg";
export const MOTION_CACHE_PIXELS = 16_000_000;

function bounds(element: SVGGraphicsElement): Bounds {
  const box = element.getBBox();
  const matrix = element.transform.baseVal.consolidate()?.matrix;
  const points = [[box.x, box.y], [box.x + box.width, box.y],
    [box.x, box.y + box.height], [box.x + box.width, box.y + box.height]]
    .map(([x, y]) => matrix ? new DOMPoint(x, y).matrixTransform(matrix) : { x, y });
  // getBBox excludes blur spread. The scenery's largest blur is 14 world units.
  const x = Math.floor(Math.min(...points.map((point) => point.x))) - 64;
  const y = Math.floor(Math.min(...points.map((point) => point.y))) - 64;
  return { x, y, width: Math.ceil(Math.max(...points.map((point) => point.x))) - x + 64,
    height: Math.ceil(Math.max(...points.map((point) => point.y))) - y + 64 };
}

function frozenMountain(svg: SVGSVGElement) {
  const copy = svg.cloneNode(true) as SVGSVGElement;
  const originals = svg.querySelectorAll<SVGAnimationElement>("animate, animateMotion, animateTransform");
  const animations = copy.querySelectorAll<SVGAnimationElement>("animate, animateMotion, animateTransform");
  originals.forEach((animation, index) => {
    const original = animation.parentElement;
    const target = animations[index].parentElement;
    if (original instanceof SVGGraphicsElement && target) {
      const name = animation.getAttribute("attributeName");
      if (animation.tagName === "animateMotion" || animation.tagName === "animateTransform") {
        const parent = original.parentElement;
        if (parent instanceof SVGGraphicsElement) {
          const parentMatrix = parent.getCTM(), matrix = original.getCTM();
          if (parentMatrix && matrix) {
            const m = parentMatrix.inverse().multiply(matrix);
            target.setAttribute("transform", `matrix(${m.a} ${m.b} ${m.c} ${m.d} ${m.e} ${m.f})`);
          }
        }
      } else if (name === "fill" || name === "stroke" || name === "opacity") {
        target.setAttribute(name, getComputedStyle(original).getPropertyValue(name));
      } else if (name && name !== "d") {
        const value = Reflect.get(original, name)?.animVal?.value;
        if (typeof value === "number") target.setAttribute(name, String(value));
      }
    }
    animations[index].remove();
  });
  return copy;
}

// The live SVG remains the source of artwork and hit targets. While the camera
// moves, bounded bitmap layers avoid repainting thousands of SVG instances.
// The walked trail and climber keep updating between those layers.
export function createMotionCache(host: HTMLElement, svg: SVGSVGElement, walked: SVGPathElement, climber: SVGGElement) {
  const container = document.createElement("div");
  container.className = "climb-motion-cache";
  container.setAttribute("aria-hidden", "true");
  container.hidden = true;
  svg.after(container);
  host.dataset.cacheReady = "false";
  const originalOpacity = svg.style.opacity;
  const trail = document.createElement("canvas"), person = document.createElement("canvas");
  trail.className = "climb-motion-walked";
  person.className = "climb-motion-climber";
  const circles = Array.from(climber.querySelectorAll("circle"), (circle) => ({
    x: Number(circle.getAttribute("cx") ?? 0), y: Number(circle.getAttribute("cy") ?? 0),
    radius: Number(circle.getAttribute("r")), fill: circle.getAttribute("fill") ?? "black",
    stroke: circle.getAttribute("stroke"), width: Number(circle.getAttribute("stroke-width") ?? 1),
    opacity: Number(circle.getAttribute("opacity") ?? 1),
  }));
  let trailContext: CanvasRenderingContext2D | null = null, personContext: CanvasRenderingContext2D | null = null;
  let path: Path2D | undefined;
  let view: View | undefined, moving = false, allowed = false, ready = false, disposed = false, available = true;
  let generation = 0, preparing = "", resolution = "";

  function unavailable() {
    if (disposed) return;
    available = ready = false;
    generation++;
    preparing = "";
    host.dataset.cacheReady = "false";
    host.dataset.cacheState = "unavailable";
    apply();
  }
  trail.addEventListener("contextlost", unavailable);
  person.addEventListener("contextlost", unavailable);

  function draw(context: CanvasRenderingContext2D, canvas: HTMLCanvasElement, camera: View) {
    const ratio = Math.min(1, Math.sqrt(2_000_000 / Math.max(1, camera.width * camera.height)));
    const width = Math.max(1, Math.floor(camera.width * ratio)), height = Math.max(1, Math.floor(camera.height * ratio));
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    if (canvas.style.width !== `${camera.width}px`) canvas.style.width = `${camera.width}px`;
    if (canvas.style.height !== `${camera.height}px`) canvas.style.height = `${camera.height}px`;
    canvas.style.transform = `translate(${-camera.x / camera.scale}px,${-camera.y / camera.scale}px) scale(${1 / camera.scale})`;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, width, height);
    context.setTransform(ratio * camera.scale, 0, 0, ratio * camera.scale, ratio * camera.x, ratio * camera.y);
    context.globalAlpha = 1;
  }

  function apply() {
    const active = ready && moving && allowed && !disposed;
    if (container.hidden === active) container.hidden = !active;
    const opacity = active ? "0" : originalOpacity;
    if (svg.style.opacity !== opacity) svg.style.opacity = opacity;
    if (host.dataset.motionCache !== String(active)) host.dataset.motionCache = String(active);
    if (!view) return active;
    container.style.transform = `translate(${view.x.toFixed(1)}px,${view.y.toFixed(1)}px) scale(${view.scale.toFixed(4)})`;
    try { if (active && trailContext && personContext && path) {
      draw(trailContext, trail, view);
      trailContext.strokeStyle = walked.getAttribute("stroke") ?? "#b5653b";
      trailContext.lineWidth = Number(walked.getAttribute("stroke-width") ?? 4);
      trailContext.lineCap = "round";
      trailContext.setLineDash([trailLength, trailLength]);
      trailContext.lineDashOffset = trailLength * (1 - view.position);
      trailContext.stroke(path);
      draw(personContext, person, view);
      for (const circle of circles) {
        personContext.globalAlpha = circle.opacity;
        personContext.beginPath();
        personContext.arc(view.point[0] + circle.x, view.point[1] + circle.y, circle.radius, 0, Math.PI * 2);
        if (circle.fill !== "none") { personContext.fillStyle = circle.fill; personContext.fill(); }
        if (circle.stroke) { personContext.strokeStyle = circle.stroke; personContext.lineWidth = circle.width; personContext.stroke(); }
      }
    } } catch {
      unavailable();
      return false;
    }
    return active;
  }

  async function prepare(key: string, scale: number) {
    const token = ++generation;
    preparing = key;
    try {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      const nextTrailContext = trail.getContext("2d"), nextPersonContext = person.getContext("2d");
      if (!context || !nextTrailContext || !nextPersonContext || typeof Path2D !== "function") throw new Error("Bitmap cache unavailable");
      trailContext = nextTrailContext;
      personContext = nextPersonContext;
      path = new Path2D(walked.getAttribute("d") ?? "");
      const originalChildren = Array.from(svg.children);
      const copy = frozenMountain(svg);
      const copyChildren = Array.from(copy.children);
      const start = originalChildren.indexOf(walked) + 1, end = originalChildren.indexOf(climber);
      const foreground = copyChildren.slice(start, end);
      const layers = foreground.map((node, index) => ({ markup: node.outerHTML,
        box: bounds(originalChildren[start + index] as SVGGraphicsElement) }));
      foreground.forEach((node) => node.remove());
      copy.querySelector("#a-walked")?.remove();
      copy.querySelector("#a-climber")?.remove();
      const defs = copy.querySelector("defs")!.outerHTML;
      copy.querySelector("defs")!.remove();
      const snapshots = [{ markup: copy.innerHTML, box: bounds(svg) }, ...layers];
      const area = snapshots.reduce((sum, item) => sum + item.box.width * item.box.height, 0);
      const ratio = Math.min(1, scale, Math.sqrt(MOTION_CACHE_PIXELS / area));
      const images: HTMLImageElement[] = [];
      for (const { markup, box } of snapshots) {
        if (disposed || token !== generation) return;
        const source = new Image();
        source.src = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="${NS}" width="${box.width}" height="${box.height}" viewBox="${box.x} ${box.y} ${box.width} ${box.height}">${defs}${markup}</svg>`)}`;
        await source.decode();
        if (disposed || token !== generation) return;
        canvas.width = Math.max(1, Math.floor(box.width * ratio));
        canvas.height = Math.max(1, Math.floor(box.height * ratio));
        context.drawImage(source, 0, 0, canvas.width, canvas.height);
        const image = new Image();
        image.alt = "";
        image.src = canvas.toDataURL("image/png");
        canvas.width = canvas.height = 1;
        await image.decode();
        Object.assign(image.style, { left: `${box.x}px`, top: `${box.y}px`, width: `${box.width}px`, height: `${box.height}px` });
        images.push(image);
      }
      if (disposed || token !== generation) return;
      container.replaceChildren(images[0], trail, ...images.slice(1), person);
      resolution = key;
      ready = true;
      host.dataset.cacheReady = "true";
      host.dataset.cacheState = "ready";
      apply();
    } catch {
      // Canvas, SVG-image decoding, or bitmap export can be blocked. Keep the
      // original vector scene usable for the rest of this visit.
      if (!disposed && token === generation) unavailable();
    } finally {
      if (token === generation) preparing = "";
    }
  }

  return {
    render(next: View, state: { moving: boolean; reducedMotion: boolean }) {
      view = next;
      moving = state.moving;
      allowed = !state.reducedMotion;
      const key = next.scale.toFixed(3);
      if (allowed && available && key !== resolution && key !== preparing) void prepare(key, next.scale);
      return apply();
    },
    dispose() {
      disposed = true;
      generation++;
      trail.removeEventListener("contextlost", unavailable);
      person.removeEventListener("contextlost", unavailable);
      trail.width = trail.height = person.width = person.height = 1;
      svg.style.opacity = originalOpacity;
      container.remove();
      delete host.dataset.motionCache;
      delete host.dataset.cacheReady;
      delete host.dataset.cacheState;
    },
  };
}
