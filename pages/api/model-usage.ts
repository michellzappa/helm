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
    // Map model references to model IDs
    const modelMap: Record<string, string> = {
      haiku: "anthropic/claude-haiku-4-5",
      default: "anthropic/claude-opus-4-6",
      opus: "anthropic/claude-opus-4-6",
      "claude-haiku-4-5": "anthropic/claude-haiku-4-5",
      "claude-opus-4-6": "anthropic/claude-opus-4-6",
    };

    // Read cron jobs
    const cronsPath = join(process.env.HOME || "/Users/botbot", ".openclaw/cron/jobs.json");
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
