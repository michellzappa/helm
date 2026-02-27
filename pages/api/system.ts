import { exec } from "child_process";
import { promisify } from "util";
import os from "os";
import type { NextApiRequest, NextApiResponse } from "next";
import { withDemo } from "../../lib/demo-guard";
import { system as _demoFixture } from "../../lib/demo-fixtures";

const execAsync = promisify(exec);

export interface SystemMetrics {
  cpu: { pct: number; loadAvg: [number, number, number] };
  ram: { usedBytes: number; totalBytes: number; pct: number };
  disk: { usedBytes: number; totalBytes: number; pct: number; mount: string };
  uptimeSeconds: number;
  hostname: string;
}

async function getCpu(): Promise<SystemMetrics["cpu"]> {
  const loadAvg = os.loadavg() as [number, number, number];

  if (process.platform === "darwin") {
    try {
      const { stdout } = await execAsync("top -l 1 -n 0 -s 0", { timeout: 5000 });
      const cpuLine = stdout.match(/CPU usage:\s*([\d.]+)%\s*user,\s*([\d.]+)%\s*sys/);
      if (cpuLine) {
        const pct = parseFloat(cpuLine[1]) + parseFloat(cpuLine[2]);
        return { pct: Math.round(pct * 10) / 10, loadAvg };
      }
    } catch { /* fall through */ }
  } else {
    // Linux: read /proc/stat for CPU usage
    try {
      const { stdout } = await execAsync("grep 'cpu ' /proc/stat", { timeout: 3000 });
      const parts = stdout.trim().split(/\s+/).slice(1).map(Number);
      const idle = parts[3] ?? 0;
      const total = parts.reduce((a, b) => a + b, 0);
      const pct = total > 0 ? Math.round(((total - idle) / total) * 1000) / 10 : 0;
      return { pct, loadAvg };
    } catch { /* fall through */ }
  }

  // Fallback: estimate from load avg vs CPU count
  const cpus = os.cpus().length || 1;
  const pct = Math.min(100, Math.round((loadAvg[0] / cpus) * 1000) / 10);
  return { pct, loadAvg };
}

async function getRam(): Promise<SystemMetrics["ram"]> {
  const totalBytes = os.totalmem();
  const freeBytes = os.freemem();
  const usedBytes = totalBytes - freeBytes;

  if (process.platform === "darwin") {
    // macOS: os.freemem() is inaccurate, use vm_stat for better precision
    try {
      const { stdout } = await execAsync("vm_stat", { timeout: 3000 });
      const pageSize = 16384;
      const parse = (label: string) => {
        const m = stdout.match(new RegExp(label + `[^:]*:\\s*(\\d+)`));
        return m ? parseInt(m[1], 10) * pageSize : 0;
      };
      const active   = parse("Pages active");
      const wired    = parse("Pages wired down");
      const specul   = parse("Pages speculative");
      const compress = parse("Pages occupied by compressor");
      const macUsed = active + wired + specul + compress;
      const pct = totalBytes > 0 ? Math.round((macUsed / totalBytes) * 1000) / 10 : 0;
      return { usedBytes: macUsed, totalBytes, pct };
    } catch { /* fall through to generic */ }
  }

  const pct = totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 1000) / 10 : 0;
  return { usedBytes, totalBytes, pct };
}

async function getDisk(): Promise<SystemMetrics["disk"]> {
  try {
    const { stdout } = await execAsync("df -k /", { timeout: 3000 });
    const lines = stdout.trim().split("\n");
    const parts = lines[lines.length - 1].split(/\s+/);
    // Linux: Filesystem, 1K-blocks, Used, Available, Use%, Mounted
    // macOS: Filesystem, 1K-blocks, Used, Available, Capacity, iused, ifree, %iused, Mounted
    const totalKb = parseInt(parts[1], 10);
    const usedKb  = parseInt(parts[2], 10);
    // Mount is last column on both platforms
    const mount   = parts[parts.length - 1] ?? "/";
    const totalBytes = totalKb * 1024;
    const usedBytes  = usedKb  * 1024;
    const pct = totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 1000) / 10 : 0;
    return { usedBytes, totalBytes, pct, mount };
  } catch {
    return { usedBytes: 0, totalBytes: 0, pct: 0, mount: "/" };
  }
}

let _cache: { data: SystemMetrics; at: number } | null = null;
const TTL = 10_000; // system metrics refresh every 10s max

async function handler(_req: NextApiRequest, res: NextApiResponse) {
  if (_cache && Date.now() - _cache.at < TTL) {
    return res.json(_cache.data);
  }
  try {
    const [cpu, ram, disk] = await Promise.all([getCpu(), getRam(), getDisk()]);
    const data: SystemMetrics = {
      cpu, ram, disk,
      uptimeSeconds: os.uptime(),
      hostname: os.hostname(),
    };
    _cache = { data, at: Date.now() };
    res.json(data);
  } catch (err: unknown) {
    res.status(500).json({ error: String(err) });
  }
}

export default withDemo(_demoFixture, handler);
