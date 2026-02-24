import { readFile } from "fs/promises";
import { join } from "path";
import type { NextApiRequest, NextApiResponse } from "next";

interface Model {
  id: string;
  name: string;
  provider: string;
  context: number;
  costInput: string;
  costOutput: string;
  speed: "fast" | "balanced" | "slow";
  usedFor: string[];
  status: "active" | "inactive";
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Model[] | { error: string }>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const configPath = join(process.cwd(), "config", "models.json");
    const content = await readFile(configPath, "utf-8");
    const configData = JSON.parse(content);
    const models = configData.models || [];

    res.status(200).json(models);
  } catch (error) {
    console.error("[models API] Error:", error);
    res.status(500).json({
      error: `Failed to fetch models: ${(error as Error).message}`,
    });
  }
}
