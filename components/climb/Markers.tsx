import { waypoints } from "../../content/waypoints";
import { journeyStops } from "../../content/journey";

export function Markers({ openStop }: { openStop: number | null }) {
  return <div className="climb-markers">
    {waypoints.map((waypoint, index) => <button type="button" className="climb-marker" key={waypoint.slug}
      data-marker={index + 2} data-hidden="true" data-open={openStop === index + 2} hidden tabIndex={-1}
      aria-label={`Open Waypoint ${String(waypoint.order).padStart(2, "0")}: ${waypoint.name}`}
      aria-controls="waypoint-panel" aria-expanded={openStop === index + 2}>
      <span className="climb-marker-pin" aria-hidden="true">{String(waypoint.order).padStart(2, "0")}</span>
      <span className="climb-marker-label" aria-hidden="true">{waypoint.name}<small>{journeyStops[index + 2].elevation}</small></span>
    </button>)}
  </div>;
}
