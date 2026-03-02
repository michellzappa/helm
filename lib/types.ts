export interface SidebarCounts {
  agents: number;
  memory: number;
  scheduled: number;
  sessions: number;
  models: number;
  workspaces: number;
  nodes: number;
  skills: number;
  channels: number;
  credentials: number;
  deliveryQueue: number;
}

export interface ChannelGroup {
  id: string;
  requireMention: boolean;
  enabled?: boolean;
}

export interface Channel {
  id: string;
  name: string;
  enabled: boolean;
  dmPolicy: string;
  groupPolicy?: string;
  groups: ChannelGroup[];
  allowFrom: string[];
  streaming?: boolean;
  sessionRouting?: {
    discordThreadLifecycle?: {
      idleHours: number;
      maxAgeHours?: number;
    };
    telegramTopicAware?: boolean;
  };
  extra?: Record<string, unknown>;
}

export interface Credential {
  id: string;
  name: string;
  category: string;
  file: string;
  status: "ok" | "empty" | "missing";
  keys?: number;
  note?: string;
}

export interface QueueItem {
  id: string;
  channel: string;
  to: string;
  enqueuedAt: number;
  lastAttemptAt?: number;
  retryCount: number;
  backoffMs?: number;
  nextRetryAt?: number;
  status?: "pending" | "backoff" | "retrying";
  lastError?: string;
  text?: string;
  hasMedia: boolean;
}
