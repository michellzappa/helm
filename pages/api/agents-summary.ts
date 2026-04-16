import type { NextApiRequest, NextApiResponse } from "next";
import { execSync } from "child_process";
import type { AgentsSummary } from "@/lib/api/types";
import { withDemo } from "@/lib/demo-guard";
import { agentsSummary as _demoFixture } from "@/lib/demo-fixtures";
import { getOrFetch } from "@/lib/server-cache";

// Re-export so components importing from this file get the type
export type { AgentsSummary };

const TTL_MS = 120_000;

async function handler(
  _req: NextApiRequest,
  res: NextApiResponse<AgentsSummary | { error: string }>
) {
  try {
    const data = await getOrFetch<AgentsSummary>("api-agents-summary", TTL_MS, async () => {
      const raw = execSync("openclaw status --json 2>/dev/null", { encoding: "utf-8", timeout: 8000 });
      const d = JSON.parse(raw);
      const agentsData = d.agents as any;
      const agents = agentsData?.agents ?? [];
      const sessions = d.sessions as any;
      const recent = sessions?.recent ?? [];

      const recentErrors = recent.filter(
        (s: any) => s.lastStatus === "error"
      ).length;

      const lastRun = recent[0]
        ? { agent: recent[0].agentId ?? "main", status: recent[0].lastStatus ?? "unknown", time: recent[0].updatedAt ?? Date.now() }
        : undefined;

      return {
        total: agents.length,
        defaultAgent: agentsData?.defaultId ?? "main",
        recentErrors,
        lastRun,
      };
    });
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}

export default withDemo(_demoFixture as Parameters<typeof withDemo>[0], handler);