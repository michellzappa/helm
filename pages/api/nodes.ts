import os from "os";
import { readFile } from "fs/promises";
import { join } from "path";
import { createHandler } from "@/lib/api/handler";
import { nodes as _demoFixture } from "@/lib/demo-fixtures";

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

export default createHandler<PairedNode[]>({
  cacheKey: "api-nodes",
  cacheTtlMs: TTL_MS,
  demoFixture: _demoFixture,
  handler: async () => {
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

    return parsed.sort((a, b) => b.lastUsedAtMs - a.lastUsedAtMs);
  },
});
