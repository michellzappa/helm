// Model Resolution - Single Source of Truth
// Consolidates model metadata, pricing, aliases, and CLI integration

import { readFile } from "fs/promises";
import { join } from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// ============================================================================
// Types
// ============================================================================

export type ModelSpeed = "fast" | "balanced" | "slow";
export type ModelStatus = "active" | "inactive";
export type ModelSource = "cloud" | "local";

export interface Model {
  id: string;
  name: string;
  provider: string;
  context: number | null;
  costInput: string | null;
  costOutput: string | null;
  speed: ModelSpeed | null;
  status: ModelStatus;
  source: ModelSource;
  tags: string[];
  available: boolean;
  sizeBytes?: number;
  quantization?: string;
  // Internal metadata
  aliases?: string[];
  description?: string;
}

export interface ModelPricing {
  inputPerMillion: number | null;  // Cost per million input tokens in EUR
  outputPerMillion: number | null; // Cost per million output tokens in EUR
  currency: string;
}

export interface ResolvedModel {
  model: Model | null;
  canonicalId: string;
  isAlias: boolean;
}

// ============================================================================
// Model Aliases Map
// ============================================================================

/**
 * Common model aliases for shorthand resolution
 * Maps common names to canonical model IDs
 */
export const MODEL_ALIASES: Record<string, string> = {
  // Anthropic models
  "claude": "anthropic/claude-sonnet-4-6",
  "claude-sonnet": "anthropic/claude-sonnet-4-6",
  "claude-haiku": "anthropic/claude-haiku-4-5",
  "claude-opus": "anthropic/claude-opus-4-6",
  "sonnet": "anthropic/claude-sonnet-4-6",
  "haiku": "anthropic/claude-haiku-4-5",
  "opus": "anthropic/claude-opus-4-6",
  
  // OpenAI models
  "gpt-4": "openai/gpt-4",
  "gpt-4o": "openai/gpt-4o",
  "gpt-4o-mini": "openai/gpt-4o-mini",
  
  // Local models
  "qwen": "local/qwen3-14b",
  "qwen3": "local/qwen3-14b",
  "kokoro": "local/kokoro-82m",
  "whisper": "local/whisper-large-v3",
};

// ============================================================================
// Pricing Constants (EUR per million tokens)
// ============================================================================

export const MODEL_PRICING: Record<string, ModelPricing> = {
  "anthropic/claude-sonnet-4-6": {
    inputPerMillion: 3.0,
    outputPerMillion: 15.0,
    currency: "EUR",
  },
  "anthropic/claude-haiku-4-5": {
    inputPerMillion: 0.75,
    outputPerMillion: 3.75,
    currency: "EUR",
  },
  "anthropic/claude-opus-4-6": {
    inputPerMillion: 14.0,
    outputPerMillion: 70.0,
    currency: "EUR",
  },
  "openai/gpt-4o": {
    inputPerMillion: 2.5,
    outputPerMillion: 10.0,
    currency: "EUR",
  },
  "openai/gpt-4o-mini": {
    inputPerMillion: 0.15,
    outputPerMillion: 0.6,
    currency: "EUR",
  },
  // Local models are free
  "local/qwen3-14b": {
    inputPerMillion: 0,
    outputPerMillion: 0,
    currency: "EUR",
  },
};

// ============================================================================
// Model Loading
// ============================================================================

let _modelsCache: Model[] | null = null;
let _modelsCacheTime = 0;
const MODELS_CACHE_TTL = 60_000; // 1 minute

/**
 * Load model metadata from config/models.json
 */
export async function loadModelMetadata(): Promise<Record<string, Partial<Model>>> {
  try {
    const raw = await readFile(join(process.cwd(), "config", "models.json"), "utf-8");
    const config = JSON.parse(raw);
    const meta: Record<string, Partial<Model>> = {};
    
    for (const m of config.models ?? []) {
      meta[m.id] = m;
      // Also index by short name
      const short = m.id.split("/").pop();
      if (short) meta[short] = m;
    }
    
    return meta;
  } catch {
    return {};
  }
}

/**
 * Fetch cloud models from OpenClaw CLI
 */
export async function fetchCloudModels(meta: Record<string, Partial<Model>> = {}): Promise<Model[]> {
  try {
    const { stdout } = await execAsync("openclaw models list --json", { timeout: 8000 });
    const { models: ocModels = [] } = JSON.parse(stdout);

    return ocModels.map((m: any) => {
      const enrichment = meta[m.key] ?? meta[m.key?.split("/").pop() ?? ""] ?? {};
      const providerSlug = m.key?.split("/")[0] ?? "unknown";
      
      const providerNames: Record<string, string> = {
        anthropic: "Anthropic",
        openai: "OpenAI",
        openrouter: "OpenRouter",
        google: "Google",
        mistral: "Mistral",
        cohere: "Cohere",
      };
      
      // Merge with pricing data
      const pricing = MODEL_PRICING[m.key];
      
      return {
        id: m.key,
        name: m.name ?? enrichment.name ?? m.key,
        provider: enrichment.provider ?? providerNames[providerSlug] ?? providerSlug,
        context: m.contextWindow ?? enrichment.context ?? null,
        costInput: pricing 
          ? `€${pricing.inputPerMillion}/M` 
          : enrichment.costInput ?? null,
        costOutput: pricing 
          ? `€${pricing.outputPerMillion}/M` 
          : enrichment.costOutput ?? null,
        speed: enrichment.speed ?? null,
        status: "active",
        source: "cloud",
        tags: m.tags ?? [],
        available: m.available ?? true,
        aliases: getAliasesForModel(m.key),
      } satisfies Model;
    });
  } catch (error) {
    console.error("Failed to fetch cloud models:", error);
    return [];
  }
}

/**
 * Fetch local models from Ollama
 */
export async function fetchLocalModels(meta: Record<string, Partial<Model>> = {}): Promise<Model[]> {
  try {
    const ollamaUrl = process.env.OLLAMA_URL ?? "http://localhost:11434";
    const res = await fetch(`${ollamaUrl}/api/tags`, { 
      signal: AbortSignal.timeout(3000) 
    });
    
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
        aliases: getAliasesForModel(id),
      } satisfies Model;
    });
  } catch (error) {
    console.error("Failed to fetch local models:", error);
    return [];
  }
}

/**
 * Get all available models (cloud + local)
 * Results are cached for 1 minute
 */
export async function getAllModels(): Promise<Model[]> {
  const now = Date.now();
  
  if (_modelsCache && now - _modelsCacheTime < MODELS_CACHE_TTL) {
    return _modelsCache;
  }
  
  const meta = await loadModelMetadata();
  const [cloud, local] = await Promise.all([
    fetchCloudModels(meta),
    fetchLocalModels(meta),
  ]);
  
  _modelsCache = [...cloud, ...local];
  _modelsCacheTime = now;
  
  return _modelsCache;
}

/**
 * Clear the models cache (useful for testing or force refresh)
 */
export function clearModelsCache(): void {
  _modelsCache = null;
  _modelsCacheTime = 0;
}

// ============================================================================
// Model Resolution
// ============================================================================

/**
 * Resolve a model ID or alias to its canonical form
 */
export function resolveModelId(modelId: string): ResolvedModel {
  // Check if it's a direct match
  const canonicalId = MODEL_ALIASES[modelId.toLowerCase()] ?? modelId;
  const isAlias = canonicalId !== modelId;
  
  return {
    model: null, // Will be populated if needed
    canonicalId,
    isAlias,
  };
}

/**
 * Find a model by ID or alias
 */
export async function findModel(modelId: string): Promise<Model | null> {
  const { canonicalId } = resolveModelId(modelId);
  const models = await getAllModels();
  
  return models.find(m => m.id === canonicalId) ?? null;
}

/**
 * Get all aliases for a model
 */
export function getAliasesForModel(modelId: string): string[] {
  const aliases: string[] = [];
  
  for (const [alias, canonical] of Object.entries(MODEL_ALIASES)) {
    if (canonical === modelId) {
      aliases.push(alias);
    }
  }
  
  return aliases;
}

// ============================================================================
// Pricing Utilities
// ============================================================================

/**
 * Get pricing for a specific model
 */
export function getModelPricing(modelId: string): ModelPricing | null {
  const { canonicalId } = resolveModelId(modelId);
  return MODEL_PRICING[canonicalId] ?? null;
}

/**
 * Calculate estimated cost for token usage
 */
export function calculateCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number
): number | null {
  const pricing = getModelPricing(modelId);
  if (!pricing) return null;
  
  const inputCost = pricing.inputPerMillion 
    ? (inputTokens / 1_000_000) * pricing.inputPerMillion 
    : 0;
  const outputCost = pricing.outputPerMillion 
    ? (outputTokens / 1_000_000) * pricing.outputPerMillion 
    : 0;
    
  return inputCost + outputCost;
}

/**
 * Format cost as human-readable string
 */
export function formatCost(cost: number | null): string {
  if (cost === null) return "Unknown";
  if (cost === 0) return "Free";
  if (cost < 0.01) return `< €0.01`;
  return `€${cost.toFixed(2)}`;
}

// ============================================================================
// Model Categories & Filtering
// ============================================================================

/**
 * Get models grouped by provider
 */
export function groupModelsByProvider(models: Model[]): Record<string, Model[]> {
  return models.reduce((acc, model) => {
    const provider = model.provider;
    if (!acc[provider]) acc[provider] = [];
    acc[provider].push(model);
    return acc;
  }, {} as Record<string, Model[]>);
}

/**
 * Get models grouped by source (cloud vs local)
 */
export function groupModelsBySource(models: Model[]): {
  cloud: Model[];
  local: Model[];
} {
  return {
    cloud: models.filter(m => m.source === "cloud"),
    local: models.filter(m => m.source === "local"),
  };
}

/**
 * Filter models by speed
 */
export function filterModelsBySpeed(models: Model[], speed: ModelSpeed): Model[] {
  return models.filter(m => m.speed === speed);
}

/**
 * Get recommended model based on use case
 */
export function getRecommendedModel(
  models: Model[],
  useCase: "fast" | "balanced" | "powerful" | "cheap"
): Model | null {
  switch (useCase) {
    case "fast":
      return models.find(m => m.speed === "fast" && m.source === "cloud") ?? 
             models.find(m => m.speed === "fast") ?? 
             models[0] ?? null;
    case "balanced":
      return models.find(m => m.speed === "balanced" && m.source === "cloud") ?? 
             models.find(m => m.speed === "balanced") ?? 
             models[0] ?? null;
    case "powerful":
      // Prefer models with large context windows
      return models
        .filter(m => m.source === "cloud")
        .sort((a, b) => (b.context ?? 0) - (a.context ?? 0))[0] ?? 
             models[0] ?? null;
    case "cheap":
      // Prefer local models, then cheapest cloud
      return models.find(m => m.source === "local") ?? 
             models.find(m => m.speed === "fast") ?? 
             models[0] ?? null;
    default:
      return models[0] ?? null;
  }
}

// ============================================================================
// CLI Integration
// ============================================================================

/**
 * Validate if a model ID is available in the system
 */
export async function validateModel(modelId: string): Promise<{
  valid: boolean;
  model?: Model;
  error?: string;
}> {
  if (!modelId) {
    return { valid: false, error: "Model ID is required" };
  }
  
  const model = await findModel(modelId);
  
  if (!model) {
    return { 
      valid: false, 
      error: `Model "${modelId}" not found. Available models: ${(await getAllModels()).map(m => m.id).join(", ")}` 
    };
  }
  
  if (!model.available) {
    return { valid: false, model, error: `Model "${modelId}" is not available` };
  }
  
  return { valid: true, model };
}

/**
 * Get default model ID from config or fallback
 */
export async function getDefaultModelId(): Promise<string> {
  // Try to get from environment
  if (process.env.DEFAULT_MODEL) {
    const validation = await validateModel(process.env.DEFAULT_MODEL);
    if (validation.valid) {
      return validation.model!.id;
    }
  }
  
  // Fallback to first available cloud model
  const models = await getAllModels();
  const cloudModel = models.find(m => m.source === "cloud" && m.available);
  if (cloudModel) return cloudModel.id;
  
  // Last resort: first available model
  const anyModel = models.find(m => m.available);
  if (anyModel) return anyModel.id;
  
  // Absolute fallback
  return "anthropic/claude-sonnet-4-6";
}
