"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

type Props = {
  /** Rutas a precargar en idle (payload RSC del router). */
  hrefs: readonly string[];
  /** Delay antes de prefetch si no hay requestIdleCallback. */
  delayMs?: number;
};

/**
 * Precarga rutas en el client router cache para que el click sea casi instantáneo.
 */
export function RoutePrefetch({ hrefs, delayMs = 400 }: Props) {
  const router = useRouter();

  useEffect(() => {
    if (!hrefs.length) return;

    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      for (const href of hrefs) {
        try {
          void router.prefetch(href);
        } catch {
          // ignore
        }
      }
    };

    const idle = (
      window as Window & {
        requestIdleCallback?: (
          cb: () => void,
          opts?: { timeout: number },
        ) => number;
        cancelIdleCallback?: (id: number) => void;
      }
    ).requestIdleCallback;

    if (typeof idle === "function") {
      const id = idle(run, { timeout: 2500 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback?.(id);
      };
    }

    const t = window.setTimeout(run, delayMs);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [router, hrefs, delayMs]);

  return null;
}
