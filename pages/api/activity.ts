import { readFileSync, existsSync } from "fs";
import { join } from "path";
import type { NextApiRequest, NextApiResponse } from "next";

const HOME = process.env.HOME || "/Users/botbot";
const LOG_PATH = join(HOME, ".openclaw/logs/gateway.log");

export interface DayBucket {
  date: string;   // YYYY-MM-DD
  user: number;
  system: number;
}

export interface ActivityData {
  daily: DayBucket[];        // 30 entries, oldest → newest
  hourly: number[];          // 24 values, index = local hour (Amsterdam)
  channels: { name: string; label: string; count: number }[];
  cron: { success: number; fail: number };
  totalEvents: number;
  logDays: number;
}

const EMPTY: ActivityData = {
  daily: [],
  hourly: new Array(24).fill(0),
  channels: [],
  cron: { success: 0, fail: 0 },
  totalEvents: 0,
  logDays: 0,
};

// Simple in-memory cache (60s TTL)
let _cache: { data: ActivityData; at: number } | null = null;
const TTL = 60_000;

function localDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function localHour(date: Date): number {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Europe/Amsterdam",
    hour: "numeric",
    hour12: false,
  }).formatToParts(date);
  return parseInt(parts.find(p => p.type === "hour")?.value ?? "0") % 24;
}

const TS_RE = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))/;

function parse(): ActivityData {
  if (!existsSync(LOG_PATH)) return EMPTY;

  const lines = readFileSync(LOG_PATH, "utf-8").split("\n");
  const now = new Date();
  const cutoff = localDate(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));

  const dailyUser: Record<string, number> = {};
  const dailySystem: Record<string, number> = {};
  const hourly = new Array(24).fill(0);
  const channelCounts: Record<string, number> = {};
  let cronSuccess = 0;
  let cronFail = 0;
  let totalEvents = 0;

  for (const line of lines) {
    const tsMatch = line.match(TS_RE);
    if (!tsMatch) continue;

    const ts = new Date(tsMatch[1]);
    const date = localDate(ts);
    if (date < cutoff) continue;

    // ── Cron runs (inside [ws] lines) ──────────────────────
    if (line.includes("cron.run")) {
      if (line.includes("✓")) cronSuccess++;
      else if (line.includes("✗")) cronFail++;
      dailySystem[date] = (dailySystem[date] ?? 0) + 1;
      totalEvents++;
      continue;
    }

    // ── Telegram: count outbound sendMessage as user exchanges
    if (line.includes("[telegram]") && line.includes("sendMessage ok")) {
      dailyUser[date] = (dailyUser[date] ?? 0) + 1;
      channelCounts["telegram"] = (channelCounts["telegram"] ?? 0) + 1;
      hourly[localHour(ts)]++;
      totalEvents++;
      continue;
    }

    // ── WhatsApp: count explicit inbound messages
    if (line.includes("[whatsapp]") && line.includes("Inbound message")) {
      dailyUser[date] = (dailyUser[date] ?? 0) + 1;
      channelCounts["whatsapp"] = (channelCounts["whatsapp"] ?? 0) + 1;
      hourly[localHour(ts)]++;
      totalEvents++;
      continue;
    }

    // ── System background activity ──────────────────────────
    if (
      line.includes("[heartbeat]") ||
      line.includes("[gmail-watcher]") ||
      line.includes("[delivery-recovery]") ||
      line.includes("[health-monitor]") ||
      line.includes("[tailscale]")
    ) {
      dailySystem[date] = (dailySystem[date] ?? 0) + 1;
      totalEvents++;
    }
  }

  // 30-day array, zero-filled
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

  return {
    daily,
    hourly,
    channels,
    cron: { success: cronSuccess, fail: cronFail },
    totalEvents,
    logDays: activeDates.size,
  };
}

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  const now = Date.now();
  if (!_cache || now - _cache.at > TTL) {
    _cache = { data: parse(), at: now };
  }
  res.setHeader("Cache-Control", "s-maxage=60");
  res.json(_cache.data);
}
