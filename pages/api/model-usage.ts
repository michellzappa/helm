import os from "os";
import { readFile } from "fs/promises";
import { join } from "path";
import type { NextApiRequest, NextApiResponse } from "next";

interface ModelUsage {
  modelId: string;
  jobs: Array<{
    jobId: string;
    jobName: string;
    modelRef: string;
  }>;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ModelUsage[] | { error: string }>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Build model alias → canonical ID map dynamically from config files
    const modelMap: Record<string, string> = {};
    try {
      const modelsRaw = await readFile(join(process.cwd(), "config/models.json"), "utf-8");
      const modelsConfig = JSON.parse(modelsRaw);
      for (const m of (modelsConfig.models || [])) {
        modelMap[m.id] = m.id;
        const short = m.id.split("/").pop();
        if (short) modelMap[short] = m.id;
      }
      const ocRaw = await readFile(join(os.homedir(), ".openclaw/openclaw.json"), "utf-8");
      const ocConfig = JSON.parse(ocRaw);
      const defaultId = ocConfig.agents?.defaults?.model?.primary || "";
      if (defaultId) modelMap["default"] = defaultId;
      const primaryAlias = ocConfig.agents?.defaults?.model?.primaryAlias || "";
      if (primaryAlias && defaultId) modelMap[primaryAlias] = defaultId;
    } catch { /* fallback: use raw ref as ID */ }

    // Read cron jobs
    const cronsPath = join(os.homedir(), ".openclaw/cron/jobs.json");
    const content = await readFile(cronsPath, "utf-8");
    const cronData = JSON.parse(content);
    const cronJobs = cronData.jobs || [];

    // Build usage map
    const usageMap = new Map<string, ModelUsage>();

    for (const job of cronJobs) {
      const jobName = job.payload?.name || job.name || "Unknown Job";
      let modelRef = job.payload?.model || "default";
      
      // Normalize model reference
      let modelId = modelMap[modelRef] || "anthropic/claude-opus-4-6";

      // Initialize if needed
      if (!usageMap.has(modelId)) {
        usageMap.set(modelId, {
          modelId,
          jobs: [],
        });
      }

      // Add job to usage
      const usage = usageMap.get(modelId)!;
      usage.jobs.push({
        jobId: job.id,
        jobName,
        modelRef,
      });
    }

    // Convert map to array and sort
    const result = Array.from(usageMap.values()).sort((a, b) =>
      a.modelId.localeCompare(b.modelId)
    );

    res.status(200).json(result);
  } catch (error) {
    console.error("[model-usage API] Error:", error);
    res.status(500).json({
      error: `Failed to fetch model usage: ${(error as Error).message}`,
    });
  }
}
