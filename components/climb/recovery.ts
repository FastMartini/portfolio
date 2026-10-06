// Effect cleanup runs outside the enhancement's child error boundary. Attempt
// every release even if one browser API throws; recovery must not depend on RAF
// or synchronously update React while another effect is being torn down.
export function sceneCleanup(onFailure: () => void, ...tasks: (() => void)[]) {
  return () => {
    for (const task of tasks) {
      try { task(); }
      catch { queueMicrotask(onFailure); }
    }
  };
}

// Browser callbacks run after rendering, beyond React's error boundaries.
export function sceneTask<Args extends unknown[]>(onFailure: () => void, task: (...args: Args) => void) {
  return (...args: Args) => {
    try { task(...args); }
    catch { queueMicrotask(onFailure); }
  };
}
