"use client";

import { useSyncExternalStore } from "react";
import { heroSound } from "./sound";

export function HeroSoundToggle() {
  const on = useSyncExternalStore(heroSound.subscribe, heroSound.get, () => true);
  return <button type="button" className="hero-sound-toggle" aria-label="Guitar sound" aria-pressed={on}
    title={on ? "Mute the guitar strings" : "Turn on the guitar strings"} onClick={() => heroSound.set(!on)}>
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5 6 9H3v6h3l5 4Z" />
      {on ? <><path d="M15 8a6 6 0 0 1 0 8" /><path d="M18 5a10 10 0 0 1 0 14" /></> : <path d="m16 9 5 6m0-6-5 6" />}
    </svg>
  </button>;
}
