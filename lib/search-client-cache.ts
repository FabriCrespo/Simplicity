/**
 * Client-side search cache (memory + localStorage).
 * Survives navigations and reloads until the catalog version changes.
 */

import type { SearchResult } from "@/lib/catalog";

const STORAGE_KEY = "simplicity-search-v1";
const MAX_ENTRIES = 40;

type Store = {
  version: string;
  entries: Record<string, SearchResult>;
};

const memory = new Map<string, SearchResult>();
let loadedVersion: string | null = null;

function readStore(): Store | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Store;
  } catch {
    return null;
  }
}

function writeStore(store: Store) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Quota / private mode — memory cache still works.
  }
}

function ensureVersion(version: string) {
  if (loadedVersion === version) return;
  loadedVersion = version;
  memory.clear();

  const store = readStore();
  if (!store || store.version !== version) {
    writeStore({ version, entries: {} });
    return;
  }

  for (const [key, value] of Object.entries(store.entries)) {
    memory.set(key, value);
  }
}

function persist(version: string) {
  const entries: Record<string, SearchResult> = {};
  let i = 0;
  for (const [key, value] of memory) {
    entries[key] = value;
    i += 1;
    if (i >= MAX_ENTRIES) break;
  }
  writeStore({ version, entries });
}

export function getCachedSearch(
  query: string,
  version: string,
): SearchResult | null {
  const key = query.trim().toLowerCase();
  if (!key) return null;

  // Prefer stored version if caller still has "pending"
  const effective =
    version === "pending" ? (getStoredCatalogVersion() ?? version) : version;
  if (effective === "pending") return null;

  ensureVersion(effective);
  return memory.get(key) ?? null;
}

export function setCachedSearch(
  query: string,
  version: string,
  result: SearchResult,
) {
  const key = query.trim().toLowerCase();
  if (!key) return;
  ensureVersion(version);

  if (memory.has(key)) memory.delete(key);
  memory.set(key, result);

  while (memory.size > MAX_ENTRIES) {
    const oldest = memory.keys().next().value;
    if (oldest === undefined) break;
    memory.delete(oldest);
  }

  persist(version);
}

export function getStoredCatalogVersion(): string | null {
  return readStore()?.version ?? loadedVersion;
}
