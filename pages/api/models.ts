import { readFile } from "fs/promises";
import { join } from "path";
import { exec } from "child_process";
import { promisify } from "util";
import type { NextApiRequest, NextApiResponse } from "next";

const execAsync = promisify(exec);

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
  tags: string[];       // e.g. ["default"], ["fallback#1"], ["alias:haiku"]
  available: boolean;
  sizeBytes?: number;   // Ollama models only
  quantization?: string;
}

// Load optional display enrichment (cost, speed) from config/models.json
async function loadMetadata(): Promise<Record<string, Partial<Model>>> {
  const meta: Record<string, Partial<Model>> = {};
  try {
    const raw = await readFile(join(process.cwd(), "config/models.json"), "utf-8");
    for (const m of JSON.parse(raw).models ?? []) {
      meta[m.id] = m;
      const short = m.id.split("/").pop();
      if (short) meta[short] = m;
    }
  } catch {}
  return meta;
}

// Use `openclaw models list --json` — the canonical source
async function discoverCloudModels(meta: Record<string, Partial<Model>>): Promise<Model[]> {
  try {
    const { stdout } = await execAsync("openclaw models list --json", { timeout: 8000 });
    const { models: ocModels = [] } = JSON.parse(stdout);

    return ocModels.map((m: any) => {
      const enrichment = meta[m.key] ?? meta[m.key?.split("/").pop() ?? ""] ?? {};
      const providerSlug = m.key?.split("/")[0] ?? "unknown";
      const providerNames: Record<string, string> = {
        anthropic: "Anthropic", openai: "OpenAI",
        openrouter: "OpenRouter", google: "Google", mistral: "Mistral",
      };
      return {
        id: m.key,
        name: m.name ?? enrichment.name ?? m.key,
        provider: enrichment.provider ?? providerNames[providerSlug] ?? providerSlug,
        context: m.contextWindow ?? enrichment.context ?? null,
        costInput: enrichment.costInput ?? null,
        costOutput: enrichment.costOutput ?? null,
        speed: enrichment.speed ?? null,
        status: "active",
        source: "cloud",
        tags: m.tags ?? [],
        available: m.available ?? true,
      } satisfies Model;
    });
  } catch {
    return [];
  }
}

// Query Ollama directly — OC's --local flag doesn't enumerate these yet
async function discoverLocalModels(meta: Record<string, Partial<Model>>): Promise<Model[]> {
  try {
    const ollamaUrl = process.env.OLLAMA_URL ?? "http://localhost:11434";
    const res = await fetch(`${ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return [];
    const { models: tags = [] } = await res.json();

    return tags.map((tag: any) => {
      const tagName: string = tag.name ?? "";
      const id = `local/${tagName.replace(":", "-")}`;
      const baseKey = tagName.split(":")[0];
      const enrichment = meta[id] ?? meta[baseKey] ?? {};
      const prettyName = tagName.replace(":", " ").replace(/\b\w/g, (c: string) => c.toUpperCase());

      return {
        id,
        name: enrichment.name ?? prettyName,
        provider: "Ollama (Local)",
        context: enrichment.context ?? null,
        costInput: "Free",
        costOutput: "Free",
        speed: enrichment.speed ?? null,
        status: "active",
        source: "local",
        tags: [],
        available: true,
        sizeBytes: tag.size,
        quantization: tag.details?.quantization_level,
      } satisfies Model;
    });
  } catch {
    return [];
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Model[] | { error: string }>
) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  try {
    const meta = await loadMetadata();
    const [cloud, local] = await Promise.all([
      discoverCloudModels(meta),
      discoverLocalModels(meta),
    ]);
    res.status(200).json([...cloud, ...local]);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}
