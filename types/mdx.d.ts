declare module "*.mdx" {
  export function CaseStudyContent(props: { idPrefix?: string; embedded?: boolean }): import("react").ReactNode;
}
