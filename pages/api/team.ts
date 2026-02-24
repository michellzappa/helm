import type { NextApiRequest, NextApiResponse } from "next";

interface WorkStream {
  id: string;
  name: string;
  focus: string;
  category: "core" | "gym" | "newsletter";
  responsibility: string;
  automatedTasks: string[];
  dataSource: string[];
  status: "active" | "on-demand";
  cronJobs: string[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<WorkStream[] | { error: string }>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const workstreams: WorkStream[] = [
      {
        id: "lagosta",
        name: "Lagosta",
        focus: "Orchestration",
        category: "core",
        responsibility: "System workflows, memory, calendar, tasks, node management",
        automatedTasks: [
          "Session orchestration",
          "Memory management",
          "Cron scheduling",
          "Cross-stream coordination",
        ],
        dataSource: ["OpenClaw gateway", "Workspace files", "System state"],
        status: "active",
        cronJobs: [],
      },
      {
        id: "gym",
        name: "Gym",
        focus: "Personalized fitness coaching & recovery",
        category: "gym",
        responsibility:
          "Daily gym plans, Oura-driven adaptation, recovery monitoring, progressive programming",
        automatedTasks: [
          "Morning summary (Oura sleep/readiness/activity/stress)",
          "Daily plan generation (adapted to recovery signals)",
          "Evening summary (stress/recovery tracking)",
        ],
        dataSource: ["Oura Ring API", "Session history", "Recovery signals"],
        status: "active",
        cronJobs: [
          "Daily gym plan",
          "OuraClaw Morning Summary",
          "OuraClaw Evening Summary",
        ],
      },
      {
        id: "newsletter",
        name: "Newsletter (Artificial Insights)",
        focus: "AI/emerging tech content operations",
        category: "newsletter",
        responsibility:
          "Daily issue detection, Monday subject-line proposals, Substack drafts, CRM event integration",
        automatedTasks: [
          "Daily RSS monitoring (new issue detection)",
          "Monday subject-line proposals + draft prep",
          "CRM milestone integration (public events)",
          "Archive ingestion & historical corpus learning",
        ],
        dataSource: ["RSS feed", "Substack archive", "CRM milestones", "Historical editions"],
        status: "active",
        cronJobs: ["Artificial Insights — daily new-issue check (RSS)"],
      },
    ];

    res.status(200).json(workstreams);
  } catch (error) {
    console.error("[team API] Error:", error);
    res.status(500).json({
      error: `Failed to fetch team: ${(error as Error).message}`,
    });
  }
}
