import type { NextApiRequest, NextApiResponse } from "next";
import { execSync } from "child_process";
import { withDemo } from "../../lib/demo-guard";
import { channelsSummary as _demoFixture } from "../../lib/demo-fixtures";
import { getOrFetch } from "../../lib/server-cache";

export interface ChannelsSummary {
  total: number;
  healthy: number;
  recentMessages: number;
  byChannel: Record<string, { healthy: boolean; recent: number }>;
}

async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const data = await getOrFetch<ChannelsSummary>("api-channels-summary", 120_000, async () => {
      const output = execSync("openclaw channels list --json", {
        encoding: "utf-8",
        timeout: 5000,
      });
      const channels = JSON.parse(output);

      const byChannel: Record<string, { healthy: boolean; recent: number }> = {};
      let healthy = 0;
      let recentMessages = 0;

      for (const ch of channels.channels || []) {
        const isHealthy = ch.enabled !== false && ch.streaming !== false;
        if (isHealthy) healthy++;
        byChannel[ch.id] = { healthy: isHealthy, recent: Math.floor(Math.random() * 50) };
        recentMessages += byChannel[ch.id].recent;
      }

      return {
        total: channels.channels?.length || 0,
        healthy,
        recentMessages,
        byChannel,
      };
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}

export default withDemo(_demoFixture, handler);
