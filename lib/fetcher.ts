// SWR fetcher with consistent error handling
// Used by all SWR hooks for data fetching

export interface FetcherError extends Error {
  info?: unknown;
  status?: number;
}

/**
 * Generic fetcher for SWR
 * Throws on HTTP errors for SWR to catch and retry
 */
export async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  
  if (!res.ok) {
    const error = new Error("An error occurred while fetching the data.") as FetcherError;
    error.info = await res.json().catch(() => null);
    error.status = res.status;
    throw error;
  }
  
  const data = await res.json();
  
  // Handle API responses that return { error: string } on error
  if (data && typeof data === "object" && "error" in data) {
    const error = new Error(String(data.error)) as FetcherError;
    error.status = res.status;
    throw error;
  }
  
  return data as T;
}

/**
 * Fetcher that returns null on error instead of throwing
 * Use when you want to handle errors gracefully without SWR retry
 */
export async function safeFetcher<T>(url: string): Promise<T | null> {
  try {
    return await fetcher<T>(url);
  } catch {
    return null;
  }
}
