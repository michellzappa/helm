import os from "os";
import { exec } from "child_process";
import { promisify } from "util";
import type { NextApiRequest, NextApiResponse } from "next";
import type { ModelAuthData, OAuthExpiry } from "@/lib/api/types";
import { getOrFetch } from "@/lib/server-cache";

const execAsync = promisify(exec);
const TTL_MS = 55_000;

function parseExpiryTime(timeStr: string, refMs: number): { expiresAt: string | null; expiresInMs: number | null } {
  const unitMatch = timeStr.match(/(\d+)\s*(m(?:in)?|h|d|w)/i);
  if (!unitMatch) return { expiresAt: null, expiresInMs: null };
  const value = parseInt(unitMatch[1]);
  const unit = unitMatch[2].toLowerCase();
  let ms: number;
  if (unit.startsWith("m")) ms = value * 60_000;
  else if (unit === "h") ms = value * 3_600_000;
  else if (unit === "d") ms = value * 86_400_000;
  else if (unit === "w") ms = value * 604_800_000;
  else return { expiresAt: null, expiresInMs: null };
  return { expiresAt: new Date(refMs + ms).toISOString(), expiresInMs: ms };
}

function parseExpiry(line: string, refMs: number): OAuthExpiry | null {
  const m = line.match(/^\s*-\s+([^ ]+)\s+(ok|error|expired)\s+expires?\s*(?:in\s+)?(\S+)?/i);
  if (!m) return null;
  const account = m[1];
  const ok = m[2].toLowerCase() === "ok";
  const timeStr = m[3] ?? "";

  if (!ok) {
    return { account, status: "expired", expiresAt: null, expiresInMs: null };
  }
  if (!timeStr) {
    return { account, status: "ok", expiresAt: null, expiresInMs: null };
  }

  const { expiresAt, expiresInMs } = parseExpiryTime(timeStr, refMs);
  let status: OAuthExpiry["status"] = "ok";
  if (expiresInMs === null) status = "ok";
  else if (expiresInMs < 5 * 60_000) status = "critical";
  else if (expiresInMs < 30 * 60_000) status = "warning";

  return { account, status, expiresAt, expiresInMs };
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ModelAuthData | { error: string }>
) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  try {
    const data = await getOrFetch<ModelAuthData>("api-model-auth", TTL_MS, async () => {
      const refMs = Date.now();
      const { stdout } = await execAsync("openclaw models status 2>&1", { timeout: 8000 });
      const lines = stdout.split("\n");
      const oauthAccounts: OAuthExpiry[] = [];
      let hasWarnings = false;
      let hasCritical = false;

      for (const line of lines) {
        const expiry = parseExpiry(line, refMs);
        if (expiry) {
          oauthAccounts.push(expiry);
          if (expiry.status === "warning") hasWarnings = true;
          if (expiry.status === "critical" || expiry.status === "expired") hasCritical = true;
        }
      }

      return {
        oauthAccounts,
        hasWarnings,
        hasCritical,
        shellEnv: stdout.includes("Shell env"),
        authStore: "",
        providers: [],
      };
    });
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

export default handler;
