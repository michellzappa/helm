/**
 * Demo mode API guard.
 * When DEMO_MODE=1 env var is set, returns fixture data instead of real data.
 * Used for safe, PII-free screenshots.
 */
import type { NextApiRequest, NextApiResponse } from "next";
import { DEMO_MODE } from "./demo";

type Handler = (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void;

/**
 * If DEMO_MODE is on, respond with `fixture` and skip the real handler.
 */
export function withDemo<T>(fixture: T, handler: Handler): Handler {
  if (!DEMO_MODE) return handler;
  return (_req, res) => {
    res.status(200).json(fixture);
  };
}
