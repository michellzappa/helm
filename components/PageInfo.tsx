import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/** OC-perspective descriptions for each Helm page */
export const PAGE_INFO: Record<string, string> = {
  dashboard:
    "Overview of your OpenClaw gateway — system health, upcoming crons, weather, and activity at a glance.",
  activities:
    "Timeline of all OpenClaw activity: tool calls, messages sent/received, cron runs, and API interactions. Useful for debugging and understanding agent behavior.",
  agents:
    "Agents are isolated AI personas with their own workspace, model, skills, and channel bindings. Each agent runs independently and can be configured for different tasks.",
  channels:
    "Channels connect agents to messaging platforms — Telegram, WhatsApp, Discord, Signal, etc. Each channel defines DM/group policies, allowlists, and streaming behavior.",
  costs:
    "Token usage and estimated API costs across all sessions. Costs are calculated from Anthropic's published pricing and converted to your preferred currency.",
  credentials:
    "API keys, OAuth tokens, and service credentials that OpenClaw uses to connect to external services. Helm reads these — it doesn't create or modify them.",
  crons:
    "Scheduled jobs that run on a cron schedule. Each job spawns an isolated agent session, runs a task, and optionally delivers results to a channel.",
  memory:
    "Agent memory files — MEMORY.md for long-term context, daily logs in memory/, and workspace files. This is how agents persist knowledge across sessions.",
  messages:
    "Outbound message delivery queue. Shows messages sent by agents to channels, their delivery status, and any failures.",
  models:
    "AI models available to your agents. Includes cloud providers (Anthropic, OpenAI) and local models (Ollama). Configure aliases and per-agent model overrides.",
  nodes:
    "Paired devices running the OpenClaw companion app — Macs, phones, Raspberry Pis. Nodes extend agent capabilities with cameras, screens, location, and local commands.",
  sessions:
    "Active and recent agent sessions with token usage and costs. Each conversation thread, cron run, or API call gets its own session.",
  skills:
    "Reusable instruction sets that teach agents how to use specific tools — Gmail, CRM, GitHub, smart home, etc. Custom skills live in your workspace; built-in ones ship with OpenClaw.",
  workspaces:
    "Workspace directories where agents store their files — SOUL.md, MEMORY.md, skills, scripts, and project files. Each agent can have its own workspace.",
};

interface PageInfoProps {
  page: string;
}

export function PageInfo({ page }: PageInfoProps) {
  const info = PAGE_INFO[page];
  if (!info) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center justify-center h-5 w-5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="About this page"
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="start" className="max-w-xs text-xs leading-relaxed">
          {info}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
