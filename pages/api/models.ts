import os from "os";
import { readFile } from "fs/promises";
import { join } from "path";
import type { NextApiRequest, NextApiResponse } from "next";

export interface Model {
  id: string;
  name: string;
  provider: string;
  context: number | null;
  costInput: string | null;
  costOutput: string | null;
  speed: "fast" | "balanced" | "slow" | null;
  status: "active" | "inactive";
  source: "cloud" | "local";
  role?: string;      // e.g. "primary", "fallback", "agent-override"
  sizeBytes?: number; // Ollama models only
  quantization?: string;
}

const HOME = os.homedir();

// Load optional enrichment metadata from config/models.json
async function loadMetadata(): Promise<Record<string, Partial<Model>>> {
  const meta: Record<string, Partial<Model>> = {};
  try {
    const raw = await readFile(join(process.cwd(), "config/models.json"), "utf-8");
    const { models = [] } = JSON.parse(raw);
    for (const m of models) {
      meta[m.id] = m;
      // also index by short name (e.g. "claude-sonnet-4-6" → full id)
      const short = m.id.split("/").pop();
      if (short) meta[short] = m;
    }
  } catch { /* no metadata file — fine */ }
  return meta;
}

// Discover cloud models from openclaw.json
async function discoverCloudModels(meta: Record<string, Partial<Model>>): Promise<Model[]> {
  const models: Model[] = [];
  const seen = new Set<string>();

  try {
    const raw = await readFile(join(HOME, ".openclaw/openclaw.json"), "utf-8");
    const config = JSON.parse(raw);
    const defaultModel = config.agents?.defaults?.model || {};
    const agentList: any[] = config.agents?.list || [];

    const add = (id: string, role: string) => {
      if (!id || seen.has(id)) return;
      seen.add(id);
      const enrichment = meta[id] || meta[id.split("/").pop() || ""] || {};
      const providerSlug = id.split("/")[0] || "unknown";
      const providerName = {
        anthropic: "Anthropic",
        openai: "OpenAI",
        openrouter: "OpenRouter",
        google: "Google",
        mistral: "Mistral",
      }[providerSlug] ?? providerSlug.charAt(0).toUpperCase() + providerSlug.slice(1);

      models.push({
        id,
        name: enrichment.name ?? id.split("/").slice(1).join("/"),
        provider: enrichment.provider ?? providerName,
        context: enrichment.context ?? null,
        costInput: enrichment.costInput ?? null,
        costOutput: enrichment.costOutput ?? null,
        speed: enrichment.speed ?? null,
        status: "active",
        source: "cloud",
        role,
      });
    };

    // Primary model
    if (defaultModel.primary) add(defaultModel.primary, "primary");

    // Fallbacks
    for (const id of defaultModel.fallbacks || []) add(id, "fallback");

    // Per-agent overrides
    for (const agent of agentList) {
      if (agent.model) add(agent.model, `agent:${agent.id}`);
    }

    // Cron job models
    try {
      const cronsRaw = await readFile(join(HOME, ".openclaw/cron/jobs.json"), "utf-8");
      const { jobs = [] } = JSON.parse(cronsRaw);
      for (const job of jobs) {
        const ref = job.payload?.model || job.model;
        if (ref && ref !== "default" && ref !== "haiku" && ref !== "opus") {
          // Only add fully-qualified model IDs from cron jobs
          if (ref.includes("/")) add(ref, "cron");
        }
      }
    } catch { /* cron file unavailable */ }

  } catch { /* openclaw.json unavailable */ }

  return models;
}

// Discover local models from Ollama
async function discoverOllamaModels(meta: Record<string, Partial<Model>>): Promise<Model[]> {
  const models: Model[] = [];
  try {
    const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434";
    const res = await fetch(`${ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return models;
    const { models: tags = [] } = await res.json();

    for (const tag of tags) {
      const tagName: string = tag.name || "";
      // Build a canonical id
      const id = `local/${tagName.replace(":", "-")}`;
      const enrichment = meta[id] || meta[tagName.split(":")[0]] || {};

      // Human-friendly name: "qwen3:14b" → "Qwen3 14B"
      const rawName = tagName.replace(":", " ").replace(/-/g, " ");
      const prettyName = rawName.replace(/\b\w/g, c => c.toUpperCase());

      models.push({
        id,
        name: enrichment.name ?? prettyName,
        provider: "Ollama (Local)",
        context: enrichment.context ?? null,
        costInput: "Free",
        costOutput: "Free",
        speed: enrichment.speed ?? null,
        status: "active",
        source: "local",
        sizeBytes: tag.size,
        quantization: tag.details?.quantization_level,
      });
    }
  } catch { /* Ollama not running */ }
  return models;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Model[] | { error: string }>
) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const meta = await loadMetadata();
    const [cloudModels, localModels] = await Promise.all([
      discoverCloudModels(meta),
      discoverOllamaModels(meta),
    ]);

    // Cloud first, then local; within each group preserve discovery order
    res.status(200).json([...cloudModels, ...localModels]);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}
