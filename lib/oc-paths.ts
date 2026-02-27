/**
 * Cross-platform OpenClaw path resolution.
 * No hardcoded paths — works on macOS (Homebrew), Linux (npm global), Windows, etc.
 */
import os from "os";
import { join, dirname } from "path";
import { realpathSync, existsSync } from "fs";
import { execSync } from "child_process";

const HOME = os.homedir();

/** ~/.openclaw */
export const OC_HOME = join(HOME, ".openclaw");

/** ~/.openclaw/workspace */
export const OC_WORKSPACE = join(OC_HOME, "workspace");

/** ~/.openclaw/workspace/skills */
export const OC_WORKSPACE_SKILLS = join(OC_WORKSPACE, "skills");

/** ~/.openclaw/extensions */
export const OC_EXTENSIONS = join(OC_HOME, "extensions");

/** ~/.openclaw/cron/jobs.json */
export const OC_CRON_JOBS = join(OC_HOME, "cron/jobs.json");

/** ~/.openclaw/agents/main/sessions */
export const OC_SESSIONS_DIR = join(OC_HOME, "agents/main/sessions");

/** ~/.openclaw/credentials */
export const OC_CREDENTIALS = join(OC_HOME, "credentials");

let _globalSkillsPath: string | null = null;

/**
 * Resolve OpenClaw's global skills directory from the installed binary.
 * Falls back to common paths if `which openclaw` fails.
 */
export function getGlobalSkillsPath(): string {
  if (_globalSkillsPath !== null) return _globalSkillsPath;

  // Method 1: Resolve from the openclaw binary
  try {
    const bin = execSync("which openclaw", { timeout: 3000 }).toString().trim();
    if (bin) {
      const realBin = realpathSync(bin);
      // Binary is at <install>/openclaw.mjs or <install>/bin/openclaw
      // Skills are at <install>/skills
      let installDir = dirname(realBin);
      // If we're in a bin/ subdir, go up
      if (installDir.endsWith("/bin") || installDir.endsWith("\\bin")) {
        installDir = dirname(installDir);
      }
      const skillsDir = join(installDir, "skills");
      if (existsSync(skillsDir)) {
        _globalSkillsPath = skillsDir;
        return skillsDir;
      }
      // Try one level up (node_modules/openclaw)
      const parentSkills = join(dirname(installDir), "openclaw", "skills");
      if (existsSync(parentSkills)) {
        _globalSkillsPath = parentSkills;
        return parentSkills;
      }
    }
  } catch { /* which failed — not in PATH or Windows */ }

  // Method 2: Common global install paths
  const candidates = [
    "/opt/homebrew/lib/node_modules/openclaw/skills",     // macOS Homebrew ARM
    "/usr/local/lib/node_modules/openclaw/skills",         // macOS Homebrew Intel / Linux global
    "/usr/lib/node_modules/openclaw/skills",               // Linux system-wide
    join(HOME, ".npm/lib/node_modules/openclaw/skills"),   // npm prefix
    join(HOME, "node_modules/openclaw/skills"),             // local install
  ];

  for (const p of candidates) {
    if (existsSync(p)) {
      _globalSkillsPath = p;
      return p;
    }
  }

  // Last resort: return the most common path even if it doesn't exist
  _globalSkillsPath = "/usr/local/lib/node_modules/openclaw/skills";
  return _globalSkillsPath;
}
