"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useState } from "react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { createThemeController } from "./controller";
import type { Theme, ThemeController } from "./controller";
import { applyUiTokens, clearUiTokens } from "./ui-tokens";

const ThemeContext = createContext<{ theme: Theme; controller: ThemeController | null }>({ theme: "dark", controller: null });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ theme: Theme; controller: ThemeController | null }>({ theme: "dark", controller: null });
  const pathname = usePathname();

  useEffect(() => {
    const controller = createThemeController();
    const roots = () => document.querySelectorAll<HTMLElement>("[data-theme-root]");
    const stop = controller.subscribe((blend, settled) => {
      if (settled) clearUiTokens(roots());
      else applyUiTokens(roots(), blend);
      setState((previous) => previous.controller === controller && previous.theme === controller.theme
        ? previous : { controller, theme: controller.theme });
    });
    // Panels and route content may mount between animation frames. Pin them to
    // the same current palette before the browser paints the added subtree.
    let observer: MutationObserver | undefined;
    const stopObserver = () => { try { observer?.disconnect(); } catch { /* Optional enhancement observation. */ } };
    try {
      if (typeof MutationObserver === "function") {
        observer = new MutationObserver(() => {
          if (!controller.settled) applyUiTokens(roots(), controller.blend());
        });
        observer.observe(document.body, { childList: true, subtree: true });
      }
    } catch { stopObserver(); }
    return () => { stopObserver(); stop(); clearUiTokens(roots()); controller.dispose(); };
  }, []);

  useLayoutEffect(() => { state.controller?.jump(); }, [pathname, state.controller]);

  return <ThemeContext.Provider value={state}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
