import type { NextApiRequest, NextApiResponse } from "next";
import { execSync } from "child_process";
import { withDemo } from "../../lib/demo-guard";
import { agentsSummary as _demoFixture } from "../../lib/demo-fixtures";
import { getOrFetch } from "../../lib/server-cache";

export interface AgentsSummary {
  total: number;
  defaultAgent: string;
  recentErrors: number;
  lastRun?: {
    agent: string;
    status: string;
    time: number;
  };
}

function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    void getOrFetch<AgentsSummary>("api-agents-summary", 120_000, async () => {
      const agentsOutput = execSync("openclaw agents list --json", {
        encoding: "utf-8",
        timeout: 5000,
      });
      const agents = JSON.parse(agentsOutput);

      const sessionsOutput = execSync("openclaw sessions list --json --limit 20", {
        encoding: "utf-8",
        timeout: 5000,
      });
      const sessions = JSON.parse(sessionsOutput);

      const recentErrors = sessions.sessions?.filter((s: any) =>
        s.lastStatus === "error" && Date.now() - (s.lastRunAtMs || 0) < 24 * 60 * 60 * 1000
      ).length || 0;

      const lastRun = sessions.sessions?.[0] ? {
        agent: sessions.sessions[0].agentId || "main",
        status: sessions.sessions[0].lastStatus || "unknown",
        time: sessions.sessions[0].lastRunAtMs || Date.now(),
      } : undefined;

      return {
        total: agents.agents?.length || 0,
        defaultAgent: agents.agents?.find((a: any) => a.isDefault)?.id || "main",
        recentErrors,
        lastRun,
      };
    }).then((data) => res.json(data)).catch((err) => {
      res.status(500).json({ error: String(err) });
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}

export default withDemo(_demoFixture, handler);
