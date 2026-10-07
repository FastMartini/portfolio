import { TrailheadPhoto } from "../trailhead-photo";
import { contactLinks } from "../../content/contact";

export function StopCards() {
  return (
    <div className="climb-cards">
      <article className="climb-card" data-card="0" inert aria-hidden="true">
        <p className="climb-card-place">Trailhead</p>
        <h1>Software engineer building intelligent, data-driven products.</h1>
        <p>From research and systems to polished user experiences, I follow ideas all the way from first question to thoughtful product.</p>
        <p className="climb-card-hint">Scroll to start climbing. Each Waypoint on the trail is a project you can open.</p>
        <div className="climb-card-actions">
          <button className="button button-primary" type="button" data-goto="2">Start the climb →</button>
          <button className="button button-secondary" type="button" data-goto="9">Contact me</button>
        </div>
        <span className="resume-note">Résumé — coming soon</span>
      </article>
      <figure className="climb-portrait" data-photo-stop="0" inert aria-hidden="true">
        <TrailheadPhoto />
      </figure>
      <article className="climb-card" data-card="1" inert aria-hidden="true">
        <p className="climb-card-place">Base camp</p>
        <h2>Engineering with intent.</h2>
        <p className="climb-card-lead">I’m Diego, a software engineer who likes turning ambitious ideas into useful, understandable products. I work across research, systems, and interfaces—wherever the problem needs me.</p>
        <p>I care about thoughtful systems, clear experiences, and the small decisions that make software feel considered from end to end.</p>
      </article>
      <article className="climb-card" data-card="8" inert aria-hidden="true">
        <p className="climb-card-place">A quiet overlook</p>
        <h2>Beyond the build.</h2>
        <p>Outside software, I spend time playing blues and electric guitar. It’s a different way to practice listening, timing, and leaving room for what comes next.</p>
      </article>
      <article className="climb-card" data-card="9" inert aria-hidden="true">
        <p className="climb-card-place">Summit</p>
        <h2>Let&apos;s build what comes next.</h2>
        <p>If you’re assembling a team, shaping an ambitious product, or want to compare notes, I’d be glad to hear from you.</p>
        <ul className="climb-card-contact">
          {contactLinks.map((link) => (
            <li key={link.label}><a href={link.href}><span>{link.label}</span><small>{link.detail}</small></a></li>
          ))}
        </ul>
      </article>
    </div>
  );
}
