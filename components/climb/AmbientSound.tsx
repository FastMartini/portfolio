"use client";

import { useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { Ref } from "react";
import { createAmbientAudio } from "./audio/controller";

export type AmbientSoundController = { setPosition: (position: number) => void };

export function AmbientSound({ ref, active }: { ref: Ref<AmbientSoundController>; active: boolean }) {
  const engine = useRef<ReturnType<typeof createAmbientAudio> | null>(null);
  const position = useRef(0), wanted = useRef(false), mounted = useRef(false);
  const [enabled, setEnabled] = useState(false), [failed, setFailed] = useState(false);
  const fail = useCallback(() => {
    try { engine.current?.dispose(); } catch {}
    engine.current = null; wanted.current = false;
    if (mounted.current) { setEnabled(false); setFailed(true); }
  }, []);
  useImperativeHandle(ref, () => ({ setPosition(next) {
    position.current = next;
    try { engine.current?.setPosition(next); } catch { fail(); }
  } }), [fail]);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; engine.current?.dispose(); engine.current = null; };
  }, []);
  useEffect(() => {
    const sync = () => {
      try { engine.current?.setActive(active && !document.hidden); } catch { fail(); }
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, [active, fail]);

  function toggle() {
    wanted.current = !wanted.current;
    setEnabled(wanted.current); setFailed(false);
    try {
      if (!wanted.current) { engine.current?.mute(); return; }
      if (!engine.current) engine.current = createAmbientAudio(fail);
      engine.current.setPosition(position.current);
      engine.current.setActive(active && !document.hidden);
      void engine.current.enable();
    } catch { fail(); }
  }
  return <>
    <button type="button" className="climb-sound-toggle" hidden={!active}
      aria-label="Ambient sound" aria-pressed={enabled} onClick={toggle}
      title={enabled ? "Mute ambient sound" : "Turn on fire and snow sounds"}>
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 5 6 9H3v6h3l5 4Z" />
        {enabled ? <><path d="M15 8a6 6 0 0 1 0 8" /><path d="M18 5a10 10 0 0 1 0 14" /></> : <path d="m16 9 5 6m0-6-5 6" />}
      </svg>
      <span>Sound {enabled ? "on" : "off"}</span>
    </button>
    <span className="climb-sound-status" role="status" hidden={!active || !failed}>
      {failed ? "Sound could not start. You can try turning it on again." : ""}
    </span>
  </>;
}
