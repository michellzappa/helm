import os from "os";
import { readFile } from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";
import { join } from "path";
import type { NextApiRequest, NextApiResponse } from "next";
import { Cron } from "croner";

const execAsync = promisify(exec);
const HOME = os.homedir();
const TZ = process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

interface ScheduledTask {
  id: string;
  name: string;
  type: "cron" | "launchagent";
  schedule: string;
  enabled: boolean;
  nextRunAtMs?: number;
  lastRunAtMs?: number;
  workspace?: string;
  model?: string;
}

// LaunchAgent label prefixes to include in the scheduled view.
// Add your own reverse-domain prefix here if you use custom agents.
const MANAGED_PREFIXES = [
  "com.openclaw.",
];

function getNextRunTime(
  cronExpr: string,
  tz?: string
): number | undefined {
  try {
    const cron = new Cron(cronExpr, { timezone: tz || TZ });
    const nextDate = cron.nextRun();
    return nextDate ? nextDate.getTime() : undefined;
  } catch (err) {
    console.error(`[scheduled-tasks] Failed to parse cron: ${cronExpr}`, err);
    return undefined;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ScheduledTask[] | { error: string }>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const tasks: ScheduledTask[] = [];

    // Fetch LaunchAgents (only managed ones)
    try {
      const { stdout } = await execAsync("launchctl list");
      const lines = stdout.split("\n");
      
      for (const line of lines) {
        if (line.includes(".")) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 3) {
            const pid = parseInt(parts[0]);
            const exitCode = parseInt(parts[1]);
            const label = parts[2];
            
            // Only include managed prefixes
            const isManaged = MANAGED_PREFIXES.some((prefix) => label.startsWith(prefix));
            if (!isManaged) {
              continue;
            }
            
            const enabled = exitCode === 0 || pid > 0;
            
            // Extract workspace from LaunchAgent label (e.g., com.openclaw.gateway → gateway)
            const workspaceMatch = label.match(/^com\.([a-z]+)\./);
            const workspace = workspaceMatch ? workspaceMatch[1] : "system";
            
            tasks.push({
              id: label,
              name: label.replace(/^com\./, "").replace(/\./g, " "),
              type: "launchagent",
              schedule: "LaunchAgent",
              enabled,
              workspace,
            });
          }
        }
      }
    } catch (err) {
      console.error("[scheduled-tasks] LaunchAgent fetch failed:", err);
    }

    // Build alias → display name map using `openclaw models list --json`
    // (same source as models page — aliases like "haiku"/"default" resolve correctly)
    const modelNameMap: Record<string, string> = {};
    try {
      const { stdout } = await execAsync("openclaw models list --json", { timeout: 8000 });
      const { models: ocModels = [] } = JSON.parse(stdout);
      // Optionally enrich with display names from config/models.json
      const enrichment: Record<string, string> = {};
      try {
        const raw = await readFile(join(process.cwd(), "config/models.json"), "utf-8");
        for (const m of JSON.parse(raw).models ?? []) enrichment[m.id] = m.name;
      } catch {}
      for (const m of ocModels) {
        const displayName = enrichment[m.key] ?? m.name ?? m.key;
        modelNameMap[m.key] = displayName;         // full ID
        for (const tag of (m.tags ?? []) as string[]) {
          if (tag === "default") modelNameMap["default"] = displayName;
          if (tag.startsWith("alias:")) modelNameMap[tag.slice("alias:".length)] = displayName;
        }
      }
    } catch { /* use raw ref if OC unavailable */ }

    // Fetch OpenClaw cron jobs from file
    try {
      const cronsPath = join(os.homedir(), ".openclaw/cron/jobs.json");
      const content = await readFile(cronsPath, "utf-8");
      const cronData = JSON.parse(content);
      
      const cronJobs = cronData.jobs || cronData.payload?.jobs || [];

      console.log(`[scheduled-tasks] Loaded ${cronJobs.length} cron jobs from ${cronsPath}`);

      for (const job of cronJobs) {
        const cronExpr = job.payload?.schedule?.expr || job.schedule?.expr || job.schedule?.kind || "";
        const tz = job.payload?.schedule?.tz || job.schedule?.tz || TZ;
        
        // Calculate next run time if not already set
        let nextRunAtMs = job.payload?.nextRunAtMs || job.nextRunAtMs;
        if (!nextRunAtMs && cronExpr && cronExpr !== "—") {
          nextRunAtMs = getNextRunTime(cronExpr, tz);
        }
        
        // Resolve model ref → display name dynamically
        const modelRef = job.payload?.model || "default";
        const modelDisplay = modelNameMap[modelRef] || modelRef;
        
        tasks.push({
          id: job.id,
          name: job.payload?.name || job.name || "Unknown",
          type: "cron",
          schedule: cronExpr,
          enabled: job.enabled ?? true,
          nextRunAtMs,
          lastRunAtMs: job.state?.lastRunAtMs,
          workspace: job.payload?.workspace || job.workspace || null,
          model: modelDisplay,
        });
      }
    } catch (err) {
      console.log(`[scheduled-tasks] Cron file read failed: ${(err as Error).message}`);
    }

    // Sort by name
    tasks.sort((a, b) => a.name.localeCompare(b.name));

    res.status(200).json(tasks);
  } catch (error) {
    console.error("[scheduled-tasks] Error:", error);
    res.status(500).json({
      error: `Failed to fetch scheduled tasks: ${(error as Error).message}`,
    });
  }
}
