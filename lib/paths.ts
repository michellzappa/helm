// Platform-Aware Paths
// Cross-platform path resolution for Linux, macOS, and Windows
// Eliminates hardcoded os.homedir() + .openclaw patterns

import os from "os";
import { join, sep } from "path";

export type Platform = "linux" | "macos" | "windows" | "unknown";

/**
 * Detect the current platform
 */
export function getPlatform(): Platform {
  const platform = process.platform;
  if (platform === "darwin") return "macos";
  if (platform === "linux") return "linux";
  if (platform === "win32") return "windows";
  return "unknown";
}

/**
 * Check if running on macOS
 */
export function isMacOS(): boolean {
  return process.platform === "darwin";
}

/**
 * Check if running on Linux
 */
export function isLinux(): boolean {
  return process.platform === "linux";
}

/**
 * Check if running on Windows
 */
export function isWindows(): boolean {
  return process.platform === "win32";
}

// ============================================================================
// Base Paths
// ============================================================================

const HOME = os.homedir();

/**
 * Get the base config directory for the current platform
 * - macOS/Linux: ~/.openclaw
 * - Windows: %USERPROFILE%\.openclaw
 */
export function getOpenClawHome(): string {
  return process.env.OPENCLAW_HOME || join(HOME, ".openclaw");
}

/**
 * Get the workspace directory
 * Respects WORKSPACE_PATH env var, falls back to ~/.openclaw/workspace
 */
export function getWorkspacePath(): string {
  return process.env.WORKSPACE_PATH || join(getOpenClawHome(), "workspace");
}

/**
 * Get the extensions directory
 */
export function getExtensionsPath(): string {
  return join(getOpenClawHome(), "extensions");
}

/**
 * Get the credentials directory
 */
export function getCredentialsPath(): string {
  return join(getOpenClawHome(), "credentials");
}

/**
 * Get the cron jobs file path
 */
export function getCronJobsPath(): string {
  return join(getOpenClawHome(), "cron", "jobs.json");
}

// ============================================================================
// Agent Paths
// ============================================================================

/**
 * Get the base agents directory
 */
export function getAgentsPath(): string {
  return join(getOpenClawHome(), "agents");
}

/**
 * Get the main agent directory
 */
export function getMainAgentPath(): string {
  return join(getAgentsPath(), "main");
}

/**
 * Get the sessions directory for the main agent
 */
export function getSessionsPath(): string {
  return join(getMainAgentPath(), "sessions");
}

/**
 * Get the sessions metadata file path
 */
export function getSessionsMetadataPath(): string {
  return join(getSessionsPath(), "sessions.json");
}

// ============================================================================
// Workspace Paths
// ============================================================================

/**
 * Get the workspace skills directory
 */
export function getWorkspaceSkillsPath(): string {
  return join(getWorkspacePath(), "skills");
}

/**
 * Get the logs directory
 */
export function getLogsPath(): string {
  return join(getWorkspacePath(), "logs");
}

// ============================================================================
// Global Skills Resolution
// ============================================================================

import { realpathSync, existsSync } from "fs";
import { execSync } from "child_process";
import { dirname } from "path";

let _globalSkillsPath: string | null = null;

/**
 * Resolve OpenClaw's global skills directory from the installed binary
 * Falls back to platform-specific common paths
 */
export function getGlobalSkillsPath(): string {
  if (_globalSkillsPath !== null) return _globalSkillsPath;

  // Method 1: Resolve from the openclaw binary
  try {
    const bin = execSync("which openclaw", { timeout: 3000 }).toString().trim();
    if (bin) {
      const realBin = realpathSync(bin);
      let installDir = dirname(realBin);
      
      // If we're in a bin/ subdir, go up
      if (installDir.endsWith(`${sep}bin`)) {
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

  // Method 2: Platform-specific common paths
  const candidates = getPlatformSpecificGlobalPaths();
  
  for (const p of candidates) {
    if (existsSync(p)) {
      _globalSkillsPath = p;
      return p;
    }
  }

  // Last resort: return the most common path for the platform
  _globalSkillsPath = candidates[0] || 
    (isWindows() 
      ? join(HOME, "AppData", "Roaming", "npm", "node_modules", "openclaw", "skills")
      : "/usr/local/lib/node_modules/openclaw/skills");
  return _globalSkillsPath;
}

/**
 * Get platform-specific paths where global skills might be installed
 */
export function getPlatformSpecificGlobalPaths(): string[] {
  const platform = getPlatform();
  
  switch (platform) {
    case "macos":
      return [
        "/opt/homebrew/lib/node_modules/openclaw/skills",     // macOS Homebrew ARM
        "/usr/local/lib/node_modules/openclaw/skills",         // macOS Homebrew Intel
        join(HOME, ".npm", "lib", "node_modules", "openclaw", "skills"),
        join(HOME, "node_modules", "openclaw", "skills"),
      ];
      
    case "linux":
      return [
        "/usr/lib/node_modules/openclaw/skills",               // Linux system-wide
        "/usr/local/lib/node_modules/openclaw/skills",         // Linux user install
        join(HOME, ".npm", "lib", "node_modules", "openclaw", "skills"),
        join(HOME, "node_modules", "openclaw", "skills"),
      ];
      
    case "windows":
      return [
        join(HOME, "AppData", "Roaming", "npm", "node_modules", "openclaw", "skills"),
        join(HOME, "AppData", "Local", "npm", "node_modules", "openclaw", "skills"),
        "C:\\Program Files\\nodejs\\node_modules\\openclaw\\skills",
        join(HOME, "node_modules", "openclaw", "skills"),
      ];
      
    default:
      return [
        "/usr/local/lib/node_modules/openclaw/skills",
        join(HOME, "node_modules", "openclaw", "skills"),
      ];
  }
}

// ============================================================================
// Convenience Exports (backwards compatible with existing code)
// ============================================================================

/** @deprecated Use getOpenClawHome() instead */
export const OC_HOME = getOpenClawHome();

/** @deprecated Use getWorkspacePath() instead */
export const OC_WORKSPACE = getWorkspacePath();

/** @deprecated Use getWorkspaceSkillsPath() instead */
export const OC_WORKSPACE_SKILLS = getWorkspaceSkillsPath();

/** @deprecated Use getExtensionsPath() instead */
export const OC_EXTENSIONS = getExtensionsPath();

/** @deprecated Use getCredentialsPath() instead */
export const OC_CREDENTIALS = getCredentialsPath();

/** @deprecated Use getCronJobsPath() instead */
export const OC_CRON_JOBS = getCronJobsPath();

/** @deprecated Use getSessionsPath() instead */
export const OC_SESSIONS_DIR = getSessionsPath();
