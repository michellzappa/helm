import os from "os";
import { createHandler } from "@/lib/api/handler";
import { readdir, stat } from "fs/promises";
import { join, relative, basename } from "path";

interface DocFile {
  path: string;
  name: string;
  type: "file" | "folder";
  mtime: string;
  size?: number;
}

// DOC_EXCLUDED_PATTERNS - files that belong to memory, not docs
const MEMORY_PATTERNS = [
  /memory\/daily\/\d{4}-\d{2}-\d{2}\.md$/i,
  /memory\/reflection-state\.json$/i,
  /memory\/social-listening-state\.json$/i,
  /memory\/meeting-tasks-state\.json$/i,
  /memory\/meeting-enrichment-state\.json$/i,
  /memory\/heartbeat-state\.json$/i,
  /memory\/topic-/i,
  /memory\/institutional/i,
  /memory\/active/i,
  /HEARTBEAT\.md$/i,
  /MEMORY\.md$/i,
  /SOUL\.md$/i,
  /USER\.md$/i,
  /\d{4}-\d{2}-\d{2}\.md$/i, // Daily notes at root level too
];

async function scanDocs(dir: string, baseDir: string, depth = 0): Promise<DocFile[]> {
  const results: DocFile[] = [];
  
  if (depth > 3) return results; // Limit recursion depth
  
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      const relPath = relative(baseDir, fullPath);
      
      // Skip hidden files, node_modules, etc.
      if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === ".git") {
        continue;
      }
      
      // Skip memory patterns
      if (MEMORY_PATTERNS.some(pattern => pattern.test(relPath))) {
        continue;
      }
      
      if (entry.isDirectory()) {
        results.push({
          path: fullPath,
          name: relPath,
          type: "folder",
          mtime: new Date().toISOString(),
        });
        // Optionally recurse into some directories
        if (depth < 2 && !["memory", ".openclaw", "node_modules", "dist", "build"].includes(entry.name)) {
          results.push(...await scanDocs(fullPath, baseDir, depth + 1));
        }
      } else if (entry.isFile()) {
        // Only include markdown and text files as docs
        if (/\.(md|mdx|txt|rst)$/i.test(entry.name)) {
          const stats = await stat(fullPath);
          results.push({
            path: fullPath,
            name: relPath,
            type: "file",
            mtime: stats.mtime.toISOString(),
            size: stats.size,
          });
        }
      }
    }
  } catch (err) {
    console.error(`Failed to scan ${dir}:`, err);
  }
  
  return results.sort((a, b) => new Date(b.mtime).getTime() - new Date(a.mtime).getTime()).slice(0, 100);
}

export default createHandler<DocFile[]>({
  cacheKey: "docs-list",
  cacheTtlMs: 300_000, // 5 minute cache
  async handler() {
    const workspacePath = os.homedir() + "/.openclaw/workspace";
    const docs = await scanDocs(workspacePath, workspacePath);
    return docs;
  },
});
