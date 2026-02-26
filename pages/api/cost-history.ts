import os from "os";
import { createReadStream } from "fs";
import { readdir, readFile, stat } from "fs/promises";
import { join, basename } from "path";
import * as readline from "readline";
import type { NextApiRequest, NextApiResponse } from "next";
import { withDemo } from "../../lib/demo-guard";
import { costHistory as _demoFixture } from "../../lib/demo-fixtures";

const HOME = os.homedir();
const SESSIONS_DIR = join(HOME, ".openclaw/agents/main/sessions");
const SESSIONS_JSON = join(SESSIONS_DIR, "sessions.json");
const TTL = 60_000;
const MAX_CONCURRENCY = 20;

type SessionKind = "direct" | "cron" | "telegram" | "whatsapp" | "api" | "other";

interface CostEvent {
  timestampMs: number;
  cost: number;
  model: string;
  sessionId: string;
  sessionKey: string;
  kind: SessionKind;
}

export interface CostHistoryData {
  summary: { today: number; week: number; month: number; allTime: number };
  byModel: { model: string; cost: number; percent: number }[];
  byKind: { kind: string; cost: number; percent: number }[];
  daily: { date: string; cost: number }[];
  currency: "USD";
}

interface SessionRecord {
  sessionId?: string;
}

interface FileCacheEntry {
  mtimeMs: number;
  size: number;
  events: CostEvent[];
}

let responseCache: { at: number; data: CostHistoryData } | null = null;
const transcriptFileCache = new Map<string, FileCacheEntry>();

function parseKey(key: string): { kind: SessionKind; label: string } {
  const rest = key.replace(/^agent:[^:]+:/, "");
  if (rest === "main") return { kind: "direct", label: "Main session" };
  if (rest.startsWith("cron:")) return { kind: "cron", label: "Cron — " + rest.slice(5, 13) + "…" };
  if (rest.startsWith("telegram:group:")) return { kind: "telegram", label: "Telegram — " + rest.replace("telegram:group:", "") };
  if (rest.startsWith("whatsapp:group:")) {
    return { kind: "whatsapp", label: "WhatsApp — " + rest.replace("whatsapp:group:", "").replace(/@.*/, "") };
  }
  if (rest.startsWith("openai:")) return { kind: "api", label: "API — " + rest.slice(7, 15) + "…" };
  return { kind: "other", label: rest.slice(0, 30) };
}

function isoDate(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfTodayMs(nowMs: number): number {
  const d = new Date(nowMs);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function daysAgoStartMs(daysAgo: number): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d.getTime();
}

function toFiniteNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

async function loadSessionIdToKey(): Promise<Map<string, string>> {
  const raw = await readFile(SESSIONS_JSON, "utf-8");
  const all = JSON.parse(raw) as Record<string, SessionRecord>;
  const map = new Map<string, string>();
  for (const [key, record] of Object.entries(all)) {
    const sessionId = typeof record?.sessionId === "string" ? record.sessionId : "";
    if (sessionId) map.set(sessionId, key);
  }
  return map;
}

async function parseTranscriptFile(
  filepath: string,
  sessionId: string,
  sessionKeyById: Map<string, string>
): Promise<CostEvent[]> {
  const info = await stat(filepath);
  const cached = transcriptFileCache.get(filepath);
  if (cached && cached.mtimeMs === info.mtimeMs && cached.size === info.size) {
    return cached.events;
  }

  const sessionKey = sessionKeyById.get(sessionId) ?? "";
  const kind = sessionKey ? parseKey(sessionKey).kind : "other";
  const events: CostEvent[] = [];

  const stream = createReadStream(filepath, { encoding: "utf-8" });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  try {
    for await (const line of rl) {
      if (!line.trim()) continue;

      let row: unknown;
      try {
        row = JSON.parse(line);
      } catch {
        continue;
      }

      if (!row || typeof row !== "object") continue;
      const typedRow = row as { type?: unknown; timestamp?: unknown; message?: unknown };
      if (typedRow.type !== "message") continue;
      if (!typedRow.message || typeof typedRow.message !== "object") continue;

      const message = typedRow.message as {
        role?: unknown;
        model?: unknown;
        timestamp?: unknown;
        usage?: unknown;
      };
      if (message.role !== "assistant") continue;

      const usage = (message.usage ?? {}) as { cost?: unknown };
      const costNode = (usage.cost ?? {}) as { total?: unknown };
      const costTotal = toFiniteNumber(costNode.total);
      if (!(costTotal > 0)) continue;

      const timestampSource =
        (typeof message.timestamp === "string" ? message.timestamp : null) ??
        (typeof typedRow.timestamp === "string" ? typedRow.timestamp : null);
      const timestampMs = timestampSource ? Date.parse(timestampSource) : Number.NaN;
      if (!Number.isFinite(timestampMs)) continue;

      const model = typeof message.model === "string" && message.model ? message.model : "unknown";
      events.push({
        timestampMs,
        cost: costTotal,
        model,
        sessionId,
        sessionKey,
        kind,
      });
    }
  } finally {
    rl.close();
    stream.close();
  }

  transcriptFileCache.set(filepath, { mtimeMs: info.mtimeMs, size: info.size, events });
  return events;
}

async function parseAllEvents(sessionKeyById: Map<string, string>): Promise<CostEvent[]> {
  const files = await readdir(SESSIONS_DIR);
  const transcriptFiles = files
    .filter(name => name.endsWith(".jsonl"))
    .map(name => ({
      filename: name,
      sessionId: basename(name, ".jsonl"),
      filepath: join(SESSIONS_DIR, name),
    }));

  const events: CostEvent[] = [];
  for (let i = 0; i < transcriptFiles.length; i += MAX_CONCURRENCY) {
    const batch = transcriptFiles.slice(i, i + MAX_CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(file => parseTranscriptFile(file.filepath, file.sessionId, sessionKeyById))
    );
    for (const result of batchResults) events.push(...result);
  }
  return events;
}

function buildResponse(events: CostEvent[]): CostHistoryData {
  const now = Date.now();
  const todayStart = startOfTodayMs(now);
  const weekStart = daysAgoStartMs(6);
  const monthStart = daysAgoStartMs(29);

  let today = 0;
  let week = 0;
  let month = 0;
  let allTime = 0;

  const costByModel = new Map<string, number>();
  const costByKind = new Map<string, number>();
  const dailyBuckets = new Map<string, number>();

  for (let i = 29; i >= 0; i--) {
    dailyBuckets.set(isoDate(daysAgoStartMs(i)), 0);
  }

  for (const event of events) {
    allTime += event.cost;
    if (event.timestampMs >= todayStart) today += event.cost;
    if (event.timestampMs >= weekStart) week += event.cost;
    if (event.timestampMs >= monthStart) month += event.cost;

    costByModel.set(event.model, (costByModel.get(event.model) ?? 0) + event.cost);
    costByKind.set(event.kind, (costByKind.get(event.kind) ?? 0) + event.cost);

    if (event.timestampMs >= monthStart) {
      const key = isoDate(event.timestampMs);
      if (dailyBuckets.has(key)) {
        dailyBuckets.set(key, (dailyBuckets.get(key) ?? 0) + event.cost);
      }
    }
  }

  const byModel = Array.from(costByModel.entries())
    .map(([model, cost]) => ({
      model,
      cost,
      percent: allTime > 0 ? (cost / allTime) * 100 : 0,
    }))
    .sort((a, b) => b.cost - a.cost);

  const byKind = Array.from(costByKind.entries())
    .map(([kind, cost]) => ({
      kind,
      cost,
      percent: allTime > 0 ? (cost / allTime) * 100 : 0,
    }))
    .sort((a, b) => b.cost - a.cost);

  const daily = Array.from(dailyBuckets.entries()).map(([date, cost]) => ({ date, cost }));

  return {
    summary: { today, week, month, allTime },
    byModel,
    byKind,
    daily,
    currency: "USD",
  };
}

async function handler(_req: NextApiRequest, res: NextApiResponse) {
  if (responseCache && Date.now() - responseCache.at < TTL) {
    return res.status(200).json(responseCache.data);
  }

  try {
    const sessionKeyById = await loadSessionIdToKey();
    const events = await parseAllEvents(sessionKeyById);
    const data = buildResponse(events);
    responseCache = { at: Date.now(), data };
    res.status(200).json(data);
  } catch (err: unknown) {
    res.status(500).json({ error: String(err) });
  }
}

export default withDemo(_demoFixture, handler);
