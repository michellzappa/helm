// API response types - centralized type definitions
// These mirror the types returned by API endpoints

export interface SystemMetrics {
  cpu: {
    pct: number;
    loadAvg: number[];
  };
  ram: {
    pct: number;
    usedBytes: number;
    totalBytes: number;
  };
  disk: {
    pct: number;
    usedBytes: number;
    totalBytes: number;
  };
  uptimeSeconds: number;
  hostname: string;
}

export interface WeatherData {
  location: string;
  desc: string;
  code: number;
  tempC: number;
  feelsLikeC: number;
  humidity: number;
  windKmph: number;
  forecast: Array<{
    date: string;
    code: number;
    maxC: number;
    minC: number;
  }>;
}

export interface TailscaleData {
  self: {
    ip: string;
  };
  peers: Array<{
    name: string;
    ip: string;
    active: boolean;
    online: boolean;
  }>;
  online: number;
}

export interface GatewayHealthData {
  endpoints: string[];
  probes: Array<{
    endpoint: string;
    ok: boolean;
    statusCode?: number;
    latencyMs?: number;
  }>;
  summary: {
    total: number;
    healthy: number;
    available: boolean;
  };
  configPath: {
    source: string;
    path: string;
    helpText?: string;
  };
  note?: string;
}

export interface OcAgent {
  id: string;
  name: string;
  workspace: string;
  agentDir: string;
  model: string;
  isDefault: boolean;
  sessionCount: number;
  skillCount?: number;
}

export interface AgentsSummary {
  defaultAgent: string;
  recentErrors: number;
}

export interface ScheduledTask {
  id: string;
  name: string;
  type: "cron" | "launchagent";
  schedule: string;
  enabled: boolean;
  nextRunAtMs?: number;
  model?: string;
}

export interface CostHistoryData {
  daily: Array<{
    date: string;
    cost: number;
  }>;
  summary: {
    today: number;
  };
}

export interface CredentialsSummary {
  total: number;
  valid: number;
  expired: number;
  expiringSoon: number;
}

export interface MemoryActivityData {
  timeline: Array<{
    day: string;
    edits: number;
  }>;
  recentTopics: string[];
}

export interface ActivityData {
  daily: Array<{
    date: string;
    user: number;
    system: number;
  }>;
  hourly: number[];
  channels: Array<{
    name: string;
    label: string;
    count: number;
  }>;
  cron: {
    success: number;
    fail: number;
  };
}

export interface MessagesSummary {
  queued: number;
  stuck: number;
}

export interface ModelUsage {
  modelId: string;
  jobs: Array<{
    id: string;
    status: string;
  }>;
}

export interface PairedNode {
  deviceId: string;
  name: string;
  lastUsedAtMs: number;
}

export interface Session {
  id: string;
  updatedAt: number;
}

export interface SessionsData {
  sessions: Session[];
}

export interface WorkspaceSize {
  name: string;
  sizeBytes: number;
}

export interface Skill {
  location: "workspace" | "extension" | "global";
}

export interface HeartbeatData {
  ts: number;
  status: string;
  reason?: string;
  durationMs: number;
}

// Generic API response wrapper
export interface ApiResponse<T> {
  data?: T;
  error?: string;
}
