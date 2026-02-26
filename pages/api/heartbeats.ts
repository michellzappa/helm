import type { NextApiRequest, NextApiResponse } from "next";
import { execSync } from "child_process";

export interface HeartbeatData {
  ts: number;
  status: string;
  reason?: string;
  durationMs: number;
}

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const output = execSync("openclaw system heartbeat last --json", {
      encoding: "utf-8",
      timeout: 5000,
    });
    const data: HeartbeatData = JSON.parse(output);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
