import Link from "next/link";
import type { Metadata } from "next";
import styles from "./not-found.module.css";
import { ThemeToggle } from "../components/theme-toggle";

export const metadata: Metadata = {
  title: "Page not found — Diego Martinez",
  description: "This trail does not lead to a published page. Return to Diego Martinez’s portfolio and selected work.",
};

export default function NotFound() {
  return <>
    <header className="site-header">
      <Link className="wordmark" href="/">Diego Martinez</Link>
      <ThemeToggle />
    </header>
    <main className={styles.page}>
      <p className="eyebrow">404 · Off the trail</p>
      <h1>Page not found.</h1>
      <p>This trail doesn’t lead to a published page. You can find my projects and contact details back at the Trailhead.</p>
      <Link className="button button-primary" href="/#list-view">Return to the portfolio →</Link>
    </main>
  </>;
}
