import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, Loader2 } from "lucide-react";
import { useCachedRefresh } from "@/lib/cache-refresh";
import { cn } from "@/lib/utils";
import { WidgetIcon } from "./shared";
import type { OcAgent } from "@/pages/api/oc-agents";
import type { AgentsSummary } from "@/pages/api/agents-summary";

export function QuickAgentsCard() {
  const { data: agents, isRefreshing } = useCachedRefresh<OcAgent[]>({
    cacheKey: "agents-list",
    fetcher: async () => {
      const r = await fetch("/api/oc-agents");
      const d = await r.json();
      return Array.isArray(d) ? d : [];
    },
  });
  const { data: summary } = useCachedRefresh<AgentsSummary>({
    cacheKey: "agents-summary",
    fetcher: async () => {
      const r = await fetch("/api/agents-summary");
      const d = await r.json();
      return "error" in d ? null : d;
    },
  });

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const defaultId = summary?.defaultAgent ?? "main";
  const displayAgents = mounted ? (agents || []) : [];

  return (
    <Card className={isRefreshing ? "opacity-80" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-sm font-medium">
              <Link href="/agents" className="hover:underline">
                Agents
              </Link>
            </CardTitle>
          </div>
          <div className="flex items-center gap-1.5">
            {isRefreshing && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
            {summary && summary.recentErrors > 0 && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded tabular-nums"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--theme-accent) 8%, transparent)",
                  color: "var(--theme-accent)",
                  opacity: 0.5,
                }}
              >
                {summary.recentErrors} err
              </span>
            )}
            <WidgetIcon icon={Bot} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {displayAgents.map((agent) => (
            <span
              key={agent.id}
              title={`${agent.name}${agent.id === defaultId ? " (default)" : ""}`}
              className={cn(
                "h-3 w-3 rounded-full border aspect-square shrink-0",
                agent.id === defaultId ? "ring-2 ring-offset-1 ring-[var(--theme-accent)]" : "opacity-80"
              )}
              style={{ backgroundColor: "var(--theme-accent)", opacity: agent.sessionCount > 0 ? 1 : 0.4, borderColor: "transparent" }}
            />
          ))}
          {displayAgents.length === 0 && <div className="h-3 w-20 rounded bg-muted animate-pulse" />}
        </div>
        <p className="text-[11px] text-muted-foreground tabular-nums">
          {displayAgents.length} agents · default {defaultId}
        </p>
      </CardContent>
    </Card>
  );
}
