import type { NextApiRequest, NextApiResponse } from "next";
import { execSync } from "child_process";
import { withDemo } from "../../lib/demo-guard";
import { messagesSummary as _demoFixture } from "../../lib/demo-fixtures";

export interface MessagesSummary {
  queued: number;
  stuck: number;
  recentDeliveries: number;
  lastDelivery?: {
    channel: string;
    time: number;
    status: string;
  };
}

function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const output = execSync("openclaw message queue --json", {
      encoding: "utf-8",
      timeout: 5000,
    });
    const queue = JSON.parse(output);
    
    const items = queue.items || [];
    const stuck = items.filter((i: any) => i.retryCount > 0).length;

    res.json({
      queued: items.length,
      stuck,
      recentDeliveries: 0, // Would need delivery history
      lastDelivery: items[0] ? {
        channel: items[0].channel,
        time: items[0].enqueuedAt,
        status: items[0].lastError ? "failed" : "pending",
      } : undefined,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}

export default withDemo(_demoFixture, handler);
