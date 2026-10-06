import { MountainViewport } from "./MountainViewport";
import { buildMountainMarkup } from "./mountain/scene";

import "./mountain.css";

// Kept outside the Client Component graph: the thousands of SVG nodes are
// rendered as server content, not regenerated during hydration or resizing.
const markup = buildMountainMarkup();

export function Mountain({ trailPosition = 0 }: { trailPosition?: number }) {
  return (
    <MountainViewport trailPosition={trailPosition}>
      <div className="climb-mountain-art" dangerouslySetInnerHTML={{ __html: markup }} />
    </MountainViewport>
  );
}

export function MountainArt() {
  return (
    <div className="climb-mountain">
      <div className="climb-mountain-art" dangerouslySetInnerHTML={{ __html: markup }} />
    </div>
  );
}
