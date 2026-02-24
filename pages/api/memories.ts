import { readdir, readFile } from "fs/promises";
import { join } from "path";
import type { NextApiRequest, NextApiResponse } from "next";

const WORKSPACE_PATH = process.env.WORKSPACE_PATH || join(process.cwd(), "..");

interface MemoryFile {
  name: string;
  path: string;
  content: string;
  size: number;
  category: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MemoryFile[] | { error: string }>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const memoryFiles: MemoryFile[] = [];

    // Root workspace .md files (system files)
    const rootFiles = [
      "MEMORY.md",
      "AGENTS.md",
      "SOUL.md",
      "USER.md",
      "TOOLS.md",
      "IDENTITY.md",
      "HEARTBEAT.md",
      "BOOTSTRAP.md",
    ];

    for (const file of rootFiles) {
      try {
        const filePath = join(WORKSPACE_PATH, file);
        const content = await readFile(filePath, "utf-8");
        memoryFiles.push({
          name: file,
          path: file,
          content,
          size: content.length,
          category: "System",
        });
      } catch (err) {
        // File doesn't exist, skip
      }
    }

    // Daily memories
    try {
      const memoryPath = join(WORKSPACE_PATH, "memory");
      const files = await readdir(memoryPath);

      for (const file of files) {
        if (file.endsWith(".md")) {
          try {
            const filePath = join(memoryPath, file);
            const content = await readFile(filePath, "utf-8");

            let category = "Other";
            if (file.match(/^\d{4}-\d{2}-\d{2}\.md$/)) {
              category = "Daily";
            } else if (file.startsWith("topic-")) {
              category = "Topic";
            }

            memoryFiles.push({
              name: file,
              path: `memory/${file}`,
              content,
              size: content.length,
              category,
            });
          } catch (err) {
            // Skip files we can't read
          }
        }
      }
    } catch (err) {
      // Memory directory doesn't exist
    }

    // Skills documentation (SKILL.md files)
    try {
      const skillsPath = join(WORKSPACE_PATH, "skills");
      const skills = await readdir(skillsPath);

      for (const skill of skills) {
        try {
          const skillFile = join(skillsPath, skill, "SKILL.md");
          const content = await readFile(skillFile, "utf-8");
          memoryFiles.push({
            name: `${skill}/SKILL.md`,
            path: `skills/${skill}/SKILL.md`,
            content,
            size: content.length,
            category: "Skill",
          });
        } catch (err) {
          // SKILL.md doesn't exist for this skill
        }
      }
    } catch (err) {
      // Skills directory doesn't exist
    }

    // Sort by category then name
    memoryFiles.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return b.name.localeCompare(a.name); // Recent first for dailies
    });

    res.status(200).json(memoryFiles);
  } catch (error) {
    console.error("[memories API] Error:", error);
    res.status(500).json({
      error: `Failed to read memory files: ${(error as Error).message}`,
    });
  }
}
