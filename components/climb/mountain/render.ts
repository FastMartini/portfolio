import { mountainView, trailLength } from "./geometry";

export function createMountainRenderer(host: HTMLElement) {
  const svg = host.querySelector<SVGSVGElement>("svg.mtn");
  const distant = host.querySelectorAll<SVGSVGElement>("svg.far");
  const walked = host.querySelector<SVGPathElement>("#a-walked");
  const climber = host.querySelector<SVGGElement>("#a-climber");
  return (position: number) => {
    if (!svg || !walked || !climber) return;
    const view = mountainView(position, host.clientWidth, host.clientHeight);
    svg.style.transform = `translate(${view.x.toFixed(1)}px,${view.y.toFixed(1)}px) scale(${view.scale.toFixed(4)})`;
    distant.forEach((layer, index) => {
      layer.style.transform = `translateY(${(position * host.clientHeight * (index === 0 ? 0.45 : 0.75)).toFixed(1)}px)`;
    });
    walked.setAttribute("stroke-dashoffset", (trailLength * (1 - position)).toFixed(1));
    climber.setAttribute("transform", `translate(${view.point[0].toFixed(1)} ${view.point[1].toFixed(1)})`);
    host.dataset.ready = "true";
  };
}
