import type { NextApiRequest, NextApiResponse } from "next";
import { execSync } from "child_process";

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

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    // Get agents list
    const agentsOutput = execSync("openclaw agents list --json", {
      encoding: "utf-8",
      timeout: 5000,
    });
    const agents = JSON.parse(agentsOutput);
    
    // Get recent sessions with errors
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

    res.json({
      total: agents.agents?.length || 0,
      defaultAgent: agents.agents?.find((a: any) => a.isDefault)?.id || "main",
      recentErrors,
      lastRun,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
