// Centralized API path definitions
// Single source of truth for all API endpoints

export const API_PATHS = {
  // System
  system: "/api/system",
  weather: "/api/weather",
  tailscale: "/api/tailscale",
  gatewayHealth: "/api/gateway-health",

  // Agents
  agents: "/api/oc-agents",
  agentsSummary: "/api/agents-summary",

  // Tasks & Scheduling
  scheduledTasks: "/api/scheduled-tasks",

  // Cost & Usage
  costHistory: "/api/cost-history",

  // Credentials
  credentialsSummary: "/api/credentials-summary",

  // Memory
  memoryActivity: "/api/memory-activity",

  // Activity
  activity: "/api/activity",

  // Messages
  messagesSummary: "/api/messages-summary",

  // Models
  modelUsage: "/api/model-usage",

  // Nodes
  nodes: "/api/nodes",

  // Sessions
  sessions: "/api/sessions",

  // Workspaces
  workspaceSizes: "/api/workspace-sizes",

  // Skills
  skills: "/api/skills",

  // Heartbeats
  heartbeats: "/api/heartbeats",

  // Channels
  channels: "/api/channels",
} as const;

// Type for API path keys
export type ApiPathKey = keyof typeof API_PATHS;

// Type for API paths
export type ApiPath = (typeof API_PATHS)[ApiPathKey];
