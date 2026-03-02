// API module barrel export
// Centralized API layer for the application

export { API_PATHS, type ApiPathKey, type ApiPath } from "./paths";
export * from "./types";
export { createApiFetcher, apiFetchers } from "./client";
export {
  useSystem,
  useWeather,
  useTailscale,
  useGatewayHealth,
  useAgents,
  useAgentsSummary,
  useScheduledTasks,
  useCostHistory,
  useCredentialsSummary,
  useMemoryActivity,
  useActivity,
  useMessagesSummary,
  useModelUsage,
  useNodes,
  useSessions,
  useWorkspaceSizes,
  useSkills,
  useHeartbeats,
} from "./hooks";
