import Link from "next/link";
import type { ReactNode } from "react";

type ShellLink = {
  href: string;
  label: string;
};

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
    <a className="skip-link" href={href}>
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
      className={`site-header${
        variant === "case-study" ? " site-header--case-study" : ""
      }`}
    >
      <Link className="wordmark" href={homeHref} aria-label={homeAriaLabel}>
        <span>{homeLabel}</span>
      </Link>
      <nav aria-label={navLabel}>
        {links.map((link) => (
          <a href={link.href} key={link.href}>
            {link.label}
          </a>
        ))}
        {action}
      </nav>
    </header>
  );
}
