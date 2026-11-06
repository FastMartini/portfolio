"use client";

import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  const { theme, controller } = useTheme();
  const toLight = theme === "dark";
  return <button type="button" className="theme-toggle" hidden={!controller}
    aria-label={`Switch to ${toLight ? "light" : "dark"} theme`}
    onClick={() => controller?.toggle()}>
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {toLight ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></>
        : <path d="M19.5 14.6A7.8 7.8 0 0 1 9.4 4.5a7.8 7.8 0 1 0 10.1 10.1Z" />}
    </svg>
    <span>{toLight ? "Light mode" : "Dark mode"}</span>
  </button>;
}
