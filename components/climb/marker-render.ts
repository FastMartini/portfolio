import { landmarkAnchors } from "./mountain/landmarks";
import { mountainView } from "./mountain/geometry";
import { journeyStops } from "../../content/journey";
import type { ClimbFrame } from "./progress";

export function setLandmarkHot(stage: HTMLElement, stop: number, hot: boolean) {
  stage.querySelector<HTMLElement>(`[data-marker="${stop}"]`)?.setAttribute("data-hot", String(hot));
  stage.querySelector(`.lm[data-stop="${stop}"]`)?.classList.toggle("is-hot", hot);
}

export function createMarkerRenderer(stage: HTMLElement) {
  const markers = Array.from(stage.querySelectorAll<HTMLButtonElement>("[data-marker]"));
  return ({ position, nearest, u }: ClimbFrame) => {
    const view = mountainView(position, stage.clientWidth, stage.clientHeight);
    markers.forEach((marker, index) => {
      const anchor = landmarkAnchors[index], stop = index + 2;
      const x = view.x + anchor[0] * view.scale - 22;
      const y = view.y + anchor[1] * view.scale - 50;
      const visible = x >= 0 && x + 44 <= stage.clientWidth && y >= 76 && y + 44 <= stage.clientHeight;
      marker.hidden = !visible; marker.tabIndex = visible ? 0 : -1;
      marker.dataset.hidden = String(!visible);
      marker.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
      marker.dataset.current = String(stop === nearest && Math.abs(u - nearest) < 0.3);
      marker.dataset.visited = String(journeyStops[stop].trailPosition <= position + 0.005);
    });
  };
}
