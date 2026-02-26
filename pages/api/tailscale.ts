import { exec } from "child_process";
import { promisify } from "util";
import type { NextApiRequest, NextApiResponse } from "next";
import { withDemo } from "../../lib/demo-guard";
import { tailscale as _demoFixture } from "../../lib/demo-fixtures";
import { getOrFetch } from "../../lib/server-cache";

const execAsync = promisify(exec);

// macOS Tailscale CLI lives inside the app bundle
const TAILSCALE_BIN = process.env.TAILSCALE_BIN
  ?? "/Applications/Tailscale.app/Contents/MacOS/Tailscale";

export interface TailscalePeer {
  name: string;
  ip: string;       // first IPv4 (100.x.x.x)
  online: boolean;
  active: boolean;  // has recent traffic
}

export interface TailscaleData {
  self: { name: string; ip: string };
  peers: TailscalePeer[];
  online: number;  // count of online peers
}

const TTL_MS = 120_000;

async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const data = await getOrFetch<TailscaleData>("api-tailscale", TTL_MS, async () => {
      const { stdout } = await execAsync(`"${TAILSCALE_BIN}" status --json`, { timeout: 6000 });
      const raw = JSON.parse(stdout);

      const v4 = (ips: string[]) => ips.find((ip) => ip.startsWith("100.")) ?? ips[0] ?? "—";

      const self: TailscaleData["self"] = {
        name: raw.Self?.HostName ?? "unknown",
        ip: v4(raw.Self?.TailscaleIPs ?? []),
      };

      const peers: TailscalePeer[] = Object.values(raw.Peer ?? {}).map((p: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
        name: p.HostName ?? "unknown",
        ip: v4(p.TailscaleIPs ?? []),
        online: p.Online ?? false,
        active: p.Active ?? false,
      })).sort((a, b) => {
        if (a.active !== b.active) return a.active ? -1 : 1;
        if (a.online !== b.online) return a.online ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

      return { self, peers, online: peers.filter((p) => p.online).length };
    });
    res.json(data);
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Tailscale unavailable" });
  }
}

export default withDemo(_demoFixture, handler);
