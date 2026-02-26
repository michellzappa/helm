import type { NextApiRequest, NextApiResponse } from "next";
import { execSync } from "child_process";

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  if (_req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    // Trigger heartbeat via system event
    execSync("openclaw system event --kind heartbeat", {
      timeout: 10000,
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
