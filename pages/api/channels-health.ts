import os from "os";
import { readdir, readFile } from "fs/promises";
import { join } from "path";
import type { NextApiRequest, NextApiResponse } from "next";

const HOME = os.homedir();

export interface ChannelHealthEntry {
  id: string;
  name: string;
  healthPct: number;
  enabled: boolean;
  stuck: number;
  queued: number;
}

export interface ChannelsHealthData {
  overallPct: number;
  channels: ChannelHealthEntry[];
}

function clampPct(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ChannelsHealthData | { error: string }>
) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const configRaw = await readFile(join(HOME, ".openclaw/openclaw.json"), "utf-8");
    const config = JSON.parse(configRaw);
    const channelsConfig = config.channels ?? {};

    const queueDir = join(HOME, ".openclaw/delivery-queue");
    const queueByChannel = new Map<string, { queued: number; stuck: number }>();

    try {
      const files = (await readdir(queueDir)).filter((f) => f.endsWith(".json"));
      for (const file of files) {
        try {
          const raw = await readFile(join(queueDir, file), "utf-8");
          const item = JSON.parse(raw);
          const channel = typeof item.channel === "string" ? item.channel : "unknown";
          const retryCount = Number(item.retryCount ?? 0);
          const hasError = !!item.lastError;
          const prev = queueByChannel.get(channel) ?? { queued: 0, stuck: 0 };
          prev.queued += 1;
          if (retryCount > 0 || hasError) prev.stuck += 1;
          queueByChannel.set(channel, prev);
        } catch {
          // ignore malformed queue files
        }
      }
    } catch {
      // queue directory missing is valid
    }

    const channels: ChannelHealthEntry[] = Object.entries(channelsConfig).map(([id, cfg]: [string, any]) => {
      const enabled = cfg?.enabled !== false;
      const streaming = cfg?.streaming !== false;
      const groupsCount = Object.keys(cfg?.groups ?? cfg?.guilds ?? {}).length;
      const allowCount = (cfg?.allowFrom ?? cfg?.groupAllowFrom ?? []).length;
      const queue = queueByChannel.get(id) ?? { queued: 0, stuck: 0 };

      let health = enabled ? 45 : 10;
      health += streaming ? 20 : 5;
      health += groupsCount > 0 ? 15 : 5;
      health += allowCount > 0 ? 10 : 5;
      health -= Math.min(25, queue.stuck * 10);
      health -= Math.min(15, queue.queued * 2);

      return {
        id,
        name: id.charAt(0).toUpperCase() + id.slice(1),
        healthPct: clampPct(health),
        enabled,
        stuck: queue.stuck,
        queued: queue.queued,
      };
    });

    const overallPct = channels.length
      ? Math.round(channels.reduce((sum, channel) => sum + channel.healthPct, 0) / channels.length)
      : 0;

    res.status(200).json({ overallPct, channels: channels.sort((a, b) => b.healthPct - a.healthPct) });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}
