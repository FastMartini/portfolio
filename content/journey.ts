import { waypoints } from "./waypoints";

export type JourneySection = {
  id: string;
  label: string;
  elevation: string;
  navigation?: string;
};

const workElevations = [
  "First ridge",
  "Pine line",
  "Open slope",
  "Ridgeline",
  "Upper ridge",
  "High pass",
] as const;

export const journeySections: readonly JourneySection[] = [
  { id: "trailhead", label: "Trailhead", elevation: "Starting ground" },
  { id: "about", label: "About", elevation: "Base camp", navigation: "about" },
  { id: "work", label: "Selected Work", elevation: "Lower slopes", navigation: "work" },
  ...waypoints.map((waypoint, index) => ({
    id: waypoint.slug,
    label: waypoint.name,
    elevation: workElevations[index],
    navigation: "work",
  })),
  { id: "beyond-work", label: "Beyond Work", elevation: "A quiet overlook", navigation: "beyond-work" },
  { id: "summit", label: "Contact", elevation: "Summit · Looking ahead", navigation: "summit" },
];
