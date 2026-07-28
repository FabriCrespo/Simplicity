"use client";

import { useEffect } from "react";

const STORAGE_KEY = "simplicity-search-v2";

/**
 * Syncs catalog version cookie/localStorage on each visit.
 * Clears search cache when the catalog was re-extracted.
 */
export function CatalogWarmup() {
  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/catalog-version", { signal: controller.signal })
      .then((res) => res.json())
      .then((data: { version?: string }) => {
        if (!data.version) return;
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          const parsed = raw
            ? (JSON.parse(raw) as {
                version: string;
                entries: Record<string, unknown>;
              })
            : null;

          if (parsed?.version === data.version) return;

          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ version: data.version, entries: {} }),
          );
        } catch {
          // ignore
        }
      })
      .catch(() => {
        // ignore network / abort
      });

    return () => controller.abort();
  }, []);

  return null;
}
