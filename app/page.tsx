import { PortfolioHeader, SkipLink } from "../components/portfolio-shell";
import { Ascent } from "../components/ascent";
import { ListView } from "../components/list-view";
import { journeySections } from "../content/journey";
import { Climb } from "../components/climb/Climb";
import { MountainArt } from "../components/climb/Mountain";
import { StopCards } from "../components/climb/StopCards";

import "./ascent.css";

const homeNavigation = [
  { href: "#about", label: "About" },
  { href: "#work", label: "Work" },
  { href: "#beyond-work", label: "Beyond Work" },
  { href: "#summit", label: "Contact" },
] as const;

export default function Home() {
  return (
    <Climb mountain={<MountainArt />} cards={<StopCards />}>
      <SkipLink href="#main-content" label="Skip to content" />
      <PortfolioHeader
        homeHref="#trailhead"
        homeAriaLabel="Diego Martinez, home"
        links={homeNavigation}
        navLabel="Primary navigation"
      />

      <Ascent sections={journeySections}>
        <main id="main-content">
          <ListView />
        </main>
      </Ascent>

      <footer>
        <p>© {new Date().getFullYear()} Diego Martinez</p>
        <a href="#trailhead">Back to the trailhead ↑</a>
      </footer>
    </Climb>
  );
}
