import { mountainView, trailLength } from "./geometry";
import { createMountainLayers } from "./layers";

export function createMountainRenderer(host: HTMLElement) {
  const svg = host.querySelector<SVGSVGElement>("svg.mtn");
  const distant = host.querySelectorAll<SVGSVGElement>("svg.far");
  const walked = host.querySelector<SVGPathElement>("#a-walked");
  const climber = host.querySelector<SVGGElement>("#a-climber");
  const camera = document.createElement("div");
  camera.className = "climb-vector-camera";
  const originalTransform = svg?.style.transform ?? "";
  if (svg) {
    svg.style.transform = "";
    svg.replaceWith(camera);
    camera.append(svg);
  }
  const layers = svg ? createMountainLayers(svg, camera) : null;
  let lastPosition = -1, lastWidth = -1, lastHeight = -1;
  let cameraTransform = "", dashOffset = "", climberTransform = "";
  const distantTransforms: string[] = [];
  return { render(position: number) {
    if (!svg || !walked || !climber) return;
    const width = host.clientWidth, height = host.clientHeight;
    // Native scrolling still delivers events during a stop's dwell. Keep its
    // cached vector paint intact until the pose or viewport actually changes.
    if (position === lastPosition && width === lastWidth && height === lastHeight) return;
    lastPosition = position; lastWidth = width; lastHeight = height;
    if (width && height) layers?.measure();
    const view = mountainView(position, width, height);
    const nextCamera = `translate(${view.x.toFixed(1)}px,${view.y.toFixed(1)}px) scale(${view.scale.toFixed(4)})`;
    if (cameraTransform !== nextCamera) { camera.style.transform = nextCamera; cameraTransform = nextCamera; }
    distant.forEach((layer, index) => {
      const next = `translateY(${(position * height * (index === 0 ? 0.45 : 0.75)).toFixed(1)}px)`;
      if (distantTransforms[index] !== next) { layer.style.transform = next; distantTransforms[index] = next; }
    });
    const nextDash = (trailLength * (1 - position)).toFixed(1);
    if (dashOffset !== nextDash) { walked.setAttribute("stroke-dashoffset", nextDash); dashOffset = nextDash; }
    const nextClimber = `translate(${view.point[0].toFixed(1)} ${view.point[1].toFixed(1)})`;
    if (climberTransform !== nextClimber) { climber.setAttribute("transform", nextClimber); climberTransform = nextClimber; }
    if (host.dataset.ready !== "true") host.dataset.ready = "true";
  }, dispose() {
    layers?.dispose();
    if (svg) { camera.replaceWith(svg); svg.style.transform = originalTransform; }
  } };
}
