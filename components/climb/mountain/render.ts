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
  return { render(position: number) {
    if (!svg || !walked || !climber) return;
    const width = host.clientWidth, height = host.clientHeight;
    if (width && height) layers?.measure();
    const view = mountainView(position, width, height);
    camera.style.transform = `translate(${view.x.toFixed(1)}px,${view.y.toFixed(1)}px) scale(${view.scale.toFixed(4)})`;
    distant.forEach((layer, index) => {
      layer.style.transform = `translateY(${(position * height * (index === 0 ? 0.45 : 0.75)).toFixed(1)}px)`;
    });
    walked.setAttribute("stroke-dashoffset", (trailLength * (1 - position)).toFixed(1));
    climber.setAttribute("transform", `translate(${view.point[0].toFixed(1)} ${view.point[1].toFixed(1)})`);
    host.dataset.ready = "true";
  }, dispose() {
    layers?.dispose();
    if (svg) { camera.replaceWith(svg); svg.style.transform = originalTransform; }
  } };
}
