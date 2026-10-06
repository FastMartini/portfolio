"use client";

import { useEffect } from "react";
import { catchError } from "next/error";

function NotifyFailure({ onFailure }: { onFailure: () => void }) {
  useEffect(() => {
    const raf = requestAnimationFrame(onFailure);
    return () => cancelAnimationFrame(raf);
  }, [onFailure]);
  return null;
}

// Keep the durable List View and its state outside the enhancement boundary.
export const SceneRecovery = catchError(({ onFailure }: { onFailure: () => void }) =>
  <NotifyFailure onFailure={onFailure} />);
