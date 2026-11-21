import { WaypointContent } from "./waypoint-content";
import { InlineCaseStudies } from "./climb/CaseStudies";

import { JourneyRidge, WaypointTrail } from "./journey-ridge";
import { waypoints } from "../content/waypoints";
import { TrailheadArt } from "./trailhead-art";
import { contactEmail, contactLinks, summitRegister } from "../content/contact";
import { PortfolioLink } from "./portfolio-link";
import { ResumeLink } from "./resume-link";
import { About } from "./about/About";
import { listTrailheadIntro } from "../content/trailhead";
import { SummitRegister } from "./summit/SummitRegister";

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path d="M4 10h11M11 5l5 5-5 5" />
    </svg>
  );
}

function Waypoint({ waypoint }: { waypoint: (typeof waypoints)[number] }) {
  return (
    <article
      className={`waypoint waypoint-${waypoint.tier}`}
      id={waypoint.slug}
      data-waypoint-slug={waypoint.slug}
      data-waypoint-tier={waypoint.tier}
      aria-labelledby={`${waypoint.slug}-title`}
    >
      <WaypointTrail alternate={waypoint.order % 2 === 0} />
      <a
        className="waypoint-index waypoint-marker"
        href={`#${waypoint.slug}`}
        aria-label={`Go to Waypoint ${String(waypoint.order).padStart(2, "0")}: ${waypoint.name}`}
        data-waypoint-marker
      >
        {String(waypoint.order).padStart(2, "0")}
      </a>

      <WaypointContent waypoint={waypoint} titleId={`${waypoint.slug}-title`} />
    </article>
  );
}

// The durable content layer: keep this component server-rendered and complete
// without JavaScript while the illustrated Climb is added as an enhancement.
export function ListView() {
  const [greeting, name] = listTrailheadIntro.heading.split(", ");
  return (
    <div className="list-view" id="list-view" tabIndex={-1}>
      <div className="list-sections">
      <section className="trailhead" id="trailhead" aria-labelledby="trailhead-title">
        <TrailheadArt />
        <div className="trailhead-copy">
          <p className="eyebrow">
            <span aria-hidden="true" /> Trailhead
          </p>
          <h1 id="trailhead-title">
            <span className="trailhead-title-line">{greeting},</span>{" "}
            <span className="trailhead-title-line">{name}</span>
          </h1>
          <p className="trailhead-lead">
            {listTrailheadIntro.lead}
            <span className="trailhead-surprise">Click the contour lines for a little surprise.</span>
          </p>
          <div className="trailhead-actions">
            <ResumeLink className="button button-primary">
              Resume
            </ResumeLink>
            <a className="button button-secondary" href="#summit">
              Contact me
            </a>
          </div>
        </div>

        <a className="scroll-cue" href="#about">
          <span>Begin the journey</span>
          <span aria-hidden="true">↓</span>
        </a>
      </section>

      <About />

      <section className="work" id="work" aria-labelledby="work-title">
        <JourneyRidge />
        <div className="section-kicker section-kicker-dark">
          <span>02</span>
          <span>Selected Work</span>
        </div>
        <div className="work-heading">
          <div>
            <p className="handwritten">Evidence along the ascent</p>
            <h2 id="work-title">Built, tested, and learned in public.</h2>
          </div>
          <p>
            Six Waypoints, ordered by the strength of the signal rather than the
            date. Each separates my contribution from the wider team and keeps
            its claims within the available evidence.
          </p>
        </div>

        <div className="waypoint-list">
          {waypoints.map((waypoint) => (
            <Waypoint key={waypoint.slug} waypoint={waypoint} />
          ))}
        </div>
      </section>

      <section className="summit" id="summit" aria-labelledby="summit-title">
        <JourneyRidge summit />
        <div className="section-kicker">
          <span>03</span>
          <span>Contact</span>
        </div>
        <div className="summit-top">
          <div className="summit-heading">
            <p className="handwritten">The next ascent</p>
            <h2 id="summit-title">Let&apos;s build what comes next.</h2>
            <p>
              If you’re assembling a team, shaping an ambitious product, or want
              to compare notes, I’d be glad to hear from you.
            </p>
          </div>
          <SummitRegister />
        </div>
        {process.env.NEXT_PUBLIC_WEB3FORMS_KEY?.trim() && <p id="summit-sent" className="summit-sent-note" tabIndex={-1}>{summitRegister.sent.native}</p>}
        <aside className="summit-elsewhere" aria-labelledby="summit-elsewhere-title">
          <h3 id="summit-elsewhere-title">Elsewhere on the trail</h3>
          <nav className="contact-list" aria-label="Diego’s profiles and résumé">
            {contactLinks.map((link, index) => (
              <PortfolioLink href={link.href} key={link.label}>
                <span className="contact-number">0{index + 1}</span>
                <span className="contact-label">{link.label}</span>
                <span className="contact-detail">{link.detail}</span>
                <ArrowIcon />
              </PortfolioLink>
            ))}
            <ResumeLink className="">
              <span className="contact-number">0{contactLinks.length + 1}</span>
              <span className="contact-label">Resume</span>
              <span className="contact-detail">PDF résumé</span>
              <ArrowIcon />
            </ResumeLink>
          </nav>
          <p className="summit-direct">Prefer your own inbox? Write to <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.</p>
        </aside>
      </section>
      </div>
      <InlineCaseStudies />
    </div>
  );
}
