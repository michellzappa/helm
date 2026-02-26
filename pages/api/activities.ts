import os from "os";
import { createHash } from "crypto";
import { createReadStream } from "fs";
import { readdir, readFile, stat } from "fs/promises";
import { join } from "path";
import { createInterface } from "readline";
import type { NextApiRequest, NextApiResponse } from "next";

const HOME = os.homedir();
const SESSIONS_DIR = join(HOME, ".openclaw/agents/main/sessions");
const SESSIONS_METADATA_PATH = join(SESSIONS_DIR, "sessions.json");
const CACHE_TTL_MS = 30_000;
const DEFAULT_SINCE_MS = 24 * 60 * 60 * 1000;
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

type ActivityType =
  | "tool_call"
  | "user_message"
  | "assistant_message"
  | "cron_run"
  | "compaction"
  | "error";

export interface Activity {
  id: string;
  timestamp: number;
  type: ActivityType;
  sessionKey: string;
  cronJobId?: string;
  channel?: "telegram" | "whatsapp" | "discord";
  model?: string;
  toolName?: string;
  summary: string;
  status: "ok" | "error";
}

interface SessionMetaEntry {
  sessionId?: unknown;
  model?: unknown;
}

type SessionsMetadata = Record<string, SessionMetaEntry>;

interface TranscriptLine {
  type?: unknown;
  timestamp?: unknown;
  message?: unknown;
}

interface MessageEvent {
  role?: unknown;
  content?: unknown;
  timestamp?: unknown;
  toolName?: unknown;
  isError?: unknown;
}

interface ContentItem {
  type?: unknown;
  text?: unknown;
  name?: unknown;
  arguments?: unknown;
}

interface ParseCacheEntry {
  at: number;
  since: number;
  activities: Activity[];
}

let parseCache: ParseCacheEntry | null = null;

function toTimestampMs(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value < 1e12 ? Math.floor(value * 1000) : Math.floor(value);
  }
  if (typeof value === "string") {
    const n = Number(value);
    if (Number.isFinite(n) && value.trim() !== "") {
      return n < 1e12 ? Math.floor(n * 1000) : Math.floor(n);
    }
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function shortText(input: string, max = 200): string {
  const clean = input.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, Math.max(0, max - 1)).trimEnd() + "…";
}

function hashId(sessionKey: string, timestamp: number, index: number): string {
  return createHash("sha1")
    .update(`${sessionKey}|${timestamp}|${index}`)
    .digest("hex")
    .slice(0, 16);
}

function extractSessionIdFromFile(fileName: string): string | null {
  const match = fileName.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  return match ? match[1] : null;
}

function deriveCronJobId(sessionKey: string): string | undefined {
  const match = sessionKey.match(/(^|:)cron:([^:]+)/);
  return match ? match[2] : undefined;
}

function deriveChannel(sessionKey: string): Activity["channel"] | undefined {
  if (sessionKey.includes(":telegram:")) return "telegram";
  if (sessionKey.includes(":whatsapp:")) return "whatsapp";
  if (sessionKey.includes(":discord:")) return "discord";
  return undefined;
}

function detectErrorText(text: string): boolean {
  return /\berror\b|\bfail(?:ed|ure)?\b/i.test(text);
}

function summarizeToolArgs(args: unknown): string {
  if (typeof args === "string") return shortText(args, 100);
  if (args == null) return "";
  try {
    return shortText(JSON.stringify(args), 100);
  } catch {
    return shortText(String(args), 100);
  }
}

function extractTextContent(content: unknown): string {
  if (!Array.isArray(content)) return "";
  const texts: string[] = [];
  for (const item of content) {
    if (!item || typeof item !== "object") continue;
    const c = item as ContentItem;
    if (c.type === "text" && typeof c.text === "string") {
      const t = c.text.trim();
      if (t) texts.push(t);
    }
  }
  return shortText(texts.join(" "), 200);
}

function buildLookup(metadata: SessionsMetadata): {
  sessionIdToKey: Map<string, string>;
  modelByKey: Map<string, string>;
} {
  const sessionIdToKey = new Map<string, string>();
  const modelByKey = new Map<string, string>();

  for (const [sessionKey, entry] of Object.entries(metadata)) {
    if (sessionKey.includes(":run:")) continue;
    const sessionId = typeof entry.sessionId === "string" ? entry.sessionId : "";
    const model = typeof entry.model === "string" ? entry.model : "";
    if (sessionId) sessionIdToKey.set(sessionId, sessionKey);
    if (model) modelByKey.set(sessionKey, model);
  }

  return { sessionIdToKey, modelByKey };
}

function parseTypeFilter(input: string | string[] | undefined): Set<ActivityType> | null {
  if (!input) return null;
  const raw = Array.isArray(input) ? input.join(",") : input;
  const set = new Set<ActivityType>();
  for (const token of raw.split(",").map(s => s.trim()).filter(Boolean)) {
    if (
      token === "tool_call" ||
      token === "user_message" ||
      token === "assistant_message" ||
      token === "cron_run" ||
      token === "compaction" ||
      token === "error"
    ) {
      set.add(token);
    }
  }
  return set.size ? set : null;
}

function parseSince(input: string | string[] | undefined): number {
  const raw = Array.isArray(input) ? input[0] : input;
  const parsed = toTimestampMs(raw ?? "");
  if (parsed && parsed > 0) return parsed;
  return Date.now() - DEFAULT_SINCE_MS;
}

function parseLimit(input: string | string[] | undefined): number {
  const raw = Array.isArray(input) ? input[0] : input;
  const n = Number(raw ?? DEFAULT_LIMIT);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.floor(n));
}

function pushActivity(
  activities: Activity[],
  lineIndex: number,
  activity: Omit<Activity, "id">
): void {
  activities.push({
    ...activity,
    id: hashId(activity.sessionKey, activity.timestamp, lineIndex),
  });
}

async function parseTranscriptFile(
  filePath: string,
  sessionKey: string,
  model: string | undefined,
  since: number
): Promise<Activity[]> {
  const activities: Activity[] = [];
  const cronJobId = deriveCronJobId(sessionKey);
  const channel = deriveChannel(sessionKey);
  let lineIndex = 0;
  let emittedCronRun = false;

  const stream = createReadStream(filePath, { encoding: "utf-8" });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });

  try {
    for await (const line of rl) {
      lineIndex += 1;
      if (!line.trim()) continue;

      let parsed: TranscriptLine;
      try {
        parsed = JSON.parse(line) as TranscriptLine;
      } catch {
        continue;
      }

      const eventType = typeof parsed.type === "string" ? parsed.type : "";
      const lineTs = toTimestampMs(parsed.timestamp);
      const eventTs = lineTs ?? Date.now();

      if (eventTs < since) continue;

      if (cronJobId && !emittedCronRun && (eventType === "session" || eventType === "message")) {
        pushActivity(activities, lineIndex, {
          timestamp: eventTs,
          type: "cron_run",
          sessionKey,
          cronJobId,
          channel,
          model,
          summary: shortText(`Cron run ${cronJobId}`),
          status: "ok",
        });
        emittedCronRun = true;
      }

      if (eventType === "compaction") {
        pushActivity(activities, lineIndex, {
          timestamp: eventTs,
          type: "compaction",
          sessionKey,
          cronJobId,
          channel,
          model,
          summary: shortText("Session compacted"),
          status: "ok",
        });
        continue;
      }

      if (eventType !== "message" || !parsed.message || typeof parsed.message !== "object") continue;

      const msg = parsed.message as MessageEvent;
      const role = typeof msg.role === "string" ? msg.role : "";
      const msgTs = toTimestampMs(msg.timestamp) ?? eventTs;
      if (msgTs < since) continue;

      const textSummary = extractTextContent(msg.content);

      if (role === "user" && textSummary) {
        pushActivity(activities, lineIndex, {
          timestamp: msgTs,
          type: "user_message",
          sessionKey,
          cronJobId,
          channel,
          model,
          summary: shortText(`User: ${textSummary}`),
          status: "ok",
        });
      }

      if (role === "assistant" && textSummary) {
        pushActivity(activities, lineIndex, {
          timestamp: msgTs,
          type: "assistant_message",
          sessionKey,
          cronJobId,
          channel,
          model,
          summary: shortText(`Assistant: ${textSummary}`),
          status: "ok",
        });
      }

      if (Array.isArray(msg.content)) {
        for (const item of msg.content) {
          if (!item || typeof item !== "object") continue;
          const c = item as ContentItem;
          if (c.type !== "toolCall") continue;
          const toolName = typeof c.name === "string" ? c.name : "tool";
          const argsSummary = summarizeToolArgs(c.arguments);
          const summary = argsSummary
            ? `Tool ${toolName}: ${argsSummary}`
            : `Tool ${toolName} called`;

          pushActivity(activities, lineIndex, {
            timestamp: msgTs,
            type: "tool_call",
            sessionKey,
            cronJobId,
            channel,
            model,
            toolName,
            summary: shortText(summary),
            status: "ok",
          });
        }
      }

      if (role === "toolResult") {
        const text = textSummary;
        const toolName = typeof msg.toolName === "string" ? msg.toolName : undefined;
        const isErrorFlag = msg.isError === true;
        const isError = isErrorFlag || (text ? detectErrorText(text) : false);
        if (isError) {
          pushActivity(activities, lineIndex, {
            timestamp: msgTs,
            type: "error",
            sessionKey,
            cronJobId,
            channel,
            model,
            toolName,
            summary: shortText(
              toolName
                ? `Error in ${toolName}: ${text || "Tool failed"}`
                : `Error: ${text || "Tool failed"}`
            ),
            status: "error",
          });
        }
      }
    }
  } finally {
    rl.close();
    stream.close();
  }

  return activities;
}

async function collectActivities(since: number): Promise<Activity[]> {
  if (parseCache && Date.now() - parseCache.at < CACHE_TTL_MS) {
    if (parseCache.since <= since) {
      return parseCache.activities.filter(activity => activity.timestamp >= since);
    }
  }

  const metadataRaw = await readFile(SESSIONS_METADATA_PATH, "utf-8");
  const metadata = JSON.parse(metadataRaw) as SessionsMetadata;
  const { sessionIdToKey, modelByKey } = buildLookup(metadata);

  const entries = await readdir(SESSIONS_DIR, { withFileTypes: true });
  const files = entries
    .filter(entry => entry.isFile() && entry.name.endsWith(".jsonl"))
    .map(entry => entry.name);

  const activities: Activity[] = [];

  for (const name of files) {
    const filePath = join(SESSIONS_DIR, name);

    let fileStat;
    try {
      fileStat = await stat(filePath);
    } catch {
      continue;
    }

    if (fileStat.mtimeMs < since) continue;

    const sessionId = extractSessionIdFromFile(name);
    const sessionKey = (sessionId && sessionIdToKey.get(sessionId)) || `session:${sessionId ?? name}`;
    const model = modelByKey.get(sessionKey);

    const fromFile = await parseTranscriptFile(filePath, sessionKey, model, since);
    activities.push(...fromFile);
  }

  activities.sort((a, b) => b.timestamp - a.timestamp);
  parseCache = { at: Date.now(), since, activities };
  return activities;
}

import { DEMO_MODE } from "../../lib/demo";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (DEMO_MODE) {
    const type = String(req.query.type ?? "");
    const totals: Record<string, number> = {
      "": 1356, "tool_call": 711, "user_message,assistant_message": 587, "cron_run": 15,
    };
    return res.status(200).json({ activities: [], total: totals[type] ?? 100 });
  }

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const since = parseSince(req.query.since);
    const limit = parseLimit(req.query.limit);
    const typeFilter = parseTypeFilter(req.query.type);
    const sessionKeyFilter = Array.isArray(req.query.sessionKey)
      ? req.query.sessionKey[0]
      : req.query.sessionKey;

    const all = await collectActivities(since);

    const filtered = all.filter(activity => {
      if (sessionKeyFilter && activity.sessionKey !== sessionKeyFilter) return false;
      if (typeFilter && !typeFilter.has(activity.type)) return false;
      return true;
    });

    res.status(200).json({
      activities: filtered.slice(0, limit),
      total: filtered.length,
    });
  } catch (error: unknown) {
    res.status(500).json({ error: String(error) });
  }
}
