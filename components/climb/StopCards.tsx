import { aboutTitle, baseCampStats } from "../../content/about";
import { contactEmail, contactLinks } from "../../content/contact";
import { PortfolioLink } from "../portfolio-link";
import { ResumeLink } from "../resume-link";
import { trailheadIntro } from "../../content/trailhead";
import { TeachingCarousel } from "./TeachingCarousel";
import { summitStopIndex } from "../../content/journey";

export function StopCards() {
  return (
    <div className="climb-cards" data-theme-root="">
      <article className="climb-card" data-card="0" inert aria-hidden="true">
        <p className="climb-card-place">Trailhead</p>
        <h1>{trailheadIntro.heading}</h1>
        <p className="trailhead-lead">{trailheadIntro.lead}</p>
        <p className="climb-card-hint">Scroll to start climbing. Each Waypoint on the trail is a project you can open.</p>
        <div className="climb-card-actions">
          <ResumeLink />
          <button className="button button-secondary" type="button" data-goto={summitStopIndex}>Contact me</button>
        </div>
      </article>
      <article className="climb-card" data-card="1" inert aria-hidden="true">
        <p className="climb-card-place">Base camp</p>
        <h2>{aboutTitle}</h2>
        <ul className="base-camp-stats">{baseCampStats.map(stat => <li key={stat.value}><span>{stat.value}</span><span>{stat.label}</span></li>)}</ul>
        <TeachingCarousel />
      </article>
      <article className="climb-card" data-card={summitStopIndex} inert aria-hidden="true">
        <p className="climb-card-place">Summit</p>
        <h2>Let&apos;s build what comes next.</h2>
        <p>If you’re assembling a team, shaping an ambitious product, or want to compare notes, I’d be glad to hear from you.</p>
        <a className="button button-primary" href="#summit-register">Write to Diego</a>
        <ul className="climb-card-contact">
          {contactLinks.map((link) => (
            <li key={link.label}><PortfolioLink href={link.href}><span>{link.label}</span><small>{link.detail}</small></PortfolioLink></li>
          ))}
          <li><ResumeLink className=""><span>Resume</span><small>PDF résumé</small></ResumeLink></li>
          <li><a href={`mailto:${contactEmail}`}><span>Email</span><small>{contactEmail}</small></a></li>
        </ul>
      </article>
    </div>
  );
}
