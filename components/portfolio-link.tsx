import type { AnchorHTMLAttributes } from "react";

// External destinations preserve the portfolio tab. Native section links and
// mail actions retain their normal behavior, including without JavaScript.
export function PortfolioLink({ href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const external = /^https?:\/\//i.test(href ?? "");
  return <a {...props} href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} />;
}
