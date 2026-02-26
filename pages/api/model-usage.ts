import os from "os";
import { readFile } from "fs/promises";
import { join } from "path";
import { exec } from "child_process";
import { promisify } from "util";
import type { NextApiRequest, NextApiResponse } from "next";
import { withDemo } from "../../lib/demo-guard";
import { modelUsage as _demoFixture } from "../../lib/demo-fixtures";
import { getOrFetch } from "../../lib/server-cache";

const execAsync = promisify(exec);
const TTL_MS = 120_000;

export interface ModelUsage {
  modelId: string;
  jobs: Array<{
    jobId: string;
    jobName: string;
    modelRef: string;
  }>;
}

// Build alias → canonical ID map from `openclaw models list --json`
// Returns e.g. { haiku: "anthropic/claude-haiku-4-5", default: "anthropic/claude-sonnet-4-6", ... }
async function buildAliasMap(): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  try {
    const { stdout } = await execAsync("openclaw models list --json", { timeout: 8000 });
    const { models = [] } = JSON.parse(stdout);
    for (const m of models) {
      const id: string = m.key;
      map[id] = id; // full ID maps to itself
      for (const tag of (m.tags ?? []) as string[]) {
        if (tag === "default") map["default"] = id;
        if (tag.startsWith("alias:")) map[tag.slice("alias:".length)] = id;
        if (tag.startsWith("fallback")) map[tag] = id; // e.g. "fallback#1"
      }
    }
  } catch { /* OC unavailable — map will be empty, refs used as-is */ }
  return map;
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ModelUsage[] | { error: string }>
) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const data = await getOrFetch<ModelUsage[]>("api-model-usage", TTL_MS, async () => {
      const [aliasMap, cronsRaw] = await Promise.all([
        buildAliasMap(),
        readFile(join(os.homedir(), ".openclaw/cron/jobs.json"), "utf-8"),
      ]);

      const cronJobs = JSON.parse(cronsRaw).jobs ?? [];
      const usageMap = new Map<string, ModelUsage>();

      for (const job of cronJobs) {
        const jobName: string = job.name || job.payload?.name || "Unknown";
        const modelRef: string = job.payload?.model || job.model || "default";
        const modelId = aliasMap[modelRef] ?? modelRef;

        if (!usageMap.has(modelId)) usageMap.set(modelId, { modelId, jobs: [] });
        usageMap.get(modelId)!.jobs.push({ jobId: job.id, jobName, modelRef });
      }

      return Array.from(usageMap.values()).sort((a, b) => a.modelId.localeCompare(b.modelId));
    });
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

export default withDemo(_demoFixture, handler);
