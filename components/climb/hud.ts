import { journeyStops } from "../../content/journey";
import { clamp } from "./mountain/geometry";
import type { ClimbFrame } from "./progress";

export function createHudRenderer(stage: HTMLElement) {
  const cards = stage.querySelectorAll<HTMLElement>("[data-card]");
  const rail = stage.querySelectorAll<HTMLButtonElement>("[data-rail]");
  const sign = stage.querySelector<HTMLElement>(".climb-trail-sign");
  const place = sign?.querySelector<HTMLElement>(".climb-sign-place");
  const name = sign?.querySelector<HTMLElement>(".climb-sign-name");
  const open = sign?.querySelector<HTMLAnchorElement>(".climb-sign-open");
  let lastAnnouncement = "";
  return ({ u, nearest }: ClimbFrame) => {
    const distance = Math.abs(u - nearest), waypoint = nearest >= 2 && nearest <= 7;
    cards.forEach((card) => {
      const opacity = clamp(1 - (Math.abs(u - Number(card.dataset.card)) - 0.22) / 0.25, 0, 1);
      const active = opacity > 0.35;
      card.style.opacity = opacity.toFixed(3);
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
    open.href = `#${stop.id}`;
  };
}
