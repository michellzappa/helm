import os from "os";
import { readdir, stat } from "fs/promises";
import { join } from "path";
import type { NextApiRequest, NextApiResponse } from "next";

interface Workspace {
  id: string;
  name: string;
  path: string;
  type: "main" | "project" | "skill" | "session";
  description: string;
  itemCount?: number;
  status: "active" | "archived";
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Workspace[] | { error: string }>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const homeDir = os.homedir();
    const openclawDir = join(homeDir, ".openclaw");
    const workspaces: Workspace[] = [];

    // Scan for workspace-* directories in ~/.openclaw
    try {
      const items = await readdir(openclawDir);
      const workspaceDirs = items.filter(
        (item) => item.startsWith("workspace") && !item.startsWith(".")
      );

      for (const wsDir of workspaceDirs) {
        const wsPath = join(openclawDir, wsDir);
        const stats = await stat(wsPath);

        if (!stats.isDirectory()) continue;

        // Determine workspace name and type
        let name: string;
        let type: "main" | "project" = "project";
        let description: string;

        if (wsDir === "workspace") {
          name = "Main";
          type = "main";
          description = "Central OpenClaw workspace with system files, memory, and config";
        } else {
          const casaMatch = wsDir.match(/workspace-(.+)/);
          name = casaMatch ? casaMatch[1].charAt(0).toUpperCase() + casaMatch[1].slice(1) : wsDir;
          description = `Dedicated workspace for ${name.toLowerCase()} projects`;
        }

        workspaces.push({
          id: wsDir,
          name,
          path: wsPath,
          type,
          description,
          status: "active",
        });

        // Scan for subdirectories in each workspace
        try {
          const wsItems = await readdir(wsPath);

          // Count skills
          if (wsItems.includes("skills")) {
            try {
              const skills = await readdir(join(wsPath, "skills"));
              const skillCount = skills.filter((s) => !s.startsWith(".")).length;
              if (skillCount > 0) {
                workspaces.push({
                  id: `${wsDir}-skills`,
                  name: `${name} Skills`,
                  path: join(wsPath, "skills"),
                  type: "skill",
                  description: `${skillCount} installed skills`,
                  itemCount: skillCount,
                  status: "active",
                });
              }
            } catch (err) {
              // Skip if error
            }
          }

          // Count memory files
          if (wsItems.includes("memory")) {
            try {
              const memories = await readdir(join(wsPath, "memory"));
              const memoryCount = memories.filter((m) => m.endsWith(".md")).length;
              if (memoryCount > 0) {
                workspaces.push({
                  id: `${wsDir}-memory`,
                  name: `${name} Memory`,
                  path: join(wsPath, "memory"),
                  type: "project",
                  description: `${memoryCount} daily notes and topic files`,
                  itemCount: memoryCount,
                  status: "active",
                });
              }
            } catch (err) {
              // Skip if error
            }
          }
        } catch (err) {
          // Skip workspace subdirectories if error
        }
      }
    } catch (err) {
      console.error("[workspaces API] Error scanning .openclaw:", err);
    }

    // Sort: main workspace first, then by type, then by name
    workspaces.sort((a, b) => {
      if (a.type !== b.type) {
        const typeOrder = { main: 0, project: 1, skill: 2, session: 3 };
        return typeOrder[a.type] - typeOrder[b.type];
      }
      return a.name.localeCompare(b.name);
    });

    res.status(200).json(workspaces);
  } catch (error) {
    console.error("[workspaces API] Error:", error);
    res.status(500).json({
      error: `Failed to fetch workspaces: ${(error as Error).message}`,
    });
  }
}
