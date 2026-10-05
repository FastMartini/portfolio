import { PortfolioHeader, SkipLink } from "../components/portfolio-shell";
import { ListNavigation } from "../components/list-navigation";
import { ListView } from "../components/list-view";
import { journeySections } from "../content/journey";
import { Climb } from "../components/climb/Climb";
import { MountainArt } from "../components/climb/Mountain";
import { StopCards } from "../components/climb/StopCards";
import { WaypointContent } from "../components/waypoint-content";
import { caseStudySlots } from "../components/climb/CaseStudies";
import { waypoints } from "../content/waypoints";

import "./ascent.css";

const homeNavigation = [
  { href: "#about", label: "About" },
  { href: "#work", label: "Work" },
  { href: "#beyond-work", label: "Beyond Work" },
  { href: "#summit", label: "Contact" },
] as const;

export default function Home() {
  return (
    <Climb mountain={<MountainArt />} cards={<StopCards />}
      summaries={waypoints.map((waypoint) => <WaypointContent key={waypoint.slug} waypoint={waypoint} titleId={`panel-${waypoint.slug}-title`} />)}
      cases={caseStudySlots("panel-case-")}>
      <SkipLink href="#main-content" label="Skip to content" />
      <PortfolioHeader
        homeHref="#trailhead"
        homeAriaLabel="Diego Martinez, home"
        links={homeNavigation}
        navLabel="Primary navigation"
      />

      <ListNavigation sections={journeySections}>
        <main id="main-content">
          <ListView />
        </main>
      </ListNavigation>

      <footer>
        <p>© {new Date().getFullYear()} Diego Martinez</p>
        <a href="#trailhead">Back to the trailhead ↑</a>
      </footer>
    </Climb>
  );
}
