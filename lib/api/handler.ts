// API Handler Factory
// Consolidates method validation, caching, demo guard, and error handling
// Replaces duplicated patterns across all 32+ API routes

import type { NextApiRequest, NextApiResponse } from "next";
import { DEMO_MODE } from "../demo";
import { getCached, setCached } from "../server-cache";

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export interface HandlerConfig<T> {
  /** Allowed HTTP methods (defaults to ["GET"]) */
  methods?: HttpMethod[];
  
  /** Cache key - if provided, enables server-side caching */
  cacheKey?: string;
  
  /** Cache TTL in milliseconds (defaults to 10 seconds if cacheKey is set) */
  cacheTtlMs?: number;
  
  /** Demo fixture data - returned when DEMO_MODE is enabled */
  demoFixture?: T;
  
  /** Handler function that processes the request */
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<T>;
}

export interface ApiErrorResponse {
  error: string;
}

/**
 * Create a standardized API handler with common middleware:
 * - Method validation
 * - Server-side caching (optional)
 * - Demo mode support
 * - Consistent error handling
 */
export function createHandler<T>({
  methods = ["GET"],
  cacheKey,
  cacheTtlMs = 10_000,
  demoFixture,
  handler,
}: HandlerConfig<T>) {
  return async (
    req: NextApiRequest,
    res: NextApiResponse<T | ApiErrorResponse>
  ): Promise<void> => {
    // Method validation
    if (!methods.includes(req.method as HttpMethod)) {
      res.status(405).json({ error: `Method ${req.method} not allowed` });
      return;
    }

    // Demo mode: return fixture data immediately
    if (DEMO_MODE && demoFixture !== undefined) {
      res.status(200).json(demoFixture);
      return;
    }

    // Check server-side cache
    if (cacheKey && req.method === "GET") {
      const cached = getCached<T>(cacheKey, cacheTtlMs);
      if (cached !== null) {
        res.status(200).json(cached);
        return;
      }
    }

    try {
      const data = await handler(req, res);
      
      // Store in cache (only for GET requests)
      if (cacheKey && req.method === "GET") {
        setCached(cacheKey, data);
      }
      
      // Only send response if not already sent by handler
      if (!res.headersSent) {
        res.status(200).json(data);
      }
    } catch (err: unknown) {
      console.error(`API error in ${req.url}:`, err);
      
      // Only send error if not already sent
      if (!res.headersSent) {
        const message = err instanceof Error ? err.message : "Internal server error";
        res.status(500).json({ error: message });
      }
    }
  };
}

/**
 * Simple GET-only handler factory for common use cases
 */
export function createGetHandler<T>(
  handler: (req: NextApiRequest) => Promise<T>,
  config?: Omit<HandlerConfig<T>, "methods" | "handler">
) {
  return createHandler<T>({
    methods: ["GET"],
    handler: async (req) => handler(req),
    ...config,
  });
}

/**
 * Create a handler with custom method support
 */
export function createMethodHandler<T>(
  method: HttpMethod,
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<T>,
  config?: Omit<HandlerConfig<T>, "methods" | "handler">
) {
  return createHandler<T>({
    methods: [method],
    handler,
    ...config,
  });
}
