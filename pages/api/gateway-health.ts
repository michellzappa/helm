import os from "os";
import { readFile } from "fs/promises";
import { execFile } from "child_process";
import { promisify } from "util";
import type { NextApiRequest, NextApiResponse } from "next";
import { withDemo } from "../../lib/demo-guard";
import { gatewayHealth as _demoFixture } from "../../lib/demo-fixtures";

const execFileAsync = promisify(execFile);
const HOME = os.homedir();
const DEFAULT_CONFIG_PATH = `${HOME}/.openclaw/openclaw.json`;
const ENDPOINTS = ["/health", "/healthz", "/ready", "/readyz"] as const;
const PROBE_TIMEOUT_MS = 1500;

type Endpoint = (typeof ENDPOINTS)[number];

interface ProbeResult {
  endpoint: Endpoint;
  url: string;
  ok: boolean;
  statusCode?: number;
  latencyMs?: number;
  error?: string;
}

export interface GatewayHealthData {
  endpoints: Endpoint[];
  configuredBaseUrl?: string;
  baseUrlSource: "env" | "openclaw.json" | "none";
  probes: ProbeResult[];
  summary: {
    available: boolean;
    healthy: number;
    total: number;
  };
  note?: string;
  configPath: {
    path: string;
    source: "command" | "fallback";
    command: string;
    error?: string;
    helpText?: string;
  };
}

async function runCommand(cmd: string, args: string[]) {
  try {
    const { stdout } = await execFileAsync(cmd, args, { timeout: 2000 });
    return { stdout: stdout.trim(), error: undefined };
  } catch (error) {
    return { stdout: "", error: String(error) };
  }
}

async function resolveConfigPath() {
  const attempted = "openclaw config path";
  const jsonResult = await runCommand("openclaw", ["config", "path", "--json"]);
  if (jsonResult.stdout) {
    try {
      const parsed = JSON.parse(jsonResult.stdout);
      const candidate = typeof parsed?.path === "string" ? parsed.path : undefined;
      if (candidate) {
        return { path: candidate, source: "command" as const, command: attempted, error: undefined };
      }
    } catch {
      // non-json output, try plain command next
    }
  }

  const plainResult = await runCommand("openclaw", ["config", "path"]);
  if (plainResult.stdout) {
    const firstLine = plainResult.stdout.split(/\r?\n/).map((line) => line.trim()).find(Boolean);
    if (firstLine) {
      return { path: firstLine, source: "command" as const, command: attempted, error: undefined };
    }
  }

  const error = jsonResult.error || plainResult.error || "Unable to resolve config path via command";
  return {
    path: DEFAULT_CONFIG_PATH,
    source: "fallback" as const,
    command: attempted,
    error,
    helpText: "Using ~/.openclaw/openclaw.json fallback because command discovery failed.",
  };
}

function normalizeBaseUrl(candidate: string): string | null {
  if (!candidate) return null;
  try {
    const parsed = new URL(candidate);
    return parsed.origin;
  } catch {
    return null;
  }
}

function findBaseUrlFromConfig(config: unknown): string | undefined {
  const cfg = config as Record<string, any>;
  const candidates = [
    cfg?.gateway?.baseUrl,
    cfg?.gateway?.url,
    cfg?.server?.baseUrl,
    cfg?.server?.url,
    cfg?.http?.baseUrl,
    cfg?.http?.url,
    cfg?.api?.baseUrl,
    cfg?.api?.url,
  ];
  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const normalized = normalizeBaseUrl(candidate);
    if (normalized) return normalized;
  }
  return undefined;
}

async function probeEndpoint(baseUrl: string, endpoint: Endpoint): Promise<ProbeResult> {
  const url = `${baseUrl}${endpoint}`;
  const started = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: { Accept: "application/json,text/plain,*/*" },
    });
    clearTimeout(timeout);
    return {
      endpoint,
      url,
      ok: response.status >= 200 && response.status < 400,
      statusCode: response.status,
      latencyMs: Date.now() - started,
    };
  } catch (error) {
    clearTimeout(timeout);
    return {
      endpoint,
      url,
      ok: false,
      error: String(error),
      latencyMs: Date.now() - started,
    };
  }
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GatewayHealthData | { error: string }>
) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const configPath = await resolveConfigPath();
    let parsedConfig: unknown = null;
    let note = configPath.helpText;

    try {
      const raw = await readFile(configPath.path, "utf-8");
      parsedConfig = JSON.parse(raw);
    } catch (error) {
      note = note ?? `Could not read config file: ${String(error)}`;
    }

    const envBaseUrl = normalizeBaseUrl(process.env.OPENCLAW_GATEWAY_URL ?? process.env.OPENCLAW_BASE_URL ?? "");
    const configBaseUrl = parsedConfig ? findBaseUrlFromConfig(parsedConfig) : undefined;
    const configuredBaseUrl = envBaseUrl ?? configBaseUrl;
    const baseUrlSource: GatewayHealthData["baseUrlSource"] = envBaseUrl
      ? "env"
      : configBaseUrl
        ? "openclaw.json"
        : "none";

    const probes = configuredBaseUrl
      ? await Promise.all(ENDPOINTS.map((endpoint) => probeEndpoint(configuredBaseUrl, endpoint)))
      : [];
    const healthy = probes.filter((probe) => probe.ok).length;

    if (!configuredBaseUrl) {
      note = note
        ?? "No gateway base URL was found in env (OPENCLAW_GATEWAY_URL / OPENCLAW_BASE_URL) or openclaw config.";
    }

    return res.status(200).json({
      endpoints: [...ENDPOINTS],
      configuredBaseUrl: configuredBaseUrl ?? undefined,
      baseUrlSource,
      probes,
      summary: {
        available: probes.length > 0,
        healthy,
        total: probes.length,
      },
      note,
      configPath,
    });
  } catch (error) {
    return res.status(500).json({ error: String(error) });
  }
}

export default withDemo(_demoFixture, handler);
