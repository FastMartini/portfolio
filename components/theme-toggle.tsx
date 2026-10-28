"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";
import { THEME_STORAGE_KEY } from "./theme-preference";

type Theme = "dark" | "light";
const changeEvent = "portfolio-theme-change";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  window.dispatchEvent(new Event(changeEvent));
}

function savedTheme(): Theme {
  try { return localStorage.getItem(THEME_STORAGE_KEY) === "light" ? "light" : "dark"; }
  catch { return "dark"; }
}

function subscribe(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY || event.key === null) applyTheme(savedTheme());
  };
  window.addEventListener(changeEvent, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(changeEvent, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe,
    () => document.documentElement.dataset.theme === "light" ? "light" : "dark",
    () => "dark");

  // React's development remount can reset attributes applied by the head script.
  useLayoutEffect(() => {
    applyTheme(savedTheme());
    document.documentElement.dataset.themeReady = "";
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    try { localStorage.setItem(THEME_STORAGE_KEY, next); } catch { /* Still works for this visit. */ }
  }

  return <button type="button" className="theme-toggle" onClick={toggle}
    aria-label="Dark mode" aria-pressed={theme === "dark"}
    title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {theme === "dark" ? <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
      </> : <path d="M20.5 14A8.5 8.5 0 0 1 10 3.5 8.5 8.5 0 1 0 20.5 14Z" />}
    </svg>
  </button>;
}
