import { journeyStops } from "../../content/journey";
import { smooth } from "./progress";
import type { ClimbFrame } from "./progress";

export function createHudRenderer(stage: HTMLElement, header: HTMLElement | null) {
  // The Trailhead portrait shares the card's scroll-driven fade and visibility.
  const cards = stage.querySelectorAll<HTMLElement>("[data-card], [data-photo-stop]");
  const rail = stage.querySelectorAll<HTMLButtonElement>("[data-rail]");
  const links = header?.querySelectorAll<HTMLAnchorElement>("nav a");
  const sign = stage.querySelector<HTMLElement>(".climb-trail-sign");
  const place = sign?.querySelector<HTMLElement>(".climb-sign-place");
  const name = sign?.querySelector<HTMLElement>(".climb-sign-name");
  const open = sign?.querySelector<HTMLButtonElement>(".climb-sign-open");
  let lastAnnouncement = "";
  return ({ u, nearest }: ClimbFrame) => {
    const distance = Math.abs(u - nearest), waypoint = nearest >= 2 && nearest <= 7;
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
    if (!sign || !place || !name || !open) return;
    const hidden = !waypoint && distance < 0.47;
    sign.style.opacity = (waypoint ? 1 - 0.55 * smooth(0.08, 0.47, distance) : 0.45).toFixed(3);
    sign.dataset.hidden = String(hidden); sign.inert = hidden;
    sign.setAttribute("aria-hidden", String(hidden));
    const stop = journeyStops[nearest];
    const settled = waypoint && distance < 0.3;
    const next = journeyStops[Math.min(journeyStops.length - 1, Math.floor(u) + 1)];
    const text = settled ? stop.label : `Climbing toward ${next.label}`;
    if (lastAnnouncement !== text) {
      place.textContent = settled ? `Waypoint ${String(nearest - 1).padStart(2, "0")} of 06, ${stop.elevation}` : "On the trail";
      name.textContent = text; lastAnnouncement = text;
    }
    open.hidden = !settled;
    open.dataset.openStop = String(nearest);
  };
}
