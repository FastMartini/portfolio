import { PortfolioHeader, SkipLink } from "../components/portfolio-shell";
import { Ascent } from "../components/ascent";
import { ListView } from "../components/list-view";
import { journeySections } from "../content/journey";

import "./ascent.css";

const homeNavigation = [
  { href: "#about", label: "About" },
  { href: "#work", label: "Work" },
  { href: "#beyond-work", label: "Beyond Work" },
  { href: "#summit", label: "Contact" },
] as const;

export default function Home() {
  return (
    <>
      <SkipLink href="#main-content" label="Skip to content" />
      <PortfolioHeader
        homeHref="#trailhead"
        homeAriaLabel="Diego Martinez, home"
        links={homeNavigation}
        navLabel="Primary navigation"
      />

      <Ascent sections={journeySections}>
        <ListView />
      </Ascent>

      <footer>
        <p>© {new Date().getFullYear()} Diego Martinez</p>
        <a href="#trailhead">Back to the trailhead ↑</a>
      </footer>
    </>
  );
}
