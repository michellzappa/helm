// API client factory
// Creates type-safe API fetchers with consistent error handling

import { API_PATHS, type ApiPathKey } from "./paths";
import type { ApiResponse } from "./types";

// Factory function to create a typed API fetcher
// Handles API responses that either return data directly or { error: string }
export function createApiFetcher<T>(pathKey: ApiPathKey) {
  const path = API_PATHS[pathKey];

  return async (): Promise<T | null> => {
    try {
      const response = await fetch(path);
      const data = await response.json();

      // API returns { error: string } on error, or data directly on success
      if (data.error) {
        console.error(`API error for ${pathKey}:`, data.error);
        return null;
      }

      return data as T;
    } catch (error) {
      console.error(`Fetch error for ${pathKey}:`, error);
      return null;
    }
  };
}

// Pre-configured API fetchers for common endpoints
export const apiFetchers = {
  system: createApiFetcher<SystemMetrics>("system"),
  weather: createApiFetcher<WeatherData>("weather"),
  tailscale: createApiFetcher<TailscaleData>("tailscale"),
  gatewayHealth: createApiFetcher<GatewayHealthData>("gatewayHealth"),
  agents: createApiFetcher<OcAgent[]>("agents"),
  agentsSummary: createApiFetcher<AgentsSummary>("agentsSummary"),
  scheduledTasks: createApiFetcher<ScheduledTask[]>("scheduledTasks"),
  costHistory: createApiFetcher<CostHistoryData>("costHistory"),
  credentialsSummary: createApiFetcher<CredentialsSummary>("credentialsSummary"),
  memoryActivity: createApiFetcher<MemoryActivityData>("memoryActivity"),
  activity: createApiFetcher<ActivityData>("activity"),
  messagesSummary: createApiFetcher<MessagesSummary>("messagesSummary"),
  modelUsage: createApiFetcher<ModelUsage[]>("modelUsage"),
  nodes: createApiFetcher<PairedNode[]>("nodes"),
  sessions: createApiFetcher<SessionsData>("sessions"),
  workspaceSizes: createApiFetcher<WorkspaceSize[]>("workspaceSizes"),
  skills: createApiFetcher<Skill[]>("skills"),
  heartbeats: createApiFetcher<HeartbeatData>("heartbeats"),
} as const;

// Import types for the fetchers
import type {
  SystemMetrics,
  WeatherData,
  TailscaleData,
  GatewayHealthData,
  OcAgent,
  AgentsSummary,
  ScheduledTask,
  CostHistoryData,
  CredentialsSummary,
  MemoryActivityData,
  ActivityData,
  MessagesSummary,
  ModelUsage,
  PairedNode,
  SessionsData,
  WorkspaceSize,
  Skill,
  HeartbeatData,
} from "./types";
