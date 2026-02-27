import os from "os";
import { readFile, readdir } from "fs/promises";
import { join } from "path";
import type { NextApiRequest, NextApiResponse } from "next";
import type { QueueItem } from "@/lib/types";

const HOME = os.homedir();
const QUEUE_DIR = join(HOME, ".openclaw/delivery-queue");

// Exponential backoff with jitter ceiling (matches OC's internal logic)
function calculateBackoff(retryCount: number): number {
  if (retryCount <= 0) return 0;
  const baseMs = 1000; // 1 second
  const maxMs = 30 * 60 * 1000; // 30 minutes cap
  const exponential = Math.min(baseMs * Math.pow(2, retryCount - 1), maxMs);
  const jitter = Math.random() * 0.1 * exponential; // 10% jitter
  return Math.round(exponential + jitter);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<QueueItem[] | { error: string }>
) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    let files: string[] = [];
    try {
      files = (await readdir(QUEUE_DIR)).filter(f => f.endsWith(".json"));
    } catch {
      return res.status(200).json([]);
    }

    const items: QueueItem[] = [];
    for (const file of files) {
      try {
        const raw = await readFile(join(QUEUE_DIR, file), "utf-8");
        const d = JSON.parse(raw);
        const payload = d.payloads?.[0] || {};
        // Calculate backoff: typical exponential with ceiling
        const retryCount = d.retryCount || 0;
        const lastAttemptAt = d.lastAttemptAt || d.enqueuedAt || 0;
        const backoffMs = calculateBackoff(retryCount);
        const nextRetryAt = lastAttemptAt + backoffMs;

        items.push({
          id: d.id,
          channel: d.channel || "unknown",
          to: d.to || "",
          enqueuedAt: d.enqueuedAt || 0,
          lastAttemptAt,
          retryCount,
          backoffMs,
          nextRetryAt,
          status: retryCount === 0 ? "pending" : Date.now() > nextRetryAt ? "retrying" : "backoff",
          lastError: d.lastError,
          text: payload.text || d.mirror?.text || "",
          hasMedia: !!(payload.mediaUrl || payload.mediaUrls?.length),
        });
      } catch { /* skip malformed */ }
    }

    items.sort((a, b) => b.enqueuedAt - a.enqueuedAt);
    res.status(200).json(items);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}
