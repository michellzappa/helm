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
  try {
    const raw = localStorage.getItem(getCacheKey(key));
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    // Cache valid for 24 hours
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
  isLoading: boolean;
  isStale: boolean;
  error: string | null;
  refresh: () => void;
}

export function useCachedRefresh<T>({ cacheKey, fetcher }: UseCachedRefreshOptions): UseCachedRefreshResult<T> {
  const [data, setData] = useState<T | null>(() => loadFromCache<T>(cacheKey));
  const [isLoading, setIsLoading] = useState(false);
  const [isStale, setIsStale] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const interval = useRefreshInterval();
  const fetcherRef = useRef(fetcher);
  
  useEffect(() => { fetcherRef.current = fetcher; });

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setIsStale(!!data); // Mark as stale if we have cached data
    try {
      const result = await fetcherRef.current();
      setData(result);
      setError(null);
      saveToCache(cacheKey, result);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
      setIsStale(false);
    }
  }, [cacheKey, data]);

  // Initial load + periodic refresh
  useEffect(() => {
    refresh();
    const id = setInterval(refresh, interval);
    return () => clearInterval(id);
  }, [interval, refresh]);

  return { data, isLoading, isStale, error, refresh };
}

// Simple global refresh indicator
type RefreshCallback = (count: number) => void;
const refreshListeners = new Set<RefreshCallback>();
let activeRefreshes = 0;

export function notifyRefreshStart() {
  activeRefreshes++;
  refreshListeners.forEach(cb => cb(activeRefreshes));
}

export function notifyRefreshEnd() {
  activeRefreshes = Math.max(0, activeRefreshes - 1);
  refreshListeners.forEach(cb => cb(activeRefreshes));
}

export function useGlobalRefreshIndicator(): number {
  const [count, setCount] = useState(activeRefreshes);
  useEffect(() => {
    const cb = (c: number) => setCount(c);
    refreshListeners.add(cb);
    return () => { refreshListeners.delete(cb); };
  }, []);
  return count;
}
