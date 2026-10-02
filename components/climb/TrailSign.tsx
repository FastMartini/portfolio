export function TrailSign() {
  return (
    <div className="climb-trail-sign" data-hidden="true" inert aria-hidden="true" aria-live="polite">
      <div><p className="climb-sign-place">Trailhead</p><p className="climb-sign-name">Starting ground</p></div>
      <a className="button button-primary climb-sign-open" href="#momentumx" hidden>Open Waypoint →</a>
    </div>
  );
}
