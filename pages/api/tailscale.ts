import { exec } from "child_process";
import { promisify } from "util";
import type { NextApiRequest, NextApiResponse } from "next";

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

let cache: { data: TailscaleData; ts: number } | null = null;
const TTL = 2 * 60 * 1000; // 2 min — peer state doesn't thrash

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  if (cache && Date.now() - cache.ts < TTL) {
    return res.json(cache.data);
  }

  try {
    const { stdout } = await execAsync(`"${TAILSCALE_BIN}" status --json`, { timeout: 6000 });
    const raw = JSON.parse(stdout);

    const v4 = (ips: string[]) => ips.find(ip => ip.startsWith("100.")) ?? ips[0] ?? "—";

    const self: TailscaleData["self"] = {
      name: raw.Self?.HostName ?? "unknown",
      ip:   v4(raw.Self?.TailscaleIPs ?? []),
    };

    const peers: TailscalePeer[] = Object.values(raw.Peer ?? {}).map((p: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
      name:   p.HostName ?? "unknown",
      ip:     v4(p.TailscaleIPs ?? []),
      online: p.Online  ?? false,
      active: p.Active  ?? false,
    })).sort((a, b) => {
      // active first, then online, then name
      if (a.active !== b.active) return a.active ? -1 : 1;
      if (a.online !== b.online) return a.online ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    const data: TailscaleData = { self, peers, online: peers.filter(p => p.online).length };
    cache = { data, ts: Date.now() };
    res.json(data);
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Tailscale unavailable" });
  }
}
