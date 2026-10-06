export function TrailSign() {
  return (
    <div className="climb-trail-sign" data-hidden="true" inert aria-hidden="true" aria-live="polite">
      <div><p className="climb-sign-place">Trailhead</p><p className="climb-sign-name">Starting ground</p></div>
      <button type="button" className="button button-primary climb-sign-open" data-open-stop="2" hidden>Open Waypoint →</button>
    </div>
  );
}
