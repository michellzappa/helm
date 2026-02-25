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

export interface ErrorEntry {
  tsMs: number;       // Unix ms
  level: "warn" | "error";
  subsystem: string;
  message: string;
}

export interface ActivityData {
  daily: DayBucket[];
  hourly: number[];
  channels: { name: string; label: string; count: number }[];
  cron: { success: number; fail: number; total: number };
  totalEvents: number;
  logDays: number;
  logSource: string;   // which log path was used (for debugging)
  errors: ErrorEntry[];
}

const EMPTY: ActivityData = {
  daily: [],
  hourly: new Array(24).fill(0),
  channels: [],
  cron: { success: 0, fail: 0, total: 0 },
  totalEvents: 0,
  logDays: 0,
  logSource: "none",
  errors: [],
};

// ── Log path discovery ─────────────────────────────────────────────────────
// Collects ALL available log sources; caller deduplicates by date.
interface LogSource {
  path: string;
  datesOwned: Set<string> | null; // null = multi-day file (legacy redirect)
}

function discoverLogSources(): { sources: LogSource[]; label: string } {
  const sources: LogSource[] = [];
  const labels: string[] = [];

  // 1. Custom path from openclaw.json
  try {
    const cfg = JSON.parse(readFileSync(join(HOME, ".openclaw/openclaw.json"), "utf-8"));
    if (cfg.logging?.file && existsSync(cfg.logging.file)) {
      sources.push({ path: cfg.logging.file, datesOwned: null });
      labels.push(cfg.logging.file);
    }
  } catch {}

  // 2. Default: /tmp/openclaw/openclaw-YYYY-MM-DD.log (date-rotated JSONL)
  const tmpDir = "/tmp/openclaw";
  if (existsSync(tmpDir)) {
    const files = readdirSync(tmpDir)
      .filter(f => /^openclaw-\d{4}-\d{2}-\d{2}\.log$/.test(f))
      .sort(); // oldest first
    for (const f of files) {
      const dateMatch = f.match(/openclaw-(\d{4}-\d{2}-\d{2})\.log/);
      const path = join(tmpDir, f);
      if (dateMatch && existsSync(path)) {
        sources.push({ path, datesOwned: new Set([dateMatch[1]]) });
      }
    }
    if (files.length) labels.push(tmpDir);
  }

  // 3. Legacy: LaunchAgent stdout redirect (multi-day, fills gaps)
  const legacy = join(HOME, ".openclaw/logs/gateway.log");
  if (existsSync(legacy)) {
    sources.push({ path: legacy, datesOwned: null });
    labels.push(legacy);
  }

  return { sources, label: labels.join(" + ") || "none" };
}

// ── Timestamp + message extraction (handles both formats) ──────────────────
const TS_RE = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))/;

interface LogEvent {
  ts: Date;
  subsystem: string;   // e.g. "gateway/channels/telegram"
  message: string;     // primary message text
  level?: "warn" | "error";
}

// Extract errorMessage= value from plain-text log lines
function extractErrorMessage(text: string): string {
  const m = text.match(/errorMessage=(.+?)(?:\s+conn=|\s+channel=|\s+error=|$)/);
  return m ? m[1].trim() : text;
}

function extractEvent(line: string): LogEvent | null {
  if (!line.trim()) return null;

  // JSONL format
  if (line.startsWith("{")) {
    try {
      const d = JSON.parse(line);
      const ts = new Date(d.time);
      if (isNaN(ts.getTime())) return null;

      // Determine level from _meta first (needed to decide field mapping)
      let level: LogEvent["level"];
      const lvlName: string = d._meta?.logLevelName ?? "";
      if (lvlName === "ERROR" || (d._meta?.logLevelId ?? 0) >= 5) level = "error";
      else if (lvlName === "WARN" || (d._meta?.logLevelId ?? 0) === 4) level = "warn";

      // d["0"] is either:
      //   a) JSON string like '{"subsystem":"gateway/ws"}' (INFO/WARN entries)
      //   b) A plain error message string (ERROR entries, or entries without subsystem wrapper)
      let subsystem = "";
      let message = "";

      let field0Parsed: Record<string, unknown> | null = null;
      try { field0Parsed = JSON.parse(d["0"]); } catch {}

      if (field0Parsed?.subsystem) {
        // Case (a): d["0"] is a subsystem wrapper, d["1"]/d["2"] has the message
        subsystem = String(field0Parsed.subsystem);
        if (typeof d["1"] === "string" && d["1"]) {
          message = d["1"];
        } else if (typeof d["1"] === "object" && d["1"] !== null) {
          const obj = d["1"] as Record<string, unknown>;
          if (obj.errorMessage) message = String(obj.errorMessage);
          else if (obj.cause) message = String(obj.cause);
          else message = JSON.stringify(obj);
        }
        // d["2"] often has a cleaner summary string (e.g. "closed before connect conn=...")
        if (typeof d["2"] === "string" && d["2"].length > 0 && d["2"].length < 300) {
          message = d["2"];
        }
      } else {
        // Case (b): d["0"] is the actual message; subsystem not available in this entry
        message = typeof d["0"] === "string" ? d["0"] : JSON.stringify(d["0"] ?? "");
        subsystem = "";
      }

      return { ts, subsystem, message, level };
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
  // Detect errors in plain-text: lines with ✗ or errorCode=
  let level: LogEvent["level"];
  if (message.includes("✗") || message.includes("errorCode=")) level = "error";
  else if (message.toLowerCase().includes("warn")) level = "warn";
  return { ts, subsystem, message: level === "error" ? extractErrorMessage(message) : message, level };
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

const MAX_ERRORS = 200;
const MAX_WARNS  = 100;

// High-volume, low-signal WARN patterns to suppress (WebSocket connection lifecycle noise)
const WARN_NOISE_PREFIXES = [
  "unauthorized",          // repeated auth failures from misconfigured nodes
  "closed before connect", // WS handshake abandon
  "closed ",               // generic WS close frames
  "proxy ",                // reverse-proxy forwarding noise
];

function isNoisyWarn(entry: ErrorEntry): boolean {
  if (entry.level !== "warn") return false;
  const msg = entry.message.toLowerCase();
  return WARN_NOISE_PREFIXES.some(p => msg.startsWith(p));
}

// ── Main parser ────────────────────────────────────────────────────────────
function parseLogSources(sources: LogSource[]): Omit<ActivityData, "cron" | "logSource"> {
  // Build set of dates owned by specific-date sources (to avoid double-counting)
  const ownedDates = new Set<string>();
  for (const s of sources) {
    if (s.datesOwned) s.datesOwned.forEach(d => ownedDates.add(d));
  }
  return parseLogPaths(sources, ownedDates);
}

function parseLogPaths(sources: LogSource[], ownedDates: Set<string>): Omit<ActivityData, "cron" | "logSource"> {
  const now = new Date();
  const cutoff = localDate(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));

  const dailyUser: Record<string, number> = {};
  const dailySystem: Record<string, number> = {};
  const hourly = new Array(24).fill(0);
  const channelCounts: Record<string, number> = {};
  let totalEvents = 0;
  // Use a Map keyed by "tsMs|message" to deduplicate across sources
  const errorMap = new Map<string, ErrorEntry>();

  for (const source of sources) {
    let content: string;
    try { content = readFileSync(source.path, "utf-8"); } catch { continue; }

    for (const line of content.split("\n")) {
      const ev = extractEvent(line);
      if (!ev) continue;

      const date = localDate(ev.ts);
      if (date < cutoff) continue;

      // Multi-day sources (legacy log) skip dates already covered by dated JSONL files
      if (!source.datesOwned && ownedDates.has(date)) continue;

      const sub = ev.subsystem.toLowerCase();
      const msg = ev.message.toLowerCase();

      // ── Collect warnings/errors
      if (ev.level) {
        const key = `${ev.ts.getTime()}|${ev.message.slice(0, 80)}`;
        if (!errorMap.has(key)) {
          // Strip leading "gateway/" prefix for brevity
          const cleanSub = ev.subsystem.replace(/^gateway\//, "");
          errorMap.set(key, {
            tsMs: ev.ts.getTime(),
            level: ev.level,
            subsystem: cleanSub,
            message: ev.message,
          });
        }
      }

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

  // Separate errors and warns; filter noise; cap each independently; errors first
  const allEntries = Array.from(errorMap.values())
    .filter(e => !isNoisyWarn(e))
    .sort((a, b) => b.tsMs - a.tsMs);

  const errorEntries = allEntries.filter(e => e.level === "error").slice(0, MAX_ERRORS);
  const warnEntries  = allEntries.filter(e => e.level === "warn").slice(0, MAX_WARNS);
  const errors = [...errorEntries, ...warnEntries];

  return { daily, hourly, channels, totalEvents, logDays: activeDates.size, errors };
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

  const { sources, label } = discoverLogSources();
  const [logData, cron] = await Promise.all([
    Promise.resolve(sources.length ? parseLogSources(sources) : { ...EMPTY }),
    cronStats(),
  ]);

  const data: ActivityData = { ...logData, cron, logSource: label };
  _cache = { data, at: now };
  res.setHeader("Cache-Control", "s-maxage=60");
  res.json(data);
}
