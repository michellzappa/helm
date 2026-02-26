import { useState, useEffect, useRef, useCallback } from "react";
import { useRefreshInterval } from "./settings-context";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

function getCacheKey(key: string): string {
  return `helm-cache:${key}`;
}

function loadFromCache<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(getCacheKey(key));
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.timestamp > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(getCacheKey(key));
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

function saveToCache<T>(key: string, data: T) {
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() };
    localStorage.setItem(getCacheKey(key), JSON.stringify(entry));
  } catch {}
}

interface UseCachedRefreshOptions {
  cacheKey: string;
  fetcher: () => Promise<any>;
}

interface UseCachedRefreshResult<T> {
  data: T | null;
  isRefreshing: boolean;
  error: string | null;
}

export function useCachedRefresh<T>({ cacheKey, fetcher }: UseCachedRefreshOptions): UseCachedRefreshResult<T> {
  const [data, setData] = useState<T | null>(() => loadFromCache<T>(cacheKey));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const interval = useRefreshInterval();
  const fetcherRef = useRef(fetcher);
  const cacheKeyRef = useRef(cacheKey);

  useEffect(() => { fetcherRef.current = fetcher; });
  useEffect(() => { cacheKeyRef.current = cacheKey; });

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const result = await fetcherRef.current();
      setData(result);
      setError(null);
      saveToCache(cacheKeyRef.current, result);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsRefreshing(false);
    }
  }, []); // No dependencies — uses refs

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, interval);
    return () => clearInterval(id);
  }, [interval, refresh]);

  return { data, isRefreshing, error };
}
