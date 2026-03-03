// SWR configuration and provider
// Centralized SWR config with refresh interval integration

import { SWRConfig, type SWRConfiguration } from "swr";
import { fetcher } from "./fetcher";
import { useRefreshInterval } from "./settings-context";
import { ReactNode } from "react";

/**
 * Get SWR configuration based on refresh interval settings
 */
export function createSwrConfig(refreshIntervalMs: number): SWRConfiguration {
  // Disable refresh when interval is 0 (paused)
  const refreshInterval = refreshIntervalMs > 0 ? refreshIntervalMs : 0;
  
  return {
    fetcher,
    refreshInterval,
    // Keep previous data while fetching to avoid UI flicker
    keepPreviousData: true,
    // Retry failed requests with exponential backoff
    shouldRetryOnError: true,
    errorRetryCount: 3,
    errorRetryInterval: 5000,
    // Deduping interval - prevent duplicate requests in the same timeframe
    dedupingInterval: 2000,
    // Revalidate on focus/tab switch
    revalidateOnFocus: true,
    // Revalidate on network reconnect
    revalidateOnReconnect: true,
    // Don't revalidate when cached data exists (respect refreshInterval)
    revalidateIfStale: false,
  };
}

interface SwrConfigProviderProps {
  children: ReactNode;
}

/**
 * SWR Config Provider that integrates with refresh interval settings
 */
export function SwrConfigProvider({ children }: SwrConfigProviderProps) {
  const refreshInterval = useRefreshInterval();
  const config = createSwrConfig(refreshInterval);
  
  return <SWRConfig value={config}>{children}</SWRConfig>;
}

// Export default config for use outside React (e.g., in hooks)
export { SWRConfig };
export type { SWRConfiguration };
