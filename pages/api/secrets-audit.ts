/**
 * Secrets audit endpoint.
 * Runs `openclaw secrets audit --json` and returns parsed findings.
 */
import { exec } from "child_process";
import { promisify } from "util";
import type { NextApiRequest, NextApiResponse } from "next";

const execAsync = promisify(exec);

export interface SecretsAudit {
  version: number;
  status: "clean" | "findings" | "error";
  filesScanned: string[];
  summary: {
    plaintextCount: number;
    unresolvedRefCount: number;
    shadowedRefCount: number;
    legacyResidueCount: number;
  };
  findings: Array<{
    code: string;
    severity: "info" | "warn" | "error";
    file: string;
    jsonPath: string;
    message: string;
    provider?: string;
    profileId?: string;
  }>;
  lastAuditAt: string;
}

export default async function handler(_req: NextApiRequest, res: NextApiResponse<SecretsAudit | { error: string }>) {
  try {
    const { stdout, stderr } = await execAsync("openclaw secrets audit --json", { timeout: 10000 });
    if (stderr && !stdout) {
      return res.status(500).json({ error: stderr.trim() });
    }
    const audit: SecretsAudit = JSON.parse(stdout);
    audit.lastAuditAt = new Date().toISOString();
    res.status(200).json(audit);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}
