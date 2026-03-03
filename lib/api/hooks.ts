// API hooks backed by SWR.
// Keeps a mostly compatible shape with the previous cached-refresh hooks.

import useSWR, { type KeyedMutator } from "swr";
import type { FetcherError } from "@/lib/fetcher";
import { API_PATHS, type ApiPathKey } from "./paths";
import type {
  ActivityData,
  AgentsSummary,
  CostHistoryData,
  CredentialsSummary,
  GatewayHealthData,
  HeartbeatData,
  MemoryActivityData,
  MessagesSummary,
  ModelUsage,
  OcAgent,
  PairedNode,
  ScheduledTask,
  SessionsData,
  Skill,
  SystemMetrics,
  TailscaleData,
  WeatherData,
  WorkspaceSize,
} from "./types";

export interface ApiHookResult<T> {
  data: T | null;
  error: string | null;
  isRefreshing: boolean;
  isLoading: boolean;
  mutate: KeyedMutator<T>;
}

function createHook<T>(pathKey: ApiPathKey) {
  return function useData(): ApiHookResult<T> {
    const { data, error, isValidating, isLoading, mutate } = useSWR<T, FetcherError>(
      API_PATHS[pathKey]
    );

    return {
      data: data ?? null,
      error: error?.message ?? null,
      isRefreshing: isValidating,
      isLoading,
      mutate,
    };
  };
}

export const useSystem = createHook<SystemMetrics>("system");
export const useWeather = createHook<WeatherData>("weather");
export const useTailscale = createHook<TailscaleData>("tailscale");
export const useGatewayHealth = createHook<GatewayHealthData>("gatewayHealth");
export const useAgents = createHook<OcAgent[]>("agents");
export const useAgentsSummary = createHook<AgentsSummary>("agentsSummary");
export const useScheduledTasks = createHook<ScheduledTask[]>("scheduledTasks");
export const useCostHistory = createHook<CostHistoryData>("costHistory");
export const useCredentialsSummary = createHook<CredentialsSummary>("credentialsSummary");
export const useMemoryActivity = createHook<MemoryActivityData>("memoryActivity");
export const useActivity = createHook<ActivityData>("activity");
export const useMessagesSummary = createHook<MessagesSummary>("messagesSummary");
export const useModelUsage = createHook<ModelUsage[]>("modelUsage");
export const useNodes = createHook<PairedNode[]>("nodes");
export const useSessions = createHook<SessionsData>("sessions");
export const useWorkspaceSizes = createHook<WorkspaceSize[]>("workspaceSizes");
export const useSkills = createHook<Skill[]>("skills");
export const useHeartbeats = createHook<HeartbeatData>("heartbeats");
