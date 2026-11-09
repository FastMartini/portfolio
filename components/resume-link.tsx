import type { ReactNode } from "react";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function ResumeLink({ className = "button button-primary", children = "Resume" }: { className?: string; children?: ReactNode }) {
  return (
    <a
      className={`${className} resume-link`}
      href={`${basePath}/resume/Martinez_Diego_2026.pdf`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="View résumé (PDF, opens in a new tab)"
    >
      {children}
    </a>
  );
}
