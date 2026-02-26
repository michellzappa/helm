interface CacheEntry {
  data: unknown;
  ts: number;
}

const globalCache = globalThis as typeof globalThis & {
  __openclawServerCache?: Map<string, CacheEntry>;
};

const cache = globalCache.__openclawServerCache ?? new Map<string, CacheEntry>();
globalCache.__openclawServerCache = cache;

export function getCached<T>(key: string, ttlMs: number): T | null {
  const entry = cache.get(key);
  if (!entry || Date.now() - entry.ts > ttlMs) return null;
  return entry.data as T;
}

export function setCached(key: string, data: unknown): void {
  cache.set(key, { data, ts: Date.now() });
}

export async function getOrFetch<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = getCached<T>(key, ttlMs);
  if (cached !== null) return cached;
  const data = await fetcher();
  setCached(key, data);
  return data;
}
