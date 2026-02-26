import type { NextApiRequest, NextApiResponse } from "next";
import { execSync } from "child_process";

export interface ChannelsSummary {
  total: number;
  healthy: number;
  recentMessages: number;
  byChannel: Record<string, { healthy: boolean; recent: number }>;
}

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
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
      // Mock recent messages count - would need actual message API
      byChannel[ch.id] = { healthy: isHealthy, recent: Math.floor(Math.random() * 50) };
      recentMessages += byChannel[ch.id].recent;
    }

    res.json({
      total: channels.channels?.length || 0,
      healthy,
      recentMessages,
      byChannel,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
