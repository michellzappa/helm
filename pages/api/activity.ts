import os from "os";
import { readFileSync, existsSync, readdirSync } from "fs";
import { readFile } from "fs/promises";
import { join } from "path";
import type { NextApiRequest, NextApiResponse } from "next";

const HOME = os.homedir();
const TZ = process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

export interface DayBucket {
  date: string;   // YYYY-MM-DD
  user: number;
  system: number;
}

export interface ActivityData {
  daily: DayBucket[];
  hourly: number[];
  channels: { name: string; label: string; count: number }[];
  cron: { success: number; fail: number; total: number };
  totalEvents: number;
  logDays: number;
  logSource: string;   // which log path was used (for debugging)
}

const EMPTY: ActivityData = {
  daily: [],
  hourly: new Array(24).fill(0),
  channels: [],
  cron: { success: 0, fail: 0, total: 0 },
  totalEvents: 0,
  logDays: 0,
  logSource: "none",
};

// ── Log path discovery ─────────────────────────────────────────────────────
// Priority: 1) openclaw.json logging.file  2) /tmp/openclaw/ daily files  3) legacy stdout redirect
function discoverLogPaths(): { paths: string[]; source: string } {
  // 1. Custom path from openclaw.json
  try {
    const cfg = JSON.parse(readFileSync(join(HOME, ".openclaw/openclaw.json"), "utf-8"));
    if (cfg.logging?.file && existsSync(cfg.logging.file)) {
      return { paths: [cfg.logging.file], source: cfg.logging.file };
    }
  } catch {}

  // 2. Default: /tmp/openclaw/openclaw-YYYY-MM-DD.log (last 30 days)
  const tmpDir = "/tmp/openclaw";
  if (existsSync(tmpDir)) {
    const files = readdirSync(tmpDir)
      .filter(f => /^openclaw-\d{4}-\d{2}-\d{2}\.log$/.test(f))
      .map(f => join(tmpDir, f))
      .filter(p => existsSync(p))
      .sort(); // ascending = oldest first
    if (files.length > 0) {
      return { paths: files, source: tmpDir };
    }
  }

  // 3. Legacy: LaunchAgent stdout redirect
  const legacy = join(HOME, ".openclaw/logs/gateway.log");
  if (existsSync(legacy)) {
    return { paths: [legacy], source: legacy };
  }

  return { paths: [], source: "none" };
}

// ── Timestamp + message extraction (handles both formats) ──────────────────
const TS_RE = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))/;

interface LogEvent {
  ts: Date;
  subsystem: string;   // e.g. "gateway/channels/telegram"
  message: string;     // primary message text
}

function extractEvent(line: string): LogEvent | null {
  if (!line.trim()) return null;

  // JSONL format
  if (line.startsWith("{")) {
    try {
      const d = JSON.parse(line);
      const ts = new Date(d.time);
      if (isNaN(ts.getTime())) return null;
      let subsystem = "";
      try { subsystem = JSON.parse(d["0"])?.subsystem ?? ""; } catch { subsystem = String(d["0"] ?? ""); }
      const message = typeof d["1"] === "string" ? d["1"] : JSON.stringify(d["1"] ?? "");
      return { ts, subsystem, message };
    } catch { return null; }
  }

  // Plain-text format: "2026-02-11T06:57:28.806Z [subsystem] message..."
  const tsMatch = line.match(TS_RE);
  if (!tsMatch) return null;
  const ts = new Date(tsMatch[1]);
  if (isNaN(ts.getTime())) return null;
  const rest = line.slice(tsMatch[0].length).trim();
  const tagMatch = rest.match(/^\[([^\]]+)\]\s*(.*)/);
  const subsystem = tagMatch ? tagMatch[1] : "";
  const message = tagMatch ? tagMatch[2] : rest;
  return { ts, subsystem, message };
}

// ── Date/hour helpers ──────────────────────────────────────────────────────
function localDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(date);
}

function localHour(date: Date): number {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: TZ, hour: "numeric", hour12: false,
  }).formatToParts(date);
  return parseInt(parts.find(p => p.type === "hour")?.value ?? "0") % 24;
}

// ── Cron stats from jobs.json (more reliable than log parsing) ─────────────
async function cronStats(): Promise<{ success: number; fail: number; total: number }> {
  try {
    const raw = await readFile(join(HOME, ".openclaw/cron/jobs.json"), "utf-8");
    const jobs: any[] = JSON.parse(raw).jobs ?? [];
    let success = 0, fail = 0;
    for (const job of jobs) {
      const status = job.state?.lastRunStatus ?? job.state?.lastStatus;
      if (status === "ok") success++;
      else if (status === "error" || status === "failed") fail++;
    }
    return { success, fail, total: jobs.length };
  } catch { return { success: 0, fail: 0, total: 0 }; }
}

// ── Main parser ────────────────────────────────────────────────────────────
function parseLogPaths(paths: string[]): Omit<ActivityData, "cron" | "logSource"> {
  const now = new Date();
  const cutoff = localDate(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));

  const dailyUser: Record<string, number> = {};
  const dailySystem: Record<string, number> = {};
  const hourly = new Array(24).fill(0);
  const channelCounts: Record<string, number> = {};
  let totalEvents = 0;

  for (const filePath of paths) {
    let content: string;
    try { content = readFileSync(filePath, "utf-8"); } catch { continue; }

    for (const line of content.split("\n")) {
      const ev = extractEvent(line);
      if (!ev) continue;

      const date = localDate(ev.ts);
      if (date < cutoff) continue;

      const sub = ev.subsystem.toLowerCase();
      const msg = ev.message.toLowerCase();

      // ── Telegram user exchange
      if (sub.includes("telegram") && msg.includes("sendmessage ok")) {
        dailyUser[date] = (dailyUser[date] ?? 0) + 1;
        channelCounts["telegram"] = (channelCounts["telegram"] ?? 0) + 1;
        hourly[localHour(ev.ts)]++;
        totalEvents++;
        continue;
      }

      // ── WhatsApp inbound (plain-text log only; "Inbound message +X -> +Y")
      if (sub.includes("whatsapp") && msg.includes("inbound message") && msg.includes("->")) {
        dailyUser[date] = (dailyUser[date] ?? 0) + 1;
        channelCounts["whatsapp"] = (channelCounts["whatsapp"] ?? 0) + 1;
        hourly[localHour(ev.ts)]++;
        totalEvents++;
        continue;
      }

      // ── System background events
      if (
        sub.includes("heartbeat") ||
        sub.includes("gmail-watcher") ||
        sub.includes("delivery-recovery") ||
        sub.includes("health-monitor") ||
        sub.includes("tailscale") ||
        (sub.includes("cron") && (msg.includes("cron: started") || msg.includes("timer armed")))
      ) {
        dailySystem[date] = (dailySystem[date] ?? 0) + 1;
        totalEvents++;
      }
    }
  }

  const daily: DayBucket[] = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(now.getTime() - (29 - i) * 24 * 60 * 60 * 1000);
    const date = localDate(d);
    return { date, user: dailyUser[date] ?? 0, system: dailySystem[date] ?? 0 };
  });

  const activeDates = new Set([...Object.keys(dailyUser), ...Object.keys(dailySystem)]);

  const channels = Object.entries(channelCounts)
    .map(([name, count]) => ({
      name,
      label: name === "telegram" ? "Telegram" : name === "whatsapp" ? "WhatsApp" : name,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  return { daily, hourly, channels, totalEvents, logDays: activeDates.size };
}

// ── Cache + handler ────────────────────────────────────────────────────────
let _cache: { data: ActivityData; at: number } | null = null;
const TTL = 60_000;

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  const now = Date.now();
  if (_cache && now - _cache.at < TTL) {
    res.setHeader("Cache-Control", "s-maxage=60");
    return res.json(_cache.data);
  }

  const { paths, source } = discoverLogPaths();
  const [logData, cron] = await Promise.all([
    Promise.resolve(paths.length ? parseLogPaths(paths) : { ...EMPTY }),
    cronStats(),
  ]);

  const data: ActivityData = { ...logData, cron, logSource: source };
  _cache = { data, at: now };
  res.setHeader("Cache-Control", "s-maxage=60");
  res.json(data);
}
