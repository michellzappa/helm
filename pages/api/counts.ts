import os from "os";
import { readdir, readFile } from "fs/promises";
import { join } from "path";
import type { NextApiRequest, NextApiResponse } from "next";
import type { SidebarCounts } from "@/lib/types";

export type { SidebarCounts } from "@/lib/types";

const HOME = os.homedir();

async function countMemory(): Promise<number> {
  let n = 0;
  // Root system files
  const roots = ["MEMORY.md","AGENTS.md","SOUL.md","USER.md","TOOLS.md","IDENTITY.md","HEARTBEAT.md"];
  for (const f of roots) {
    try { await readFile(join(HOME, ".openclaw/workspace", f)); n++; } catch {}
  }
  // Daily + topic files in memory/
  try {
    const daily = await readdir(join(HOME, ".openclaw/workspace/memory"));
    n += daily.filter(f => f.endsWith(".md")).length;
  } catch {}
  // Skill SKILL.md files — workspace only, matching what the memory page shows
  try {
    const items = await readdir(join(HOME, ".openclaw/workspace/skills"));
    for (const item of items) {
      try { await readFile(join(HOME, ".openclaw/workspace/skills", item, "SKILL.md")); n++; } catch {}
    }
  } catch {}
  return n;
}

async function countCalendar(): Promise<number> {
  try {
    const raw = await readFile(join(HOME, ".openclaw/cron/jobs.json"), "utf-8");
    const { jobs } = JSON.parse(raw);
    return Array.isArray(jobs) ? jobs.length : 0;
  } catch { return 0; }
}

async function countModels(): Promise<number> {
  const seen = new Set<string>();
  // Cloud models from openclaw.json
  try {
    const raw = await readFile(join(HOME, ".openclaw/openclaw.json"), "utf-8");
    const { agents } = JSON.parse(raw);
    const m = agents?.defaults?.model || {};
    if (m.primary) seen.add(m.primary);
    for (const id of m.fallbacks || []) seen.add(id);
    for (const a of agents?.list || []) if (a.model) seen.add(a.model);
  } catch {}
  // Local models from Ollama
  try {
    const res = await fetch("http://localhost:11434/api/tags", { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      const { models = [] } = await res.json();
      for (const m of models) seen.add(`local/${m.name}`);
    }
  } catch {}
  return seen.size || 1; // fallback to 1 if nothing discovered
}

async function countWorkspaces(): Promise<number> {
  try {
    const entries = await readdir(join(HOME, ".openclaw"), { withFileTypes: true });
    return entries.filter(
      e => e.isDirectory() && (e.name === "workspace" || e.name.startsWith("workspace-"))
    ).length;
  } catch { return 0; }
}

async function countNodes(): Promise<number> {
  try {
    const raw = await readFile(join(HOME, ".openclaw/devices/paired.json"), "utf-8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data.length : Object.keys(data).length;
  } catch { return 0; }
}

async function countSkills(): Promise<number> {
  let disabled: string[] = [];
  try {
    const raw = await readFile(
      join(HOME, ".openclaw/workspace/config/disabled-skills.json"),
      "utf-8"
    );
    disabled = JSON.parse(raw).disabled || [];
  } catch {}

  const locations = [
    { path: join(HOME, ".openclaw/workspace/skills") },
    { path: "/opt/homebrew/lib/node_modules/openclaw/skills" },
    { path: join(HOME, ".openclaw/extensions") },
  ];

  let total = 0;
  for (const { path } of locations) {
    try {
      const items = await readdir(path);
      for (const item of items) {
        if (item.startsWith(".") || item === "_disabled") continue;
        try {
          await readFile(join(path, item, "SKILL.md"));
          if (!disabled.includes(item)) total++;
        } catch {}
      }
    } catch {}
  }
  return total;
}

async function countAgents(): Promise<number> {
  try {
    const raw = await readFile(join(HOME, ".openclaw/openclaw.json"), "utf-8");
    const { agents } = JSON.parse(raw);
    return agents?.list?.length ?? 1;
  } catch { return 1; }
}

async function countChannels(): Promise<number> {
  try {
    const raw = await readFile(join(HOME, ".openclaw/openclaw.json"), "utf-8");
    const { channels = {} } = JSON.parse(raw);
    return Object.keys(channels).length;
  } catch { return 0; }
}

async function countCredentials(): Promise<number> {
  try {
    const files = await readdir(join(HOME, ".openclaw/credentials"));
    let ok = 0;
    for (const f of files) {
      if (!f.endsWith(".json") && !f.endsWith(".env")) continue;
      if (f.startsWith(".")) continue;
      try {
        const content = await readFile(join(HOME, ".openclaw/credentials", f), "utf-8");
        if (content.trim()) ok++;
      } catch {}
    }
    return ok;
  } catch { return 0; }
}

async function countDeliveryQueue(): Promise<number> {
  try {
    const files = await readdir(join(HOME, ".openclaw/delivery-queue"));
    return files.filter(f => f.endsWith(".json")).length;
  } catch { return 0; }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SidebarCounts | { error: string }>
) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const [agents, memory, scheduled, models, workspaces, nodes, skills, channels, credentials, deliveryQueue] =
      await Promise.all([
        countAgents(),
        countMemory(),
        countCalendar(),
        countModels(),
        countWorkspaces(),
        countNodes(),
        countSkills(),
        countChannels(),
        countCredentials(),
        countDeliveryQueue(),
      ]);

    res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=60");
    res.status(200).json({ agents, memory, scheduled, models, workspaces, nodes, skills, channels, credentials, deliveryQueue });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}
