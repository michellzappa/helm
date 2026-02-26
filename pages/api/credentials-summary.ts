import os from "os";
import { readdir, readFile } from "fs/promises";
import { join, extname } from "path";
import type { NextApiRequest, NextApiResponse } from "next";
import { withDemo } from "../../lib/demo-guard";
import { credentialsSummary as _demoFixture } from "../../lib/demo-fixtures";
import { getOrFetch } from "../../lib/server-cache";

const HOME = os.homedir();
const CREDS_DIR = join(HOME, ".openclaw/credentials");

export interface CredentialsSummary {
  total: number;
  valid: number;
  expired: number;
  expiringSoon: number;
  byCategory: Record<string, number>;
}

async function fileOk(path: string): Promise<boolean> {
  try {
    const content = await readFile(path, "utf-8");
    if (!content.trim()) return false;
    const ext = extname(path);
    if (ext === ".json") {
      const obj = JSON.parse(content);
      return Object.keys(obj).length > 0;
    }
    if (ext === ".env") {
      return content.split("\n").some(l => l.includes("=") && !l.startsWith("#"));
    }
    return true;
  } catch {
    return false;
  }
}

async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const data = await getOrFetch<CredentialsSummary>("api-credentials-summary", 120_000, async () => {
      const files = await readdir(CREDS_DIR).catch(() => [] as string[]);
      const credFiles = files.filter(f => !f.startsWith("."));

      let valid = 0;
      let empty = 0;
      const byCategory: Record<string, number> = {};

      for (const file of credFiles) {
        const ext = extname(file);
        const cat = ext === ".env" ? "env" : ext === ".json" ? "json" : "other";
        byCategory[cat] = (byCategory[cat] || 0) + 1;

        const ok = await fileOk(join(CREDS_DIR, file));
        if (ok) valid++;
        else empty++;
      }

      return {
        total: credFiles.length,
        valid,
        expired: empty,
        expiringSoon: 0,
        byCategory,
      };
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}

export default withDemo(_demoFixture, handler);
