type CacheEntry<T> = {
  data: T;
  updatedAt: number;
};

const memory = new Map<string, CacheEntry<unknown>>();

const DEFAULT_TTL_MS = 60_000;

export function getCachedData<T>(
  key: string,
  ttlMs = DEFAULT_TTL_MS,
): T | null {
  const hit = memory.get(key) as CacheEntry<T> | undefined;
  if (!hit) return null;
  if (Date.now() - hit.updatedAt > ttlMs) return null;
  return hit.data;
}

/** Devuelve dato aunque esté vencido (stale), para mostrar al instante. */
export function getStaleData<T>(key: string): T | null {
  const hit = memory.get(key) as CacheEntry<T> | undefined;
  return hit?.data ?? null;
}

export function setCachedData<T>(key: string, data: T) {
  memory.set(key, { data, updatedAt: Date.now() });
}

export function invalidateCache(prefix?: string) {
  if (!prefix) {
    memory.clear();
    return;
  }
  for (const key of memory.keys()) {
    if (key.startsWith(prefix)) memory.delete(key);
  }
}

/**
 * Fetch con cache en memoria: muestra stale al instante y revalida en background.
 */
export async function cachedFetchJson<T>(
  key: string,
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: {
    ttlMs?: number;
    force?: boolean;
  },
): Promise<{ data: T; fromCache: boolean }> {
  const ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;
  if (!options?.force) {
    const fresh = getCachedData<T>(key, ttlMs);
    if (fresh !== null) {
      return { data: fresh, fromCache: true };
    }
  }

  const res = await fetch(input, init);
  const json = (await res.json()) as T & { error?: string };
  if (!res.ok) {
    throw new Error(
      typeof (json as { error?: string }).error === "string"
        ? (json as { error: string }).error
        : `Error ${res.status}`,
    );
  }
  setCachedData(key, json);
  return { data: json, fromCache: false };
}
