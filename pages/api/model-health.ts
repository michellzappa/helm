import { readFile } from "fs/promises";
import { join } from "path";
import os from "os";
import { createGetHandler } from "@/lib/api/handler";

const LOG_PATH = join(os.homedir(), ".openclaw", "logs", "gateway.err.log");
const MAX_LINES = 2000;
const DAY_MS = 24 * 60 * 60 * 1000;
const ACTIVE_WINDOW_MS = 30 * 60 * 1000;

const RUN_END_RE =
  /\[agent\/embedded\] embedded run agent end: runId=\S+ isError=(\S+) model=\S+ provider=(\S+) error=(.+)$/;
const AUTH_FAILURE_RE =
  /\[agent\/embedded\] auth profile failure state updated: runId=\S+ profile=\S+ provider=(\S+) reason=(\S+) window=(\S+)/;
const FAILOVER_RE =
  /\[agent\/embedded\] embedded run failover decision: runId=\S+ stage=(\S+) decision=(\S+) reason=(\S+) provider=(\S+)/;

interface CountEntry {
  key: string;
  count: number;
}

interface ProviderHealth {
  provider: string;
  totalErrors: number;
  errors24h: number;
  cooldownEvents24h: number;
  lastErrorAtMs?: number;
  lastErrorReason?: string;
  lastFailoverAtMs?: number;
  failoverDecisions: CountEntry[];
  failoverReasons: CountEntry[];
  activeCooldown: boolean;
  activeFailover?: {
    atMs: number;
    decision: string;
    reason: string;
    stage: string;
  };
}

export interface ModelHealthData {
  sourcePath: string;
  scannedLines: number;
  parsedEvents: number;
  generatedAtMs: number;
  providers: ProviderHealth[];
}

interface MutableProviderHealth {
  provider: string;
  totalErrors: number;
  errors24h: number;
  cooldownEvents24h: number;
  lastErrorAtMs?: number;
  lastErrorReason?: string;
  lastCooldownAtMs?: number;
  lastFailoverAtMs?: number;
  lastFailoverDecision?: string;
  lastFailoverReason?: string;
  lastFailoverStage?: string;
  failoverDecisionCounts: Record<string, number>;
  failoverReasonCounts: Record<string, number>;
}

function parseTimestampMs(line: string): number | undefined {
  const firstSpace = line.indexOf(" ");
  if (firstSpace < 1) return undefined;
  const timestamp = line.slice(0, firstSpace);
  const parsed = Date.parse(timestamp);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function normalizeProvider(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return "unknown";
  return trimmed.split("/")[0] || "unknown";
}

function ensureProvider(
  map: Map<string, MutableProviderHealth>,
  provider: string
): MutableProviderHealth {
  let existing = map.get(provider);
  if (!existing) {
    existing = {
      provider,
      totalErrors: 0,
      errors24h: 0,
      cooldownEvents24h: 0,
      failoverDecisionCounts: {},
      failoverReasonCounts: {},
    };
    map.set(provider, existing);
  }
  return existing;
}

function incrementCounter(counter: Record<string, number>, key: string) {
  counter[key] = (counter[key] ?? 0) + 1;
}

function toSortedCounts(counter: Record<string, number>): CountEntry[] {
  return Object.entries(counter)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

async function readTailLines(path: string, maxLines: number): Promise<string[]> {
  let content = "";
  try {
    content = await readFile(path, "utf-8");
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return [];
    throw error;
  }
  return content.split(/\r?\n/).filter(Boolean).slice(-maxLines);
}

export default createGetHandler<ModelHealthData>(
  async () => {
    const now = Date.now();
    const cutoff24h = now - DAY_MS;
    const providerMap = new Map<string, MutableProviderHealth>();
    const lines = await readTailLines(LOG_PATH, MAX_LINES);

    let parsedEvents = 0;

    for (const line of lines) {
      const ts = parseTimestampMs(line);

      const runEnd = line.match(RUN_END_RE);
      if (runEnd) {
        const isError = runEnd[1] === "true";
        if (!isError) continue;

        const provider = normalizeProvider(runEnd[2]);
        const reason = runEnd[3].trim();
        const entry = ensureProvider(providerMap, provider);
        parsedEvents += 1;

        entry.totalErrors += 1;
        if (ts !== undefined && ts >= cutoff24h) entry.errors24h += 1;

        if (ts !== undefined) {
          if (entry.lastErrorAtMs === undefined || ts >= entry.lastErrorAtMs) {
            entry.lastErrorAtMs = ts;
            entry.lastErrorReason = reason;
          }
        } else if (!entry.lastErrorReason) {
          entry.lastErrorReason = reason;
        }

        continue;
      }

      const authFailure = line.match(AUTH_FAILURE_RE);
      if (authFailure) {
        const provider = normalizeProvider(authFailure[1]);
        const reason = authFailure[2];
        const window = authFailure[3];
        const entry = ensureProvider(providerMap, provider);
        parsedEvents += 1;

        incrementCounter(entry.failoverReasonCounts, reason);

        if (window === "cooldown") {
          if (ts !== undefined) {
            entry.lastCooldownAtMs = ts;
            if (ts >= cutoff24h) entry.cooldownEvents24h += 1;
          } else {
            entry.cooldownEvents24h += 1;
          }
        }
        continue;
      }

      const failover = line.match(FAILOVER_RE);
      if (failover) {
        const stage = failover[1];
        const decision = failover[2];
        const reason = failover[3];
        const provider = normalizeProvider(failover[4]);
        const entry = ensureProvider(providerMap, provider);
        parsedEvents += 1;

        incrementCounter(entry.failoverDecisionCounts, decision);
        incrementCounter(entry.failoverReasonCounts, reason);

        if (ts !== undefined) {
          if (entry.lastFailoverAtMs === undefined || ts >= entry.lastFailoverAtMs) {
            entry.lastFailoverAtMs = ts;
            entry.lastFailoverDecision = decision;
            entry.lastFailoverReason = reason;
            entry.lastFailoverStage = stage;
          }
        }
      }
    }

    const providers: ProviderHealth[] = Array.from(providerMap.values())
      .map((entry) => {
        const activeCooldown =
          entry.lastCooldownAtMs !== undefined && now - entry.lastCooldownAtMs <= ACTIVE_WINDOW_MS;
        const activeFailover =
          entry.lastFailoverAtMs !== undefined &&
          now - entry.lastFailoverAtMs <= ACTIVE_WINDOW_MS &&
          entry.lastFailoverDecision !== undefined &&
          entry.lastFailoverDecision !== "none";

        return {
          provider: entry.provider,
          totalErrors: entry.totalErrors,
          errors24h: entry.errors24h,
          cooldownEvents24h: entry.cooldownEvents24h,
          lastErrorAtMs: entry.lastErrorAtMs,
          lastErrorReason: entry.lastErrorReason,
          lastFailoverAtMs: entry.lastFailoverAtMs,
          failoverDecisions: toSortedCounts(entry.failoverDecisionCounts),
          failoverReasons: toSortedCounts(entry.failoverReasonCounts),
          activeCooldown,
          activeFailover:
            activeFailover && entry.lastFailoverDecision && entry.lastFailoverReason && entry.lastFailoverStage
              ? {
                  atMs: entry.lastFailoverAtMs!,
                  decision: entry.lastFailoverDecision,
                  reason: entry.lastFailoverReason,
                  stage: entry.lastFailoverStage,
                }
              : undefined,
        };
      })
      .sort(
        (a, b) =>
          b.errors24h - a.errors24h ||
          b.totalErrors - a.totalErrors ||
          (b.lastErrorAtMs ?? 0) - (a.lastErrorAtMs ?? 0) ||
          a.provider.localeCompare(b.provider)
      );

    return {
      sourcePath: LOG_PATH,
      scannedLines: lines.length,
      parsedEvents,
      generatedAtMs: now,
      providers,
    };
  },
  {
    cacheKey: "api-model-health",
    cacheTtlMs: 30_000,
  }
);
