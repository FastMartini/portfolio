import { journeyStops } from "../../content/journey";
import { smooth } from "./progress";
import type { ClimbFrame } from "./progress";

export function createHudRenderer(stage: HTMLElement, header: HTMLElement | null) {
  // The Trailhead portrait shares the card's scroll-driven fade and visibility.
  const cards = stage.querySelectorAll<HTMLElement>("[data-card], [data-photo-stop]");
  const rail = stage.querySelectorAll<HTMLButtonElement>("[data-rail]");
  const links = header?.querySelectorAll<HTMLAnchorElement>("nav a");
  return ({ u, nearest }: ClimbFrame) => {
    links?.forEach((link) => {
      if (link.hash === `#${journeyStops[nearest].navigation}`) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
    cards.forEach((card) => {
      const opacity = 1 - smooth(0.08, 0.47, Math.abs(u - Number(card.dataset.card ?? card.dataset.photoStop)));
      const active = opacity > 0.35;
      card.style.opacity = opacity.toFixed(3);
      // Finish the visual fade after the card stops accepting interaction.
      card.dataset.visible = String(opacity > 0);
      card.dataset.active = String(active);
      card.inert = !active;
      card.setAttribute("aria-hidden", String(!active));
    });
    rail.forEach((button) => {
      if (Number(button.dataset.rail) === nearest) button.setAttribute("aria-current", "step");
      else button.removeAttribute("aria-current");
    });
  };
}
