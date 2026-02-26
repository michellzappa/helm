const WARM_INTERVAL = 2 * 60 * 1000;
const ENDPOINTS = [
  "/api/oc-agents",
  "/api/agents-summary",
  "/api/channels-health",
  "/api/channels-summary",
  "/api/credentials-summary",
  "/api/messages-summary",
  "/api/model-usage",
  "/api/sessions",
  "/api/cost-history",
  "/api/workspace-sizes",
  "/api/nodes",
  "/api/tailscale",
  "/api/system",
  "/api/weather",
  "/api/skills",
  "/api/memory-activity",
  "/api/memory-summary",
  "/api/scheduled-tasks",
  "/api/activities",
  "/api/activity",
  "/api/counts",
];

type WarmerState = {
  timer: NodeJS.Timeout | null;
  started: boolean;
};

const globalState = globalThis as typeof globalThis & {
  __openclawCacheWarmer?: WarmerState;
};

const state: WarmerState = globalState.__openclawCacheWarmer ?? {
  timer: null,
  started: false,
};
globalState.__openclawCacheWarmer = state;

function resolvePort(defaultPort: number): number {
  const raw = process.env.PORT;
  const parsed = raw ? Number(raw) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultPort;
}

async function warm(base: string): Promise<void> {
  await Promise.allSettled(
    ENDPOINTS.map((endpoint) =>
      fetch(`${base}${endpoint}`, { method: "GET" }).catch(() => undefined)
    )
  );
}

export function startWarmer(port = 1111): void {
  if (state.started) return;
  state.started = true;

  const resolvedPort = resolvePort(port);
  const base = `http://localhost:${resolvedPort}`;

  void warm(base);
  state.timer = setInterval(() => {
    void warm(base);
  }, WARM_INTERVAL);
}

export function ensureWarmer(): void {
  startWarmer(1111);
}
