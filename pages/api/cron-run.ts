import { exec } from "child_process";
import { promisify } from "util";
import type { NextApiRequest, NextApiResponse } from "next";

const execAsync = promisify(exec);

// Strictly validate job IDs: UUIDs or simple slug names only — no shell injection
const SAFE_JOB_ID = /^[a-zA-Z0-9_-]{1,80}$/;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const { jobId } = req.body ?? {};
  if (!jobId || typeof jobId !== "string" || !SAFE_JOB_ID.test(jobId)) {
    return res.status(400).json({ error: "Invalid jobId" });
  }
  try {
    const { stdout, stderr } = await execAsync(`openclaw cron run ${jobId}`, { timeout: 15_000 });
    res.json({ ok: true, stdout: stdout.trim(), stderr: stderr.trim() });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ ok: false, error: msg });
  }
}
