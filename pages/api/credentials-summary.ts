import type { NextApiRequest, NextApiResponse } from "next";
import { execSync } from "child_process";
import { withDemo } from "../../lib/demo-guard";
import { credentialsSummary as _demoFixture } from "../../lib/demo-fixtures";
import { getOrFetch } from "../../lib/server-cache";

export interface CredentialsSummary {
  total: number;
  valid: number;
  expired: number;
  expiringSoon: number;
  byCategory: Record<string, number>;
}

async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const data = await getOrFetch<CredentialsSummary>("api-credentials-summary", 120_000, async () => {
      const output = execSync("openclaw credentials list --json", {
        encoding: "utf-8",
        timeout: 5000,
      });
      const creds = JSON.parse(output);

      const byCategory: Record<string, number> = {};
      let valid = 0;
      let expired = 0;
      let expiringSoon = 0;

      for (const c of creds.credentials || []) {
        byCategory[c.category] = (byCategory[c.category] || 0) + 1;
        if (c.status === "valid") valid++;
        else if (c.status === "expired") expired++;
        else if (c.status === "expiring-soon") expiringSoon++;
      }

      return {
        total: creds.credentials?.length || 0,
        valid,
        expired,
        expiringSoon,
        byCategory,
      };
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}

export default withDemo(_demoFixture, handler);
