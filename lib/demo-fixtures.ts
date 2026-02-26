/**
 * Demo fixtures for DEMO_MODE=1.
 * Deterministic fake data that looks realistic but contains no PII.
 * Used for safe screenshots / public README images.
 */

const NOW = Date.now();
const HOUR = 3_600_000;
const DAY = 86_400_000;

function daysAgo(n: number) { return NOW - n * DAY; }
function hoursAgo(n: number) { return NOW - n * HOUR; }
function isoDate(ms: number) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ── /api/oc-agents ──────────────────────────────────────────────────────────
export const ocAgents = [
  {
    id: "main",
    name: "main",
    workspace: "/home/user/.openclaw/workspace",
    agentDir: "/home/user/.openclaw/agents/main/agent",
    model: "anthropic/claude-opus-4-6",
    isDefault: true,
    sessionCount: 42,
    skillCount: 12,
    bindings: [
      { channel: "telegram" },
      { channel: "discord" },
    ],
  },
  {
    id: "casa",
    name: "casa",
    workspace: "/home/user/.openclaw/workspace-casa",
    agentDir: "/home/user/.openclaw/agents/casa/agent",
    model: "anthropic/claude-haiku-4-5",
    isDefault: false,
    sessionCount: 8,
    skillCount: 3,
    bindings: [{ channel: "telegram" }],
  },
];

// ── /api/agents-summary ─────────────────────────────────────────────────────
export const agentsSummary = {
  total: 2,
  defaultAgent: "main",
  recentErrors: 0,
  lastRun: { agent: "main", status: "ok", time: hoursAgo(0.5) },
};

// ── /api/channels-health ────────────────────────────────────────────────────
export const channelsHealth = {
  overallPct: 90,
  channels: [
    { id: "telegram", name: "telegram", healthPct: 100, enabled: true, stuck: 0, queued: 0 },
    { id: "discord", name: "discord", healthPct: 95, enabled: true, stuck: 0, queued: 0 },
    { id: "whatsapp", name: "whatsapp", healthPct: 75, enabled: true, stuck: 0, queued: 1 },
  ],
};

// ── /api/channels-summary ───────────────────────────────────────────────────
export const channelsSummary = {
  total: 3,
  healthy: 3,
  degraded: 0,
};

// ── /api/credentials-summary ────────────────────────────────────────────────
export const credentialsSummary = {
  total: 12,
  valid: 9,
  expired: 1,
  expiringSoon: 2,
  byCategory: { oauth: 6, api_key: 8, token: 4 },
};

// ── /api/messages-summary ───────────────────────────────────────────────────
export const messagesSummary = {
  queued: 0,
  stuck: 0,
  recentDeliveries: 0,
  lastDelivery: { channel: "telegram", time: hoursAgo(1), status: "delivered" },
};

// ── /api/model-usage ────────────────────────────────────────────────────────
export const modelUsage = [
  {
    modelId: "anthropic/claude-haiku-4-5",
    jobs: [
      { jobId: "cron-a1b2", jobName: "Email Inbox Processor", modelRef: "haiku" },
      { jobId: "cron-c3d4", jobName: "Social Monitor", modelRef: "haiku" },
      { jobId: "cron-e5f6", jobName: "Meeting Notes Extractor", modelRef: "haiku" },
    ],
  },
  {
    modelId: "anthropic/claude-opus-4-6",
    jobs: [
      { jobId: "cron-g7h8", jobName: "Daily Summary", modelRef: "opus" },
    ],
  },
];

// ── /api/sessions ───────────────────────────────────────────────────────────
export const sessions = {
  sessions: [
    ...Array.from({ length: 2 }, (_, i) => ({
      key: `agent:main:${i === 0 ? "main" : "telegram:dm:user"}`,
      sessionId: `sess-${String(i).padStart(4, "0")}`,
      kind: i === 0 ? "direct" : "telegram",
      label: i === 0 ? "Main session" : "Telegram DM",
      model: "anthropic/claude-opus-4-6",
      inputTokens: 120_000 + i * 30_000,
      outputTokens: 45_000 + i * 10_000,
      cacheRead: 80_000,
      cacheWrite: 12_000,
      totalTokens: 257_000 + i * 40_000,
      costEur: 2.15 + i * 0.8,
      updatedAt: hoursAgo(i * 2),
    })),
    ...Array.from({ length: 47 }, (_, i) => ({
      key: `agent:main:cron:job-${String(i).padStart(3, "0")}`,
      sessionId: `sess-cron-${String(i).padStart(4, "0")}`,
      kind: "cron",
      label: `Cron task ${i + 1}`,
      model: "anthropic/claude-haiku-4-5",
      inputTokens: 5_000 + i * 200,
      outputTokens: 1_500 + i * 50,
      cacheRead: 3_000,
      cacheWrite: 500,
      totalTokens: 10_000 + i * 250,
      costEur: 0.05 + i * 0.01,
      updatedAt: hoursAgo(i),
    })),
  ],
  totalCostEur: 31.50,
  totalInputTokens: 3_200_000,
  totalOutputTokens: 980_000,
};

// ── /api/cost-history ───────────────────────────────────────────────────────
export const costHistory = {
  summary: { today: 4.82, week: 31.50, month: 124.30, allTime: 487.60 },
  byModel: [
    { model: "anthropic/claude-opus-4-6", cost: 89.50, percent: 57 },
    { model: "anthropic/claude-haiku-4-5", cost: 67.30, percent: 43 },
  ],
  byKind: [
    { kind: "direct", cost: 78.20, percent: 50 },
    { kind: "cron", cost: 48.90, percent: 31 },
    { kind: "telegram", cost: 29.70, percent: 19 },
  ],
  daily: Array.from({ length: 30 }, (_, i) => ({
    date: isoDate(daysAgo(29 - i)),
    cost: 3 + Math.sin(i * 0.5) * 2 + (i > 25 ? 3 : 0),
  })),
  currency: "USD" as const,
};

// ── /api/workspace-sizes ────────────────────────────────────────────────────
export const workspaceSizes = [
  { id: "workspace", path: "/home/user/.openclaw/workspace", sizeBytes: 737_280_000 },
  { id: "workspace-2", path: "/home/user/.openclaw/workspace-2", sizeBytes: 60_416 },
];

// ── /api/nodes ──────────────────────────────────────────────────────────────
export const nodes = [
  { deviceId: "node-001", displayName: "server", platform: "linux", clientMode: "node", role: "worker", createdAtMs: daysAgo(90), lastUsedAtMs: hoursAgo(0.1) },
  { deviceId: "node-002", displayName: "laptop", platform: "darwin", clientMode: "node", role: "worker", createdAtMs: daysAgo(60), lastUsedAtMs: hoursAgo(0.5) },
  { deviceId: "node-003", displayName: "pi-zero", platform: "linux", clientMode: "node", role: "worker", createdAtMs: daysAgo(30), lastUsedAtMs: hoursAgo(2) },
  { deviceId: "node-004", displayName: "phone", platform: "ios", clientMode: "node", role: "mobile", createdAtMs: daysAgo(45), lastUsedAtMs: daysAgo(1) },
  { deviceId: "node-005", displayName: "tablet", platform: "ios", clientMode: "node", role: "mobile", createdAtMs: daysAgo(20), lastUsedAtMs: daysAgo(3) },
];

// ── /api/tailscale ──────────────────────────────────────────────────────────
export const tailscale = {
  self: { name: "gateway", ip: "100.64.0.1" },
  peers: [
    { name: "desktop", ip: "100.64.0.2", online: true, active: true },
    { name: "server-2", ip: "100.64.0.3", online: true, active: true },
    { name: "mobile", ip: "100.64.0.4", online: true, active: false },
  ],
};

// ── /api/system ─────────────────────────────────────────────────────────────
export const system = {
  cpu: { pct: 28.4, loadAvg: [2.1, 3.5, 2.8] as [number, number, number] },
  ram: { usedBytes: 12_800_000_000, totalBytes: 32_000_000_000, pct: 40 },
  disk: { usedBytes: 198_000_000_000, totalBytes: 500_000_000_000, pct: 39.6, mount: "/" },
  uptimeSeconds: 604_800,
  hostname: "demo.local",
};

// ── /api/weather ────────────────────────────────────────────────────────────
export const weather = {
  location: "Demo City",
  tempC: 18,
  feelsLikeC: 16,
  code: 2,
  desc: "Partly cloudy",
  humidity: 55,
  windKmph: 12,
  forecast: [
    { date: isoDate(NOW), code: 2, desc: "Partly cloudy", maxC: 18, minC: 12 },
    { date: isoDate(NOW + DAY), code: 3, desc: "Overcast", maxC: 15, minC: 10 },
    { date: isoDate(NOW + 2 * DAY), code: 1, desc: "Mainly clear", maxC: 14, minC: 8 },
  ],
};

// ── /api/skills ─────────────────────────────────────────────────────────────
export const skills = [
  // Workspace skills
  ...["cms", "crm", "gmail", "gsc", "gumroad", "newsletter-draft", "plausible", "daily-reflection", "decan-daily", "granola-mcp", "humanizer"].map((name, i) => ({
    name,
    description: `${name} skill`,
    path: `/home/user/.openclaw/workspace/skills/${name}`,
    location: "workspace" as const,
    status: "enabled" as const,
    emoji: ["📊", "🤝", "📧", "🔍", "💰", "📰", "📈", "🪞", "♈", "🧠", "✍️"][i],
    scripts: [`${name}.sh`],
  })),
  // Extension skills
  { name: "oura", description: "Oura Ring health data", path: "/home/user/.openclaw/extensions/ouraclaw/skills/oura", location: "extension" as const, status: "enabled" as const, emoji: "💍", scripts: [] },
  // Global skills
  ...["1password", "apple-notes", "coding-agent", "discord", "gh-issues", "github", "healthcheck", "openhue", "skill-creator", "things-mac", "tmux", "video-frames", "weather"].map((name) => ({
    name,
    description: `${name} skill`,
    path: `/opt/homebrew/lib/node_modules/openclaw/skills/${name}`,
    location: "global" as const,
    status: "enabled" as const,
    scripts: [],
  })),
];

// ── /api/memory-activity ────────────────────────────────────────────────────
export const memoryActivity = {
  timeline: Array.from({ length: 7 }, (_, i) => ({
    day: isoDate(daysAgo(6 - i)),
    edits: [2, 0, 3, 1, 4, 2, 5][i],
  })),
  recentTopics: ["docs", "notes", "review", "archive"],
  recentFiles: [
    { name: isoDate(NOW), mtimeMs: hoursAgo(1) },
    { name: "docs", mtimeMs: hoursAgo(6) },
    { name: isoDate(daysAgo(1)), mtimeMs: daysAgo(1) },
    { name: "notes", mtimeMs: daysAgo(2) },
  ],
};

// ── /api/memory-summary ─────────────────────────────────────────────────────
export const memorySummary = {
  totalFiles: 36,
  recentFiles: [
    { name: isoDate(NOW), lastModified: hoursAgo(1) },
    { name: "training-log", lastModified: hoursAgo(6) },
  ],
};

// ── /api/scheduled-tasks ────────────────────────────────────────────────────
export const scheduledTasks = [
  { id: "job-001", name: "Email Inbox Processor (hourly)", type: "cron", schedule: "0 * * * *", enabled: true, nextRunAtMs: NOW + 10 * 60_000, lastRunAtMs: hoursAgo(0.5), agent: "main", model: "anthropic/claude-haiku-4-5", status: "ok" },
  { id: "job-002", name: "Meeting Notes Extractor", type: "cron", schedule: "*/30 * * * *", enabled: true, nextRunAtMs: NOW + 25 * 60_000, lastRunAtMs: hoursAgo(0.3), agent: "main", model: "anthropic/claude-haiku-4-5", status: "ok" },
  { id: "job-003", name: "Social Media Monitor", type: "cron", schedule: "0 */2 * * *", enabled: true, nextRunAtMs: NOW + 55 * 60_000, lastRunAtMs: hoursAgo(1.5), agent: "main", model: "anthropic/claude-haiku-4-5", status: "ok" },
  { id: "job-004", name: "Daily Health Summary", type: "cron", schedule: "0 21 * * *", enabled: true, nextRunAtMs: NOW + 6 * HOUR + 55 * 60_000, lastRunAtMs: daysAgo(1), agent: "main", model: "anthropic/claude-haiku-4-5", status: "ok" },
  { id: "job-005", name: "Daily backup", type: "cron", schedule: "0 3 * * *", enabled: true, nextRunAtMs: NOW + 12 * HOUR, lastRunAtMs: hoursAgo(10), agent: "main", model: "anthropic/claude-haiku-4-5", status: "ok" },
  { id: "job-006", name: "Tomorrow's calendar briefing", type: "cron", schedule: "0 22 * * *", enabled: true, nextRunAtMs: NOW + 8 * HOUR, lastRunAtMs: daysAgo(1), agent: "main", model: "anthropic/claude-haiku-4-5", status: "ok" },
  { id: "job-007", name: "Weekly SEO digest", type: "cron", schedule: "0 9 * * 1", enabled: true, nextRunAtMs: NOW + 4 * DAY, lastRunAtMs: daysAgo(3), agent: "main", model: "anthropic/claude-haiku-4-5", status: "ok" },
  { id: "job-008", name: "CRM stale pipeline check", type: "cron", schedule: "0 10 * * 1,4", enabled: true, nextRunAtMs: NOW + 2 * DAY, lastRunAtMs: daysAgo(2), agent: "main", model: "anthropic/claude-haiku-4-5", status: "ok" },
  { id: "job-009", name: "CRM expiring offers", type: "cron", schedule: "0 10 * * 2,5", enabled: true, nextRunAtMs: NOW + 1 * DAY, lastRunAtMs: daysAgo(1), agent: "main", model: "anthropic/claude-haiku-4-5", status: "ok" },
  { id: "job-010", name: "Nightly updates check", type: "cron", schedule: "0 2 * * *", enabled: true, nextRunAtMs: NOW + 11 * HOUR, lastRunAtMs: hoursAgo(11), agent: "main", model: "anthropic/claude-haiku-4-5", status: "ok" },
  { id: "job-011", name: "Morning briefing", type: "cron", schedule: "30 8 * * *", enabled: true, nextRunAtMs: NOW + 18 * HOUR, lastRunAtMs: hoursAgo(5), agent: "main", model: "anthropic/claude-haiku-4-5", status: "ok" },
  { id: "job-012", name: "Daily reflection", type: "cron", schedule: "0 23 * * *", enabled: true, nextRunAtMs: NOW + 9 * HOUR, lastRunAtMs: daysAgo(1), agent: "main", model: "anthropic/claude-haiku-4-5", status: "ok" },
  { id: "job-013", name: "Analytics weekly digest", type: "cron", schedule: "0 9 * * 1", enabled: true, nextRunAtMs: NOW + 4 * DAY, lastRunAtMs: daysAgo(5), agent: "main", model: "anthropic/claude-haiku-4-5", status: "ok" },
  { id: "job-014", name: "Weekly planning review", type: "cron", schedule: "0 7 * * 1", enabled: true, nextRunAtMs: NOW + 4 * DAY, lastRunAtMs: daysAgo(4), agent: "main", model: "anthropic/claude-haiku-4-5", status: "ok" },
  { id: "job-015", name: "Newsletter draft (Sunday)", type: "cron", schedule: "0 15 * * 0", enabled: true, nextRunAtMs: NOW + 3 * DAY, lastRunAtMs: daysAgo(5), agent: "main", model: "anthropic/claude-opus-4-6", status: "ok" },
  { id: "job-016", name: "Search console report", type: "cron", schedule: "0 9 * * 2", enabled: true, nextRunAtMs: NOW + 5 * DAY, lastRunAtMs: daysAgo(5), agent: "main", model: "anthropic/claude-haiku-4-5", status: "ok" },
  { id: "job-017", name: "Store sales check", type: "cron", schedule: "0 10 * * *", enabled: true, nextRunAtMs: NOW + 20 * HOUR, lastRunAtMs: hoursAgo(4), agent: "main", model: "anthropic/claude-haiku-4-5", status: "ok" },
  { id: "job-018", name: "Heartbeat", type: "cron", schedule: "*/30 * * * *", enabled: true, nextRunAtMs: NOW + 15 * 60_000, lastRunAtMs: hoursAgo(0.2), agent: "main", model: "anthropic/claude-haiku-4-5", status: "ok" },
];

// ── /api/activity ───────────────────────────────────────────────────────────
export const activity = {
  daily: Array.from({ length: 30 }, (_, i) => ({
    date: isoDate(daysAgo(29 - i)),
    user: 30 + Math.round(Math.sin(i * 0.4) * 15) + (i > 25 ? 10 : 0),
    system: 15 + Math.round(Math.cos(i * 0.3) * 8),
  })),
  hourly: [2,1,0,1,0,1,3,8,15,22,28,25,20,24,26,22,18,14,10,8,6,5,4,3],
  channels: [
    { name: "telegram", label: "Telegram", count: 320 },
    { name: "discord", label: "Discord", count: 187 },
    { name: "whatsapp", label: "WhatsApp", count: 80 },
  ],
  cron: { success: 14, fail: 1, total: 15 },
  totalEvents: 842,
  logDays: 30,
  logSource: "demo",
  errors: [],
};

// ── /api/counts ─────────────────────────────────────────────────────────────
export const counts = {
  agents: 2,
  channels: 3,
  credentials: 12,
  crons: 8,
  memory: 15,
  models: 4,
  nodes: 3,
  sessions: 24,
  skills: 25,
  workspaces: 2,
};
