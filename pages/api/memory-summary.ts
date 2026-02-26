import type { NextApiRequest, NextApiResponse } from "next";

export interface MemorySummary {
  totalFiles: number;
  lastModified: string;
  topics: string[];
  recentFiles: string[];
  sizeBytes: number;
}

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    // Simple file system check for memory directory
    const fs = require("fs");
    const path = require("path");
    const memoryPath = path.join(process.env.HOME || "/Users/botbot", ".openclaw/workspace/memory");
    
    let files: string[] = [];
    let sizeBytes = 0;
    
    if (fs.existsSync(memoryPath)) {
      files = fs.readdirSync(memoryPath).filter((f: string) => f.endsWith(".md"));
      for (const f of files) {
        try {
          const stat = fs.statSync(path.join(memoryPath, f));
          sizeBytes += stat.size;
        } catch {}
      }
    }

    // Also check MEMORY.md in workspace
    const mainMemory = path.join(process.env.HOME || "/Users/botbot", ".openclaw/workspace/MEMORY.md");
    let lastModified = Date.now();
    if (fs.existsSync(mainMemory)) {
      lastModified = fs.statSync(mainMemory).mtimeMs;
    }

    res.json({
      totalFiles: files.length + 1,
      lastModified: new Date(lastModified).toISOString(),
      topics: files.slice(0, 5).map((f: string) => f.replace("topic-", "").replace(".md", "")),
      recentFiles: files.slice(-3).map((f: string) => f.replace(".md", "")),
      sizeBytes,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
