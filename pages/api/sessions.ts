import os from "os";
import { readFile } from "fs/promises";
import { join } from "path";
import type { NextApiRequest, NextApiResponse } from "next";
import { withDemo } from "../../lib/demo-guard";
import { sessions as _demoFixture } from "../../lib/demo-fixtures";

const HOME = os.homedir();

// EUR per million tokens (Anthropic published pricing, converted at ~1.08 USD/EUR)
// Keys: both short ("claude-sonnet-4-6") and full ("anthropic/claude-sonnet-4-6") forms
const MODEL_PRICING: Record<string, { input: number; output: number; cacheRead: number; cacheWrite: number }> = {
  "claude-sonnet-4-6":           { input: 3.00,  output: 15.00,  cacheRead: 0.30,  cacheWrite: 3.75   },
  "claude-haiku-4-5":            { input: 0.75,  output: 3.75,   cacheRead: 0.075, cacheWrite: 0.9375 },
  "claude-opus-4-6":             { input: 14.00, output: 70.00,  cacheRead: 1.40,  cacheWrite: 17.50  },
  "anthropic/claude-sonnet-4-6": { input: 3.00,  output: 15.00,  cacheRead: 0.30,  cacheWrite: 3.75   },
  "anthropic/claude-haiku-4-5":  { input: 0.75,  output: 3.75,   cacheRead: 0.075, cacheWrite: 0.9375 },
  "anthropic/claude-opus-4-6":   { input: 14.00, output: 70.00,  cacheRead: 1.40,  cacheWrite: 17.50  },
};

function calcCost(model: string, input: number, output: number, cacheRead: number, cacheWrite: number): number {
  // Strip provider prefix for lookup if needed
  const p = MODEL_PRICING[model] ?? MODEL_PRICING[model.replace(/^[^/]+\//, "")];
  if (!p) return 0;
  return (
    (input     * p.input      +
     output    * p.output     +
     cacheRead * p.cacheRead  +
     cacheWrite* p.cacheWrite) / 1_000_000
  );
}

export interface SessionEntry {
  key: string;
  sessionId: string;
  kind: "direct" | "cron" | "telegram" | "whatsapp" | "api" | "other";
  label: string;
  model: string | null;
  inputTokens: number;
  outputTokens: number;
  cacheRead: number;
  cacheWrite: number;
  totalTokens: number;
  costEur: number;
  updatedAt: number;
}

export interface SessionsData {
  sessions: SessionEntry[];
  totalCostEur: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  byCost: { model: string; costEur: number }[];
}

// Cron job name lookup (lazy-loaded)
let _cronNames: Record<string, string> | null = null;
async function loadCronNames(): Promise<Record<string, string>> {
  if (_cronNames) return _cronNames;
  try {
    const raw = await readFile(join(HOME, ".openclaw/cron/jobs.json"), "utf-8");
    const data = JSON.parse(raw);
    const jobs = data.jobs || data.payload?.jobs || [];
    _cronNames = {};
    for (const j of jobs) {
      _cronNames[j.id] = j.name || j.payload?.name || j.id;
    }
  } catch {
    _cronNames = {};
  }
  return _cronNames;
}

function parseKey(key: string, cronNames: Record<string, string>): { kind: SessionEntry["kind"]; label: string } {
  // Strip "agent:<id>:" prefix
  const rest = key.replace(/^agent:[^:]+:/, "");
  if (rest === "main")                         return { kind: "direct",   label: "Main session"          };
  if (rest.startsWith("cron:")) {
    // rest = "cron:<jobId>:run:<runId>" or "cron:<jobId>"
    const jobId = rest.replace("cron:", "").split(":")[0];
    const name = cronNames[jobId] || jobId.slice(0, 12) + "…";
    return { kind: "cron", label: "Cron — " + name };
  }
  if (rest.startsWith("telegram:group:"))      return { kind: "telegram", label: "Telegram — " + rest.replace("telegram:group:", "").replace(/:topic:.*/, "") };
  if (rest.startsWith("telegram:direct:"))     return { kind: "telegram", label: "Telegram DM — " + rest.replace("telegram:direct:", "") };
  if (rest.startsWith("whatsapp:group:"))      return { kind: "whatsapp", label: "WhatsApp — " + rest.replace("whatsapp:group:", "").replace(/@.*/, "") };
  if (rest.startsWith("whatsapp:direct:"))     return { kind: "whatsapp", label: "WhatsApp DM — " + rest.replace("whatsapp:direct:", "").replace(/@.*/, "") };
  if (rest.startsWith("openai:"))              return { kind: "api",      label: "API — " + rest.slice(7, 15) + "…" };
  return { kind: "other", label: rest.slice(0, 40) };
}

let _cache: { data: SessionsData; at: number } | null = null;
const TTL = 30_000;

async function handler(_req: NextApiRequest, res: NextApiResponse) {
  if (_cache && Date.now() - _cache.at < TTL) {
    return res.json(_cache.data);
  }
  _cronNames = null; // refresh cron names on cache miss

  try {
    const raw = await readFile(
      join(HOME, ".openclaw/agents/main/sessions/sessions.json"),
      "utf-8"
    );
    const all: Record<string, Record<string, unknown>> = JSON.parse(raw);

    const cronNames = await loadCronNames();
    const sessions: SessionEntry[] = [];

    for (const [key, val] of Object.entries(all)) {
      // Skip sub-run sessions (key contains ":run:")
      if (key.includes(":run:")) continue;

      const { kind, label } = parseKey(key, cronNames);
      const model         = (val.model as string | null) ?? null;
      const inputTokens   = Number(val.inputTokens  ?? 0);
      const outputTokens  = Number(val.outputTokens ?? 0);
      const cacheRead     = Number(val.cacheRead     ?? 0);
      const cacheWrite    = Number(val.cacheWrite    ?? 0);
      const totalTokens   = Number(val.totalTokens   ?? 0);
      const updatedAt     = Number(val.updatedAt     ?? 0);
      const costEur       = model ? calcCost(model, inputTokens, outputTokens, cacheRead, cacheWrite) : 0;

      sessions.push({ key, sessionId: String(val.sessionId ?? ""), kind, label, model, inputTokens, outputTokens, cacheRead, cacheWrite, totalTokens, costEur, updatedAt });
    }

    // Sort newest first
    sessions.sort((a, b) => b.updatedAt - a.updatedAt);

    const totalCostEur       = sessions.reduce((s, x) => s + x.costEur, 0);
    const totalInputTokens   = sessions.reduce((s, x) => s + x.inputTokens + x.cacheRead, 0);
    const totalOutputTokens  = sessions.reduce((s, x) => s + x.outputTokens, 0);

    // Cost breakdown by model
    const costByModel: Record<string, number> = {};
    for (const s of sessions) {
      if (s.model && s.costEur > 0) {
        costByModel[s.model] = (costByModel[s.model] ?? 0) + s.costEur;
      }
    }
    const byCost = Object.entries(costByModel)
      .map(([model, costEur]) => ({ model, costEur }))
      .sort((a, b) => b.costEur - a.costEur);

    const data: SessionsData = { sessions, totalCostEur, totalInputTokens, totalOutputTokens, byCost };
    _cache = { data, at: Date.now() };
    res.json(data);
  } catch (err: unknown) {
    res.status(500).json({ error: String(err) });
  }
}

export default withDemo(_demoFixture, handler);
