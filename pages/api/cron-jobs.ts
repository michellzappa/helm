import type { NextApiRequest, NextApiResponse } from "next";

interface CronJob {
  id: string;
  name: string;
  schedule: {
    kind: string;
    expr?: string;
  };
  nextRunAtMs?: number;
  enabled: boolean;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CronJob[] | { error: string }>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Use the local OpenClaw gateway (accessible within the workspace)
    const gatewayUrl = process.env.GATEWAY_URL || "http://localhost:8765";
    
    const response = await fetch(`${gatewayUrl}/api/cron/list`, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: `Gateway error: ${response.statusText}` 
      });
    }

    const data = await response.json();
    const jobs = data.jobs || [];

    res.status(200).json(jobs);
  } catch (error) {
    console.error("[cron-jobs API] Error:", error);
    res.status(500).json({ 
      error: `Failed to fetch cron jobs: ${(error as Error).message}` 
    });
  }
}
