import os from "os";
import { readFile } from "fs/promises";
import { join } from "path";
import type { NextApiRequest, NextApiResponse } from "next";
import { withDemo } from "../../lib/demo-guard";
import { nodes as _demoFixture } from "../../lib/demo-fixtures";
import { getOrFetch } from "../../lib/server-cache";

const HOME = os.homedir();
const TTL_MS = 120_000;

export interface PairedNode {
  deviceId: string;
  displayName: string;
  platform: string;
  clientMode: string;
  role: string;
  createdAtMs: number;
  lastUsedAtMs: number;
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PairedNode[] | { error: string }>
) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const nodes = await getOrFetch<PairedNode[]>("api-nodes", TTL_MS, async () => {
      const raw = await readFile(join(HOME, ".openclaw/devices/paired.json"), "utf-8");
      const data: Record<string, any> = JSON.parse(raw);

      const parsed: PairedNode[] = Object.values(data).map((d: any) => {
        const lastUsed = Object.values(d.tokens || {}).reduce(
          (max: number, t: any) => Math.max(max, t.lastUsedAtMs || 0),
          0
        );
        return {
          deviceId: d.deviceId,
          displayName: d.displayName || d.clientId || d.deviceId.slice(0, 8),
          platform: d.platform || "unknown",
          clientMode: d.clientMode || d.role || "unknown",
          role: (d.roles || [d.role]).filter(Boolean).join(", "),
          createdAtMs: d.createdAtMs || 0,
          lastUsedAtMs: lastUsed,
        };
      });

      parsed.sort((a, b) => b.lastUsedAtMs - a.lastUsedAtMs);
      return parsed;
    });

    nodes.sort((a, b) => b.lastUsedAtMs - a.lastUsedAtMs);

    res.status(200).json(nodes);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

export default withDemo(_demoFixture, handler);
