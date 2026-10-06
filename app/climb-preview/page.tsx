import Link from "next/link";
import { Mountain } from "../../components/climb/Mountain";

export const metadata = {
  title: "Static mountain preview — Diego Martinez",
  robots: { index: false, follow: false },
};

export default function ClimbPreview() {
  return (
    <main className="climb-preview">
      <Mountain trailPosition={0} />
      <div className="climb-preview-caption">
        <h1>Static mountain preview</h1>
        <p>Trailhead · Deterministic mountain artwork and animated Landmarks.</p>
        <Link href="/">Back to the portfolio</Link>
      </div>
    </main>
  );
}
