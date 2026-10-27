import { ambientMix } from "./profile";
import { createAmbientGraph } from "./synthesis";

export function createAmbientAudio(onFailure: () => void) {
  const context = new AudioContext();
  let graph: ReturnType<typeof createAmbientGraph>;
  try { graph = createAmbientGraph(context); }
  catch (error) { void context.close().catch(() => {}); throw error; }
  let position = 0, enabled = false, active = false, disposed = false;

  function apply() {
    if (disposed) return;
    if (enabled && active) graph.setMix(ambientMix(position));
    else graph.silence();
  }
  function reconcile(): Promise<void> {
    if (disposed) return Promise.resolve();
    apply();
    const wanted = enabled && active;
    // resume() is called directly from the enabling gesture. After an async
    // transition, reconcile the latest intent so rapid toggles cannot restart
    // a muted, hidden or reading-mode soundscape.
    const transition = wanted ? context.resume() : context.suspend();
    return transition.then(() => {
      if (disposed) return;
      if (wanted !== (enabled && active)) return reconcile();
      apply();
    }).catch(() => { if (!disposed) onFailure(); });
  }
  return {
    enable() { enabled = true; return reconcile(); },
    mute() { enabled = false; void reconcile(); },
    setActive(next: boolean) { active = next; void reconcile(); },
    setPosition(next: number) { position = next; apply(); },
    dispose() {
      if (disposed) return;
      disposed = true;
      try { graph.silence(); } catch {}
      try { graph.dispose(); } catch {}
      void context.close().catch(() => {});
    },
  };
}
