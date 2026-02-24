import os from "os";
import { readdir, readFile } from "fs/promises";
import { join } from "path";
import type { NextApiRequest, NextApiResponse } from "next";

interface Skill {
  name: string;
  description: string;
  path: string;
  location: "workspace" | "global" | "extension";
  workspace?: string;
  status: "enabled" | "disabled";
  emoji?: string;
  scripts: string[];
}

const SKIP_FILES = new Set([
  "SKILL.md", "README.md", "package.json", "requirements.txt",
  ".gitignore", "pyvenv.cfg",
]);
const SKIP_DIRS = new Set([
  ".venv", "__pycache__", "node_modules", "_disabled",
  "state", "drafts", "archives",
]);
const SCRIPT_EXTENSIONS = new Set([".py", ".sh", ".ts", ".js"]);

async function scanScripts(skillPath: string): Promise<string[]> {
  const scripts: string[] = [];

  // Prefer scripts/ subdir
  const scriptsDir = join(skillPath, "scripts");
  try {
    const files = await readdir(scriptsDir);
    for (const f of files) {
      if (f.startsWith("_") || f.startsWith(".")) continue;
      const ext = "." + f.split(".").pop();
      if (SCRIPT_EXTENSIONS.has(ext)) scripts.push(f);
    }
    if (scripts.length > 0) return scripts.sort();
  } catch {
    // no scripts/ dir
  }

  // Fall back: *.py / *.sh at skill root
  try {
    const files = await readdir(skillPath);
    for (const f of files) {
      if (SKIP_FILES.has(f) || f.startsWith(".") || f.startsWith("_")) continue;
      const ext = "." + f.split(".").pop();
      if (SCRIPT_EXTENSIONS.has(ext)) scripts.push(f);
    }
  } catch {
    // ignore
  }

  return scripts.sort();
}

async function scanSkills(basePath: string, location: "workspace" | "global" | "extension"): Promise<Skill[]> {
  const skills: Skill[] = [];

  try {
    const items = await readdir(basePath);

    for (const item of items) {
      if (item.startsWith(".")) continue;
      if (SKIP_DIRS.has(item)) continue;
      if (location === "workspace" && item === "_disabled") continue;

      const skillPath = join(basePath, item);
      const skillMdPath = join(skillPath, "SKILL.md");

      try {
        const content = await readFile(skillMdPath, "utf-8");

        // Parse YAML frontmatter
        const match = content.match(/^---\n([\s\S]*?)\n---/);
        let name = item;
        let description = "";
        let emoji = "";

        if (match) {
          const frontmatter = match[1];
          const nameMatch = frontmatter.match(/^name:\s*(.+)/m);
          const descMatch = frontmatter.match(/^description:\s*(.+)/m);
          const emojiMatch = frontmatter.match(/^emoji:\s*["']?(.+?)["']?\s*$/m);

          if (nameMatch) name = nameMatch[1].trim().replace(/['"]/g, "");
          if (descMatch) description = descMatch[1].trim().replace(/['"]/g, "");
          if (emojiMatch) emoji = emojiMatch[1].trim();
        }

        const isDisabled = item.includes("_disabled") || basePath.includes("_disabled");

        let workspace: string | undefined;
        if (location === "workspace") {
          if (basePath.includes("workspace-")) {
            const wsMatch = basePath.match(/workspace-([a-z]+)/);
            workspace = wsMatch ? wsMatch[1] : "workspace";
          } else {
            workspace = "main";
          }
        }

        const scripts = await scanScripts(skillPath);

        skills.push({
          name,
          description,
          path: skillPath,
          location,
          workspace,
          status: isDisabled ? "disabled" : "enabled",
          emoji,
          scripts,
        });
      } catch {
        // Skip if SKILL.md doesn't exist
      }
    }
  } catch {
    // Directory doesn't exist, skip
  }

  return skills;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Skill[] | { error: string }>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const home = os.homedir();

    let disabledSkills: string[] = [];
    try {
      const configPath = join(home, ".openclaw/workspace/config/disabled-skills.json");
      const configContent = await readFile(configPath, "utf-8");
      const config = JSON.parse(configContent);
      disabledSkills = config.disabled || [];
    } catch {
      // no config
    }

    const [workspaceSkills, globalSkills, extensionSkills] = await Promise.all([
      scanSkills(join(home, ".openclaw/workspace/skills"), "workspace"),
      scanSkills("/opt/homebrew/lib/node_modules/openclaw/skills", "global"),
      scanSkills(join(home, ".openclaw/extensions"), "extension").catch(() => []),
    ]);

    const allSkills = [...workspaceSkills, ...globalSkills, ...extensionSkills]
      .map((skill) => ({
        ...skill,
        status: disabledSkills.includes(skill.name) ? "disabled" : skill.status,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    res.status(200).json(allSkills);
  } catch (error) {
    console.error("[skills API] Error:", error);
    res.status(500).json({
      error: `Failed to fetch skills: ${(error as Error).message}`,
    });
  }
}
