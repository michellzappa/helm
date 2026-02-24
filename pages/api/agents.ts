import type { NextApiRequest, NextApiResponse } from "next";

interface Agent {
  id: string;
  name: string;
  type: string;
  status: "online" | "offline";
  info: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Agent[] | { error: string }>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const agents: Agent[] = [
      {
        id: "main",
        name: "Main Agent",
        type: "Local",
        status: "online",
        info: "Primary agent in workspace",
      },
      {
        id: "mz-mbp",
        name: "MacBook Pro",
        type: "Remote Node",
        status: "online",
        info: "192.168.178.130 · app 2026.2.12",
      },
      {
        id: "mini",
        name: "Mac Mini",
        type: "Remote Node",
        status: "online",
        info: "192.168.178.79 · app 2026.2.12",
      },
      {
        id: "lagosta-mini",
        name: "Lagosta Mini",
        type: "Local Node",
        status: "online",
        info: "192.168.178.122 · app 2026.2.15",
      },
    ];

    res.status(200).json(agents);
  } catch (error) {
    console.error("[agents API] Error:", error);
    res.status(500).json({
      error: `Failed to fetch agents: ${(error as Error).message}`,
    });
  }
}
