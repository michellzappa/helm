import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { OC_WORKSPACE_SKILLS, OC_EXTENSIONS, OC_CRON_JOBS, getGlobalSkillsPath } from "../../lib/paths";
import type { NextApiRequest, NextApiResponse } from "next";
import { getOrFetch } from "../../lib/server-cache";

const TTL_MS = 120_000;

export interface SkillModelLink {
  skill: string;
  script: string;
  model: string;
  source: "local" | "cloud";
  via: "ollama" | "cron" | "python" | "config";
}

// Patterns to detect local model references in scripts
const OLLAMA_PATTERNS = [
  /11434/,
  /ollama/i,
  /OLLAMA/,
];
// Extract model names from common patterns
const MODEL_EXTRACT = [
  // env var defaults: "qwen3:14b", 'qwen3:14b'
  /(?:MODEL|model)\s*[=,]\s*["']([a-zA-Z0-9._:-]+)["']/g,
  // Ollama model references
  /ollama.*?["']([a-zA-Z0-9._:-]+(?::[a-zA-Z0-9._]+)?)["']/gi,
  // kokoro / whisper / mlx references
  /(?:from\s+kokoro|Kokoro[- ]82M|kokoro)/gi,
  /(?:mlx[_-]whisper|whisper[_-]large[_-]v3)/gi,
];

const KNOWN_LOCAL_MODELS: Record<string, string> = {
  "kokoro": "kokoro-82m",
  "mlx_whisper": "mlx-whisper-large-v3-turbo",
  "mlx-whisper": "mlx-whisper-large-v3-turbo",
  "whisper-large-v3": "mlx-whisper-large-v3-turbo",
  "whisper_large_v3": "mlx-whisper-large-v3-turbo",
};

const SCRIPT_EXTENSIONS = new Set([".py", ".sh", ".ts", ".js"]);
const SKIP_DIRS = new Set([".venv", "__pycache__", "node_modules", "state", "drafts"]);

async function findScripts(skillPath: string): Promise<{ name: string; path: string }[]> {
  const results: { name: string; path: string }[] = [];

  for (const subdir of ["scripts", "."]) {
    try {
      const dir = subdir === "." ? skillPath : join(skillPath, subdir);
      const files = await readdir(dir);
      for (const f of files) {
        if (f.startsWith(".") || f.startsWith("_")) continue;
        const ext = "." + f.split(".").pop();
        if (SCRIPT_EXTENSIONS.has(ext)) {
          results.push({ name: f, path: join(dir, f) });
        }
      }
      if (results.length > 0 && subdir === "scripts") break;
    } catch { /* dir doesn't exist */ }
  }
  return results;
}

function extractModelsFromSource(content: string): string[] {
  const models = new Set<string>();

  // Check for Ollama usage
  const usesOllama = OLLAMA_PATTERNS.some(p => p.test(content));

  if (usesOllama) {
    // Extract model names from variable assignments and string literals
    const modelPatterns = [
      /["']([a-zA-Z0-9]+(?::[a-zA-Z0-9._]+))["']/g, // "qwen3:14b" style
      /DRAFT_MODEL.*?["']([a-zA-Z0-9._:-]+)["']/g,
      /TRIAGE_MODEL.*?["']([a-zA-Z0-9._:-]+)["']/g,
      /model["']\s*[,:=]\s*["']([a-zA-Z0-9._:-]+)["']/gi,
    ];
    for (const pat of modelPatterns) {
      pat.lastIndex = 0;
      let match;
      while ((match = pat.exec(content)) !== null) {
        const m = match[1];
        if (m && m.includes(":") && !m.includes("//") && !m.startsWith("http")) {
          models.add(m);
        }
      }
    }
  }

  // Check for known local models (kokoro, whisper, etc.)
  for (const [pattern, modelName] of Object.entries(KNOWN_LOCAL_MODELS)) {
    if (content.includes(pattern)) {
      models.add(modelName);
    }
  }

  return Array.from(models);
}

async function scanAllSkills(): Promise<SkillModelLink[]> {
  const links: SkillModelLink[] = [];

  const skillDirs = [
    { base: OC_WORKSPACE_SKILLS, location: "workspace" },
    { base: getGlobalSkillsPath(), location: "global" },
    { base: OC_EXTENSIONS, location: "extension" },
  ];

  for (const { base } of skillDirs) {
    let items: string[];
    try { items = await readdir(base); } catch { continue; }

    for (const item of items) {
      if (item.startsWith(".") || SKIP_DIRS.has(item)) continue;
      const skillPath = join(base, item);

      const scripts = await findScripts(skillPath);
      for (const script of scripts) {
        try {
          const content = await readFile(script.path, "utf-8");
          const models = extractModelsFromSource(content);
          for (const model of models) {
            links.push({
              skill: item,
              script: script.name,
              model,
              source: "local",
              via: "ollama",
            });
          }
        } catch { /* can't read script */ }
      }
    }
  }

  // Add cron job → model links
  try {
    const cronPath = OC_CRON_JOBS;
    const cronRaw = await readFile(cronPath, "utf-8");
    const cronJobs = JSON.parse(cronRaw).jobs ?? [];

    for (const job of cronJobs) {
      const modelRef: string = job.payload?.model || job.model || "default";
      const jobName: string = job.name || job.payload?.name || "Unknown";

      // Try to link to a skill by matching script path or job name keywords
      let skill = "system";
      const task: string = job.payload?.task || job.task || "";
      const nameLC = jobName.toLowerCase();
      // Match skill name from script path like "skills/gmail/scripts/..."
      const skillMatch = task.match(/skills\/([a-zA-Z0-9_-]+)\//);
      if (skillMatch) {
        skill = skillMatch[1];
      } else {
        // Keyword matching for known skills
        const keywordMap: Record<string, string[]> = {
          "oura": ["oura", "sleep", "readiness"],
          "gmail": ["gmail", "email", "inbox"],
          "gsc": ["seo", "search console"],
          "plausible": ["plausible", "analytics", "traffic"],
          "crm": ["crm", "pipeline", "stale", "offers", "org data", "hygiene"],
          "gumroad": ["gumroad", "sales"],
          "newsletter-draft": ["newsletter", "artificial insights"],
          "decan-daily": ["decan"],
          "github": ["github", "backup"],
          "granola-mcp": ["granola", "meeting", "post-meeting"],
          "weather": ["weather"],
        };
        for (const [sk, keywords] of Object.entries(keywordMap)) {
          if (keywords.some(kw => nameLC.includes(kw) || task.toLowerCase().includes(kw))) {
            skill = sk;
            break;
          }
        }
      }

      links.push({
        skill,
        script: jobName,
        model: modelRef,
        source: "cloud",
        via: "cron",
      });
    }
  } catch { /* no cron jobs */ }

  // Add OC system model usage
  // nomic-embed-text for memory_search
  links.push({
    skill: "memory",
    script: "memory_search",
    model: "nomic-embed-text",
    source: "local",
    via: "config",
  });

  return links;
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SkillModelLink[] | { error: string }>
) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const data = await getOrFetch<SkillModelLink[]>("api-skill-models", TTL_MS, scanAllSkills);
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

export default handler;
