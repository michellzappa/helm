import os from "os";
import { readdir, stat } from "fs/promises";
import { join } from "path";
import { createHandler } from "@/lib/api/handler";
import { workspaceSizes as _demoFixture } from "@/lib/demo-fixtures";

const HOME = os.homedir();
const ROOT = join(HOME, ".openclaw");
const TTL_MS = 120_000;
const SKIP_DIRS = new Set([".git", "node_modules", ".next", "dist", "build"]);

export interface WorkspaceSize {
  id: string;
  path: string;
  sizeBytes: number;
}

async function dirSize(path: string, depth = 0): Promise<number> {
  if (depth > 6) return 0;

  let entries: { name: string; isDirectory: () => boolean; isFile: () => boolean; isSymbolicLink: () => boolean }[];
  try {
    entries = await readdir(path, { withFileTypes: true }) as unknown as typeof entries;
  } catch {
    return 0;
  }

  let total = 0;
  for (const entry of entries) {
    const full = join(path, entry.name);
    try {
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        total += await dirSize(full, depth + 1);
      } else if (entry.isFile()) {
        const st = await stat(full);
        total += st.size;
      }
    } catch {
      // ignore unreadable entry
    }
  }
  return total;
}

export default createHandler<WorkspaceSize[]>({
  cacheKey: "api-workspace-sizes",
  cacheTtlMs: TTL_MS,
  demoFixture: _demoFixture,
  handler: async () => {
    const dirs = await readdir(ROOT, { withFileTypes: true }).catch(() => []);
    const workspaceDirs = dirs
      .filter((entry) => entry.isDirectory() && (entry.name === "workspace" || entry.name.startsWith("workspace-")))
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));

    const sizes = await Promise.all(
      workspaceDirs.map(async (id) => {
        const path = join(ROOT, id);
        const sizeBytes = await dirSize(path);
        return { id, path, sizeBytes };
      })
    );

    return sizes.sort((a, b) => b.sizeBytes - a.sizeBytes);
  },
});
