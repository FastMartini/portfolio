const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function ResumeLink({ className = "resume-note" }: { className?: string }) {
  return (
    <a
      className={className}
      href={`${basePath}/resume/Diego_Martinez_Resume_2026.pdf`}
      target="_blank"
      rel="noopener noreferrer"
    >
      Résumé (PDF)
    </a>
  );
}
