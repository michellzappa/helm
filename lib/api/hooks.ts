// API hooks using existing useCachedRefresh
// Wraps the apiFetchers with the project's caching mechanism

import { useCachedRefresh } from "@/lib/cache-refresh";
import { apiFetchers } from "./client";

// Hook factory for creating cached refresh hooks
function createHook<T>(cacheKey: string, fetcher: () => Promise<T | null>) {
  return function useData() {
    return useCachedRefresh<T>({
      cacheKey,
      fetcher,
    });
  };
}

// Pre-configured hooks for all API endpoints
export const useSystem = createHook("system", apiFetchers.system);
export const useWeather = createHook("weather", apiFetchers.weather);
export const useTailscale = createHook("tailscale", apiFetchers.tailscale);
export const useGatewayHealth = createHook("gateway-health", apiFetchers.gatewayHealth);
export const useAgents = createHook("agents", apiFetchers.agents);
export const useAgentsSummary = createHook("agents-summary", apiFetchers.agentsSummary);
export const useScheduledTasks = createHook("scheduled-tasks", apiFetchers.scheduledTasks);
export const useCostHistory = createHook("cost-history", apiFetchers.costHistory);
export const useCredentialsSummary = createHook("credentials-summary", apiFetchers.credentialsSummary);
export const useMemoryActivity = createHook("memory-activity", apiFetchers.memoryActivity);
export const useActivity = createHook("activity", apiFetchers.activity);
export const useMessagesSummary = createHook("messages-summary", apiFetchers.messagesSummary);
export const useModelUsage = createHook("model-usage", apiFetchers.modelUsage);
export const useNodes = createHook("nodes", apiFetchers.nodes);
export const useSessions = createHook("sessions", apiFetchers.sessions);
export const useWorkspaceSizes = createHook("workspace-sizes", apiFetchers.workspaceSizes);
export const useSkills = createHook("skills", apiFetchers.skills);
export const useHeartbeats = createHook("heartbeats", apiFetchers.heartbeats);
