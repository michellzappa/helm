import type { NextApiRequest, NextApiResponse } from "next";
import { execSync } from "child_process";
import type { MessagesSummary } from "@/lib/api/types";
import { withDemo } from "@/lib/demo-guard";
import { messagesSummary as _demoFixture } from "@/lib/demo-fixtures";
import { getOrFetch } from "@/lib/server-cache";

export type { MessagesSummary };

const TTL_MS = 60_000;

async function handler(
  _req: NextApiRequest,
  res: NextApiResponse<MessagesSummary | { error: string }>
) {
  try {
    const data = await getOrFetch<MessagesSummary>("api-messages-summary", TTL_MS, async () => {
      const raw = execSync("openclaw status --json 2>/dev/null", { encoding: "utf-8", timeout: 8000 });
      const d = JSON.parse(raw);

      const channelLines: string[] = d.channelSummary ?? [];
      // Format: "telegram: 8765399458 (token:config)" — all are not running
      const runningChannels = channelLines.filter((l: string) =>
        l.toLowerCase().includes("running")
      ).length;

      const queuedEvents = d.queuedSystemEvents ?? [];
      // Stuck = events with retryCount > 0 (not available in status, use count)
      const stuck = queuedEvents.filter((e: any) => e.status === "retry" || e.status === "failed").length;

      const sessionsRecent = (d.sessions as any)?.recent ?? [];
      // last delivery approximation: most recent session
      const last = sessionsRecent[0];

      return {
        queued: queuedEvents.length,
        stuck,
        recentDeliveries: runningChannels,
        lastDelivery: last ? {
          channel: last.agentId ?? "unknown",
          time: last.updatedAt ?? Date.now(),
          status: "delivered",
        } : undefined,
      };
    });
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}

export default withDemo(_demoFixture as Parameters<typeof withDemo>[0], handler);
