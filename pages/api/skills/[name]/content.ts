import { createHandler } from "@/lib/api/handler";
import { readFile } from "fs/promises";
import { join } from "path";
import os from "os";
import { getGlobalSkillsPath } from "@/lib/paths";

interface SkillContentResponse {
  content: string;
  path: string;
}

async function findSkillFile(skillName: string): Promise<string | null> {
  const locations = [
    join(os.homedir(), ".openclaw/workspace/skills", skillName, "SKILL.md"),
    join(getGlobalSkillsPath(), skillName, "SKILL.md"),
    join(os.homedir(), ".openclaw/extensions", skillName, "SKILL.md"),
  ];
  
  for (const path of locations) {
    try {
      await readFile(path);
      return path;
    } catch {
      continue;
    }
  }
  
  return null;
}

export default createHandler<SkillContentResponse>({
  // No server-side caching for dynamic skill content - fetch fresh each time
  async handler(req) {
    const { name } = req.query as { name: string };
    
    if (!name) {
      throw new Error("Skill name is required");
    }
    
    const filePath = await findSkillFile(name);
    
    if (!filePath) {
      throw new Error(`Skill '${name}' not found`);
    }
    
    const content = await readFile(filePath, "utf-8");
    
    return {
      content,
      path: filePath,
    };
  },
});
