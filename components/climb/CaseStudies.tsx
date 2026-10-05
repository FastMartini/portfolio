import Link from "next/link";
import type { ReactNode } from "react";
import { CaseStudyContent as MomentumX } from "../../app/work/momentumx/page.mdx";
import { CaseStudyContent as Veritas } from "../../app/work/veritas/page.mdx";
import { CaseStudyContent as Membership } from "../../app/work/membership-inference-attack/page.mdx";
import { waypoints } from "../../content/waypoints";

type CaseStudySlug = Extract<typeof waypoints[number], { tier: "case-study" }>["slug"];
const cases = {
  momentumx: MomentumX,
  veritas: Veritas,
  "membership-inference-attack": Membership,
} satisfies Record<CaseStudySlug, typeof MomentumX>;

// Imported MDX stays in the server graph; no DOM cloning or second copy of prose.
export function caseStudySlots(prefix: string): Record<string, ReactNode> {
  return Object.fromEntries(Object.entries(cases).map(([slug, Case]) => [slug,
    <div className="climb-case-content" key={slug}>
      <Case idPrefix={prefix + slug + "-"} embedded />
    </div>,
  ]));
}

export function InlineCaseStudies() {
  const slots = caseStudySlots("case-");
  return <div className="inline-cases">
    {waypoints.filter((waypoint) => waypoint.tier === "case-study").map((waypoint) => {
      return <section className="inline-case" id={`case-${waypoint.slug}`} key={waypoint.slug} tabIndex={-1}
        aria-label={`${waypoint.name} Case Study`}>
        <nav className="inline-case-nav" aria-label={`${waypoint.name} Case Study navigation`}>
          <a href={`#${waypoint.slug}`}>← Back to selected work</a>
          {"caseStudyHref" in waypoint && <Link href={waypoint.caseStudyHref}>Standalone Case Study →</Link>}
        </nav>
        {slots[waypoint.slug]}
      </section>;
    })}
  </div>;
}
