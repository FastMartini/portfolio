import { waypoints } from "../content/waypoints";
import { PortfolioLink } from "./portfolio-link";

function ArrowIcon() {
  return <svg aria-hidden="true" viewBox="0 0 20 20"><path d="M4 10h11M11 5l5 5-5 5" /></svg>;
}

// One canonical rendering for the List View and Waypoint Panel.
export function WaypointContent({ waypoint, titleId }: { waypoint: (typeof waypoints)[number]; titleId: string }) {
  const tierLabel = waypoint.tier === "case-study" ? "Full Case Study" : "Compact Waypoint";
  return <>
      <div className="waypoint-story">
        <div className="waypoint-meta">
          <span>{tierLabel}</span>
          <span>{waypoint.period}</span>
        </div>
        <h3 id={titleId}>{waypoint.name}</h3>
        <p className="waypoint-summary">{waypoint.summary}</p>
        <p className="waypoint-purpose">{waypoint.purpose}</p>

        {waypoint.technologies.length > 0 ? (
          <ul className="technology-list" aria-label={`${waypoint.name} technologies`}>
            {waypoint.technologies.map((technology) => (
              <li key={technology}>{technology}</li>
            ))}
          </ul>
        ) : null}

        {waypoint.links.length > 0 || "caseStudyHref" in waypoint ? (
          <div className="waypoint-links" aria-label={`${waypoint.name} public links`}>
            {"caseStudyHref" in waypoint ? (
              <a href={`#case-${waypoint.slug}`} data-read-case={waypoint.slug}>
                Read case study <ArrowIcon />
              </a>
            ) : null}
            {waypoint.links.map((link) => (
              <PortfolioLink href={link.href} key={link.href}>
                {link.label} <ArrowIcon />
              </PortfolioLink>
            ))}
          </div>
        ) : null}
      </div>

      <div className="waypoint-details">
        <dl className="waypoint-attribution">
          <div>
            <dt>Role</dt>
            <dd>{waypoint.role}</dd>
          </div>
          <div>
            <dt>Team</dt>
            <dd>{waypoint.team}</dd>
          </div>
        </dl>
        <p className="waypoint-owned">{waypoint.owned}</p>

        <div className="waypoint-outcomes">
          <p>Outcomes</p>
          <ul>
            {waypoint.outcomes.map((outcome) => (
              <li key={outcome}>{outcome}</li>
            ))}
          </ul>
        </div>

        <div className="waypoint-evidence">
          <p>{waypoint.evidence.label}</p>
          <strong>{waypoint.evidence.detail}</strong>
        </div>

        {"privacy" in waypoint ? (
          <div className="waypoint-privacy">
            <span>{waypoint.privacy.label}</span>
            <p>{waypoint.privacy.publicNote}</p>
          </div>
        ) : null}
      </div>

  </>;
}
