import os from "os";
import { createReadStream, existsSync, readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";
import { createInterface } from "readline";
import type { NextApiRequest, NextApiResponse } from "next";
import { withDemo } from "../../lib/demo-guard";
import { activity as _demoFixture } from "../../lib/demo-fixtures";
import { getOrFetch } from "../../lib/server-cache";

const HOME = os.homedir();
const TZ = process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
const LOOKBACK_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const CACHE_TTL_MS = 120_000;
const CACHE_KEY = "api:activity:session-jsonl:v1";

const SESSIONS_DIR = join(HOME, ".openclaw/agents/main/sessions");
const SESSIONS_INDEX_PATH = join(SESSIONS_DIR, "sessions.json");
const CRON_JOBS_PATH = join(HOME, ".openclaw/cron/jobs.json");

const CHANNELS = ["telegram", "whatsapp", "discord", "signal", "slack"] as const;

export interface DayBucket {
  date: string;
  user: number;
  system: number;
}

export interface ErrorEntry {
  tsMs: number;
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
  logSource: string;
  errors: ErrorEntry[];
}

function localDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function localHour(date: Date): number {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: TZ,
    hour: "numeric",
    hour12: false,
  }).formatToParts(date);
  return parseInt(parts.find((part) => part.type === "hour")?.value ?? "0", 10) % 24;
}

function buildDailyBuckets(nowMs: number): { daily: DayBucket[]; dateToIndex: Map<string, number> } {
  const daily: DayBucket[] = Array.from({ length: LOOKBACK_DAYS }, (_, i) => {
    const dayMs = nowMs - (LOOKBACK_DAYS - 1 - i) * DAY_MS;
    return { date: localDate(new Date(dayMs)), user: 0, system: 0 };
  });
  const dateToIndex = new Map<string, number>();
  daily.forEach((entry, index) => dateToIndex.set(entry.date, index));
  return { daily, dateToIndex };
}

function channelLabel(name: string): string {
  if (name === "whatsapp") return "WhatsApp";
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function deriveChannels(): { name: string; label: string; count: number }[] {
  if (!existsSync(SESSIONS_INDEX_PATH)) return [];

  try {
    const parsed = JSON.parse(readFileSync(SESSIONS_INDEX_PATH, "utf-8")) as unknown;
    const keys = new Set<string>();

    if (
      parsed &&
      typeof parsed === "object" &&
      Array.isArray((parsed as { sessions?: unknown }).sessions)
    ) {
      for (const entry of (parsed as { sessions: unknown[] }).sessions) {
        const key = (entry as { key?: unknown })?.key;
        if (typeof key === "string") keys.add(key);
      }
    } else if (parsed && typeof parsed === "object") {
      for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
        if (typeof value === "object" && value !== null && "sessionId" in value) {
          keys.add(key);
        }
      }
    }

    const counts: Record<string, number> = {};
    for (const key of keys) {
      for (const channel of CHANNELS) {
        if (key.includes(`${channel}:`)) {
          counts[channel] = (counts[channel] ?? 0) + 1;
          break;
        }
      }
    }

    return Object.entries(counts)
      .map(([name, count]) => ({ name, label: channelLabel(name), count }))
      .sort((a, b) => b.count - a.count);
  } catch {
    return [];
  }
}

function cronStats(): { success: number; fail: number; total: number } {
  if (!existsSync(CRON_JOBS_PATH)) return { success: 0, fail: 0, total: 0 };

  try {
    const parsed = JSON.parse(readFileSync(CRON_JOBS_PATH, "utf-8")) as {
      jobs?: Array<{ state?: { lastStatus?: string } }>;
    };
    const jobs = Array.isArray(parsed.jobs) ? parsed.jobs : [];

    let success = 0;
    let fail = 0;

    for (const job of jobs) {
      const status = job.state?.lastStatus;
      if (status === "ok") success++;
      else if (status === "error" || status === "failed") fail++;
    }

    return { success, fail, total: jobs.length };
  } catch {
    return { success: 0, fail: 0, total: 0 };
  }
}

interface SessionStats {
  daily: DayBucket[];
  hourly: number[];
  totalEvents: number;
  logDays: number;
  logSource: string;
}

async function collectSessionStats(): Promise<SessionStats> {
  const nowMs = Date.now();
  const cutoffMs = nowMs - LOOKBACK_DAYS * DAY_MS;
  const { daily, dateToIndex } = buildDailyBuckets(nowMs);
  const hourly = new Array(24).fill(0);

  if (!existsSync(SESSIONS_DIR)) {
    return {
      daily,
      hourly,
      totalEvents: 0,
      logDays: 0,
      logSource: `${SESSIONS_DIR} (missing)`,
    };
  }

  const candidates = readdirSync(SESSIONS_DIR).filter((name) => name.endsWith(".jsonl"));
  const recentFiles: string[] = [];

  for (const name of candidates) {
    const filePath = join(SESSIONS_DIR, name);
    try {
      const stat = statSync(filePath);
      if (!stat.isFile()) continue;
      if (stat.mtimeMs >= cutoffMs) recentFiles.push(filePath);
    } catch {
      // Ignore inaccessible files.
    }
  }

  let totalEvents = 0;
  const activeDays = new Set<string>();

  for (const filePath of recentFiles) {
    const stream = createReadStream(filePath, { encoding: "utf-8" });
    const rl = createInterface({ input: stream, crlfDelay: Infinity });

    for await (const rawLine of rl) {
      const line = rawLine.trim();
      if (!line) continue;

      let event: {
        type?: string;
        timestamp?: string;
        message?: { role?: string };
      };

      try {
        event = JSON.parse(line) as {
          type?: string;
          timestamp?: string;
          message?: { role?: string };
        };
      } catch {
        continue;
      }

      if (typeof event.timestamp !== "string") continue;
      const tsMs = Date.parse(event.timestamp);
      if (!Number.isFinite(tsMs) || tsMs < cutoffMs) continue;

      const ts = new Date(tsMs);
      const day = localDate(ts);
      const dayIndex = dateToIndex.get(day);
      if (dayIndex === undefined) continue;

      if (event.type === "message") {
        const role = event.message?.role;
        if (role === "user" || role === "assistant") {
          daily[dayIndex].user++;
          activeDays.add(day);
          totalEvents++;
        } else if (role === "system" || role === "tool") {
          daily[dayIndex].system++;
          activeDays.add(day);
          totalEvents++;
        }

        hourly[localHour(ts)]++;
      } else if (event.type === "custom") {
        daily[dayIndex].system++;
        activeDays.add(day);
        totalEvents++;
      }
    }
  }

  return {
    daily,
    hourly,
    totalEvents,
    logDays: activeDays.size,
    logSource: `${SESSIONS_DIR} (${recentFiles.length}/${candidates.length} files, mtime>=cutoff)`,
  };
}

const GATEWAY_LOG = join(HOME, ".openclaw/logs/gateway.log");
const MAX_ERRORS = 50;

async function collectErrors(): Promise<ErrorEntry[]> {
  if (!existsSync(GATEWAY_LOG)) return [];

  const errors: ErrorEntry[] = [];
  const cutoff = Date.now() - LOOKBACK_DAYS * DAY_MS;

  try {
    const rl = createInterface({
      input: createReadStream(GATEWAY_LOG),
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      if (errors.length >= MAX_ERRORS) break;

      // Parse timestamp from start of line (ISO format)
      const tsMatch = line.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/);
      if (!tsMatch) continue;

      const ts = new Date(tsMatch[1]);
      if (isNaN(ts.getTime()) || ts.getTime() < cutoff) continue;

      // Check if this is an error or warn line
      const isError = line.includes('"level":"error"') || line.includes('level=error') || line.includes(' ERROR ') || line.includes(' ERROR]');
      const isWarn = line.includes('"level":"warn"') || line.includes('level=warn') || line.includes(' WARN ') || line.includes(' WARN]');

      if (!isError && !isWarn) continue;

      // Extract message - look for common patterns
      let message = line.slice(tsMatch[0].length).trim();
      // Try to extract cleaner message from JSON if present
      try {
        const jsonMatch = line.match(/\{.*\}$/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          message = parsed.message || parsed.error || parsed.msg || message;
        }
      } catch {}

      // Truncate long messages
      if (message.length > 200) message = message.slice(0, 200) + "…";

      errors.push({
        tsMs: ts.getTime(),
        level: isError ? "error" : "warn",
        subsystem: "gateway",
        message: message || "Unknown error",
      });
    }
  } catch {}

  // Sort newest first and limit
  return errors.sort((a, b) => b.tsMs - a.tsMs).slice(0, MAX_ERRORS);
}

async function fetchActivityData(): Promise<ActivityData> {
  const [sessionStats, channels, cron] = await Promise.all([
    collectSessionStats(),
    Promise.resolve(deriveChannels()),
    Promise.resolve(cronStats()),
  ]);

  const errors = await collectErrors();

  return {
    daily: sessionStats.daily,
    hourly: sessionStats.hourly,
    channels,
    cron,
    totalEvents: sessionStats.totalEvents,
    logDays: sessionStats.logDays,
    logSource: sessionStats.logSource,
    errors,
  };
}

async function handler(_req: NextApiRequest, res: NextApiResponse<ActivityData>) {
  const data = await getOrFetch<ActivityData>(CACHE_KEY, CACHE_TTL_MS, fetchActivityData);
  res.setHeader("Cache-Control", "s-maxage=60");
  res.status(200).json(data);
}

export default withDemo(_demoFixture, handler);
