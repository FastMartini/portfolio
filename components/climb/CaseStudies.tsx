import Link from "next/link";
import { CaseStudyContent as MomentumX } from "../../app/work/momentumx/page.mdx";
import { CaseStudyContent as Veritas } from "../../app/work/veritas/page.mdx";
import { CaseStudyContent as Membership } from "../../app/work/membership-inference-attack/page.mdx";
import { waypoints } from "../../content/waypoints";

const cases = [MomentumX, Veritas, Membership];

// Imported MDX stays in the server graph; no DOM cloning or second copy of prose.
export function caseStudySlots(prefix: string) {
  return cases.map((Case, index) => <div className="climb-case-content" key={waypoints[index].slug}>
    <Case idPrefix={prefix + waypoints[index].slug + "-"} embedded />
  </div>);
}

export function InlineCaseStudies() {
  return <div className="inline-cases">
    {caseStudySlots("case-").map((content, index) => {
      const waypoint = waypoints[index];
      return <section className="inline-case" id={`case-${waypoint.slug}`} key={waypoint.slug} tabIndex={-1}
        aria-label={`${waypoint.name} Case Study`}>
        <nav className="inline-case-nav" aria-label={`${waypoint.name} Case Study navigation`}>
          <a href={`#${waypoint.slug}`}>← Back to selected work</a>
          {"caseStudyHref" in waypoint && <Link href={waypoint.caseStudyHref}>Standalone Case Study →</Link>}
        </nav>
        {content}
      </section>;
    })}
  </div>;
}
