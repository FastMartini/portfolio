import { WaypointContent } from "./waypoint-content";
import { InlineCaseStudies } from "./climb/CaseStudies";

import { JourneyRidge, WaypointTrail } from "./journey-ridge";
import { waypoints } from "../content/waypoints";

const contactLinks = [
  {
    label: "Email Diego",
    detail: "diegommart2004@gmail.com",
    href: "mailto:diegommart2004@gmail.com",
  },
  {
    label: "LinkedIn",
    detail: "/in/diegomartinez30",
    href: "https://www.linkedin.com/in/diegomartinez30",
  },
  {
    label: "GitHub",
    detail: "@FastMartini",
    href: "https://github.com/FastMartini",
  },
];

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path d="M4 10h11M11 5l5 5-5 5" />
    </svg>
  );
}

function MountainStudy() {
  return (
    <svg
      aria-hidden="true"
      className="mountain-study"
      viewBox="0 0 720 660"
      preserveAspectRatio="xMidYMax meet"
    >
      <circle className="mountain-sun" cx="532" cy="138" r="72" />
      <path
        className="mountain-back"
        d="M0 523 118 410l72 47 161-250 88 137 73-67 208 246v137H0Z"
      />
      <path
        className="mountain-front"
        d="M0 576 156 446l77 63 91-112 79 73 91-164 226 270v84H0Z"
      />
      <path className="mountain-ridge" d="m324 397 45 42 34 31 91-164 48 58" />
      <g className="mountain-contours" fill="none">
        <path d="M80 622c110-32 170-4 245-65s130-16 188-81 94-14 147-3" />
        <path d="M60 645c110-32 170-4 245-65s130-16 188-81 94-14 147-3" />
        <path d="M100 598c110-32 170-4 245-65s130-16 188-81 94-14 147-3" />
      </g>
      <path className="mountain-route" d="M125 660c82-27 72-84 151-105s29-51 68-79 105-21 110-77 24-55 40-93" fill="none" />
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
  return (
    <div className="list-view" id="list-view" tabIndex={-1}>
      <div className="list-sections">
      <section className="trailhead" id="trailhead" aria-labelledby="trailhead-title">
        <div className="trailhead-copy">
          <p className="eyebrow">
            <span aria-hidden="true" /> Software engineer · Building with intention
          </p>
          <h1 id="trailhead-title">
            Software engineer building intelligent, data-driven products.
          </h1>
          <p className="trailhead-intro">
            From research and systems to polished user experiences, I follow ideas
            all the way from first question to thoughtful product.
          </p>
          <div className="trailhead-actions">
            <a className="button button-primary" href="#momentumx">
              View selected work <ArrowIcon />
            </a>
            <a className="button button-secondary" href="#summit">
              Contact me
            </a>
            <span className="resume-note">Résumé — coming soon</span>
          </div>
        </div>

        <div className="mountain-frame">
          <div className="elevation-note" aria-hidden="true">
            <span>Trailhead</span>
            <span>Field note 01</span>
          </div>
          <MountainStudy />
          <p className="mountain-caption">
            <span>Trailhead</span>
            A portfolio about the work behind the climb.
          </p>
        </div>

        <a className="scroll-cue" href="#about">
          <span>Begin the journey</span>
          <span aria-hidden="true">↓</span>
        </a>
      </section>

      <section className="about" id="about" aria-labelledby="about-title">
        <JourneyRidge />
        <div className="section-kicker">
          <span>01</span>
          <span>About</span>
        </div>
        <div className="about-copy">
          <h2 id="about-title">Engineering with intent.</h2>
          <div className="about-details">
            <p>
              I’m Diego, a software engineer who likes turning ambitious ideas
              into useful, understandable products. I work across research,
              systems, and interfaces—wherever the problem needs me.
            </p>
            <p>
              I care about thoughtful systems, clear experiences, and the small
              decisions that make software feel considered from end to end.
            </p>
          </div>
        </div>
        <p className="section-coordinate">Base camp · Beginning the ascent</p>
      </section>

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

      <section
        className="personal-interlude"
        id="beyond-work"
        aria-labelledby="beyond-work-title"
      >
        <JourneyRidge />
        <div className="section-kicker section-kicker-dark">
          <span>03</span>
          <span>Beyond Work</span>
        </div>
        <div className="interlude-grid">
          <div className="interlude-visual" aria-hidden="true">
            <span className="string string-one" />
            <span className="string string-two" />
            <span className="string string-three" />
            <span className="string string-four" />
            <span className="string string-five" />
            <span className="string string-six" />
            <span className="fret fret-one" />
            <span className="fret fret-two" />
            <span className="fret fret-three" />
            <span className="fret fret-four" />
            <span className="interlude-stamp">Six strings · endless phrasing</span>
          </div>
          <div className="interlude-copy">
            <p className="handwritten">A personal interlude</p>
            <h2 id="beyond-work-title">Beyond the build.</h2>
            <p>
              Outside software, I spend time playing blues and electric guitar.
              It’s a different way to practice listening, timing, and leaving
              room for what comes next.
            </p>
          </div>
        </div>
      </section>

      <section className="summit" id="summit" aria-labelledby="summit-title">
        <JourneyRidge summit />
        <div className="section-kicker">
          <span>04</span>
          <span>Contact</span>
        </div>
        <div className="summit-heading">
          <p className="handwritten">The next ascent</p>
          <h2 id="summit-title">Let&apos;s build what comes next.</h2>
          <p>
            If you’re assembling a team, shaping an ambitious product, or want
            to compare notes, I’d be glad to hear from you.
          </p>
        </div>
        <div className="contact-list" aria-label="Contact Diego">
          {contactLinks.map((link, index) => (
            <a href={link.href} key={link.label}>
              <span className="contact-number">0{index + 1}</span>
              <span className="contact-label">{link.label}</span>
              <span className="contact-detail">{link.detail}</span>
              <ArrowIcon />
            </a>
          ))}
        </div>
      </section>
      </div>
      <InlineCaseStudies />
    </div>
  );
}
