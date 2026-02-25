import { exec } from "child_process";
import { promisify } from "util";
import type { NextApiRequest, NextApiResponse } from "next";

const execAsync = promisify(exec);

export interface SystemMetrics {
  cpu: { pct: number; loadAvg: [number, number, number] };
  ram: { usedBytes: number; totalBytes: number; pct: number };
  disk: { usedBytes: number; totalBytes: number; pct: number; mount: string };
}

async function getCpu(): Promise<SystemMetrics["cpu"]> {
  // macOS: top -l 1 gives CPU usage line and load avg
  const { stdout } = await execAsync("top -l 1 -n 0 -s 0", { timeout: 5000 });
  let pct = 0;
  let loadAvg: [number, number, number] = [0, 0, 0];

  const cpuLine = stdout.match(/CPU usage:\s*([\d.]+)%\s*user,\s*([\d.]+)%\s*sys/);
  if (cpuLine) pct = parseFloat(cpuLine[1]) + parseFloat(cpuLine[2]);

  const loadLine = stdout.match(/Load Avg:\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)/);
  if (loadLine) loadAvg = [parseFloat(loadLine[1]), parseFloat(loadLine[2]), parseFloat(loadLine[3])];

  return { pct: Math.round(pct * 10) / 10, loadAvg };
}

async function getRam(): Promise<SystemMetrics["ram"]> {
  // macOS: sysctl for physical memory, vm_stat for page usage
  const [sysctlOut, vmOut] = await Promise.all([
    execAsync("sysctl -n hw.memsize", { timeout: 3000 }),
    execAsync("vm_stat", { timeout: 3000 }),
  ]);
  const totalBytes = parseInt(sysctlOut.stdout.trim(), 10);
  const pageSize = 16384; // macOS default page size (bytes)

  const parse = (label: string) => {
    const m = vmOut.stdout.match(new RegExp(label + `[^:]*:\\s*(\\d+)`));
    return m ? parseInt(m[1], 10) * pageSize : 0;
  };
  const active   = parse("Pages active");
  const wired    = parse("Pages wired down");
  const specul   = parse("Pages speculative");
  const compress = parse("Pages occupied by compressor");
  const usedBytes = active + wired + specul + compress;

  const pct = totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 1000) / 10 : 0;
  return { usedBytes, totalBytes, pct };
}

async function getDisk(): Promise<SystemMetrics["disk"]> {
  // df -k / gives blocks in 512-byte units (macOS) — use -b for bytes
  const { stdout } = await execAsync("df -k /", { timeout: 3000 });
  const lines = stdout.trim().split("\n");
  const parts = lines[lines.length - 1].split(/\s+/);
  // columns: Filesystem, 1K-blocks, Used, Available, Capacity, iused, ifree, %iused, Mounted
  const totalKb = parseInt(parts[1], 10);
  const usedKb  = parseInt(parts[2], 10);
  const mount   = parts[8] ?? "/";
  const totalBytes = totalKb * 1024;
  const usedBytes  = usedKb  * 1024;
  const pct = totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 1000) / 10 : 0;
  return { usedBytes, totalBytes, pct, mount };
}

let _cache: { data: SystemMetrics; at: number } | null = null;
const TTL = 10_000; // system metrics refresh every 10s max

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  if (_cache && Date.now() - _cache.at < TTL) {
    return res.json(_cache.data);
  }
  try {
    const [cpu, ram, disk] = await Promise.all([getCpu(), getRam(), getDisk()]);
    const data: SystemMetrics = { cpu, ram, disk };
    _cache = { data, at: Date.now() };
    res.json(data);
  } catch (err: unknown) {
    res.status(500).json({ error: String(err) });
  }
}
