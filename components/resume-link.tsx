const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function ResumeLink({ className = "button button-primary" }: { className?: string }) {
  return (
    <a
      className={className}
      href={`${basePath}/resume/Martinez_Diego_2026.pdf`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="View résumé (PDF, opens in a new tab)"
    >
      Résumé (PDF) <span aria-hidden="true">↗</span>
    </a>
  );
}
