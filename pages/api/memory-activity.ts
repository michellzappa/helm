import os from "os";
import { readdir, stat } from "fs/promises";
import { join } from "path";
import type { NextApiRequest, NextApiResponse } from "next";
import { withDemo } from "../../lib/demo-guard";
import { memoryActivity as _demoFixture } from "../../lib/demo-fixtures";

const HOME = os.homedir();
const MEMORY_DIR = join(HOME, ".openclaw/workspace/memory");

export interface MemoryActivityData {
  timeline: Array<{ day: string; edits: number }>;
  recentTopics: string[];
  recentFiles: Array<{ name: string; mtimeMs: number }>;
}

function isoDay(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfDayMs(daysAgo = 0): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d.getTime();
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MemoryActivityData | { error: string }>
) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const files = await readdir(MEMORY_DIR).catch(() => [] as string[]);
    const mdFiles = files.filter((f) => f.endsWith(".md"));

    const withStats = await Promise.all(
      mdFiles.map(async (name) => {
        try {
          const st = await stat(join(MEMORY_DIR, name));
          return { name, mtimeMs: st.mtimeMs };
        } catch {
          return null;
        }
      })
    );

    const recentFiles = withStats
      .filter((f): f is { name: string; mtimeMs: number } => !!f)
      .sort((a, b) => b.mtimeMs - a.mtimeMs);

    const bucket = new Map<string, number>();
    for (let i = 6; i >= 0; i--) {
      bucket.set(isoDay(startOfDayMs(i)), 0);
    }

    for (const file of recentFiles) {
      const day = isoDay(file.mtimeMs);
      if (bucket.has(day)) bucket.set(day, (bucket.get(day) ?? 0) + 1);
    }

    const timeline = Array.from(bucket.entries()).map(([day, edits]) => ({ day, edits }));

    const recentTopics = recentFiles
      .map((f) => f.name.replace(/\.md$/, ""))
      .map((name) => name.replace(/^topic-/, "").replace(/^daily-/, ""))
      .filter((name) => !!name && name !== "index")
      .slice(0, 8);

    res.status(200).json({
      timeline,
      recentTopics,
      recentFiles: recentFiles.slice(0, 12),
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

export default withDemo(_demoFixture, handler);
