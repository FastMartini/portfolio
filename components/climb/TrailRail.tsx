import { journeyStops } from "../../content/journey";

export function TrailRail() {
  return (
    <nav className="climb-rail" aria-label="Trail stops">
      <ol>
        {journeyStops.map((stop, index) => ({ stop, index })).reverse().map(({ stop, index }) => (
          <li key={stop.id}>
            <button type="button" data-goto={index} data-rail={index} data-waypoint={index >= 2 && index <= 7 ? true : undefined}
              aria-label={`Go to ${index >= 2 && index <= 7 ? `Waypoint ${String(index - 1).padStart(2, "0")}: ` : ""}${stop.label}`} title={stop.label}>
              <span aria-hidden="true" />
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
