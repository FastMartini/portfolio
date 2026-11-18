import { waypoints } from "./waypoints";

export type JourneySection = {
  id: string;
  label: string;
  elevation: string;
  navigation?: string;
  trailPosition: number;
};

const workElevations = [
  "First ridge",
  "Pine line",
  "Open slope",
  "Ridgeline",
  "Upper ridge",
  "High pass",
] as const;

// Exact STOP_T values from docs/handoff/reference/climb.js. Selected Work is a
// List View heading, not an extra stop on the illustrated trail.
const waypointTrailPositions = [0.17, 0.28, 0.39, 0.5, 0.61, 0.71] as const;

export const journeyStops: readonly JourneySection[] = [
  { id: "trailhead", label: "Trailhead", elevation: "Starting ground", trailPosition: 0 },
  { id: "about", label: "Base camp", elevation: "About", navigation: "about", trailPosition: 0.07 },
  ...waypoints.map((waypoint, index) => ({
    id: waypoint.slug,
    label: waypoint.name,
    elevation: workElevations[index],
    navigation: "work",
    trailPosition: waypointTrailPositions[index],
  })),
  { id: "summit", label: "Summit", elevation: "Contact", navigation: "summit", trailPosition: 1 },
];

export const summitStopIndex = journeyStops.length - 1;

// Full-text section navigation is separate from the nine-stop Trail Rail:
// Selected Work is a List View heading, not an extra illustrated stop.
export const journeySections: readonly JourneySection[] = [
  journeyStops[0],
  { ...journeyStops[1], label: "About", elevation: "Base camp" },
  { id: "work", label: "Selected Work", elevation: "Lower slopes", navigation: "work", trailPosition: waypointTrailPositions[0] },
  ...journeyStops.slice(2, -1),
  { ...journeyStops[summitStopIndex], label: "Contact", elevation: "Summit · Looking ahead" },
];
