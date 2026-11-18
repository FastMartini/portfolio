import Link from "next/link";
import type { ReactNode } from "react";
import { ThemeToggle } from "./theme/ThemeToggle";
import { AmbientSoundToggle } from "./climb/AmbientSound";
import { ResumeLink } from "./resume-link";

type ShellLink = {
  kind?: "section";
  href: string;
  label: string;
} | { kind: "resume"; label: string };

type PortfolioHeaderProps = {
  homeHref: string;
  homeLabel?: string;
  homeAriaLabel: string;
  links: readonly ShellLink[];
  navLabel: string;
  action?: ReactNode;
  variant?: "home" | "case-study";
};

export function SkipLink({ href, label }: { href: string; label: string }) {
  return (
    <a data-theme-root="" className="skip-link" href={href}>
      {label}
    </a>
  );
}

export function PortfolioHeader({
  homeHref,
  homeLabel = "Diego Martinez",
  homeAriaLabel,
  links,
  navLabel,
  action,
  variant = "home",
}: PortfolioHeaderProps) {
  return (
    <header
      data-theme-root=""
      className={`site-header${
        variant === "case-study" ? " site-header--case-study" : ""
      }`}
    >
      <Link className="wordmark" href={homeHref} aria-label={homeAriaLabel}>
        <span>{homeLabel}</span>
      </Link>
      <nav aria-label={navLabel}>
        <div className="site-header-links">
          {links.map((link) => link.kind === "resume" ? (
            <ResumeLink className="" key="resume">{link.label}</ResumeLink>
          ) : (
            <a href={link.href} key={link.href}>
              {link.label}
            </a>
          ))}
        </div>
        <div className="site-header-controls">
          <AmbientSoundToggle />
          <ThemeToggle />
          {action}
        </div>
      </nav>
    </header>
  );
}
