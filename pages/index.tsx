import { useState, useEffect } from "react";
import Link from "next/link";
import { PageInfo } from "@/components/PageInfo";
import Layout from "@/components/Layout";
import { ActivityCharts } from "@/components/ActivityCharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sun, Cloud, CloudDrizzle, CloudRain, CloudSnow, CloudLightning,
  Droplets, Wind, Network, ArrowUpRight, ArrowDownRight, AlertTriangle, Circle,
} from "lucide-react";
import { useSettings } from "@/lib/settings-context";
import { useCachedRefresh } from "@/lib/cache-refresh";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import type { SystemMetrics } from "./api/system";
import type { WeatherData } from "./api/weather";
import type { TailscaleData } from "./api/tailscale";
import type { OcAgent } from "./api/oc-agents";
import type { AgentsSummary } from "./api/agents-summary";
import type { ChannelsHealthData } from "./api/channels-health";
import type { CostHistoryData } from "./api/cost-history";
import type { CredentialsSummary } from "./api/credentials-summary";
import type { MemoryActivityData } from "./api/memory-activity";
import type { MessagesSummary } from "./api/messages-summary";
import type { ModelUsage } from "./api/model-usage";
import type { PairedNode } from "./api/nodes";
import type { SessionsData } from "./api/sessions";
import type { WorkspaceSize } from "./api/workspace-sizes";

interface ActivitiesResponse {
  total: number;
}

interface ScheduledTask {
  id: string;
  name: string;
  type: "cron" | "launchagent";
  schedule: string;
  enabled: boolean;
  nextRunAtMs?: number;
  model?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function fmtBytes(bytes: number): string {
  if (bytes >= 1e9) return (bytes / 1e9).toFixed(1) + " GB";
  if (bytes >= 1e6) return (bytes / 1e6).toFixed(0) + " MB";
  return (bytes / 1e3).toFixed(0) + " KB";
}

function fmtUptime(secs: number): string {
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// WMO weather code → Lucide icon
function wxIcon(code: number) {
  if (code === 0)   return Sun;
  if (code <= 3)    return Cloud;
  if (code <= 48)   return CloudDrizzle;  // fog
  if (code <= 57)   return CloudDrizzle;  // drizzle
  if (code <= 67)   return CloudRain;     // rain
  if (code <= 77)   return CloudSnow;     // snow
  if (code <= 82)   return CloudRain;     // showers
  if (code <= 86)   return CloudSnow;     // snow showers
  return CloudLightning;                  // thunderstorm
}

function dayLabel(dateStr: string, i: number): string {
  if (i === 0) return "Today";
  // Parse as local noon to avoid timezone-off-by-one
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

function toDisplayTemp(celsius: number, unit: "C" | "F"): number {
  if (unit === "F") return Math.round((celsius * 9) / 5 + 32);
  return Math.round(celsius);
}

// ── Weather card ──────────────────────────────────────────────────────────

function WeatherCard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { settings } = useSettings();
  const unit = settings.temperatureUnit;
  const { data, error } = useCachedRefresh<WeatherData>({
    cacheKey: "weather",
    fetcher: async () => {
      const r = await fetch("/api/weather");
      const d = await r.json();
      return d.error ? null : d;
    },
  });
  const weather = mounted ? data : null;

  const CondIcon = weather ? wxIcon(weather.code) : Cloud;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-sm font-medium truncate">
              {weather?.location ?? "Weather"}
            </CardTitle>
            {weather && (
              <p className="text-[11px] text-muted-foreground mt-0.5">{weather.desc}</p>
            )}
          </div>
          <CondIcon className="h-5 w-5 shrink-0 mt-0.5" style={{ color: "var(--theme-accent)" }} />
        </div>
      </CardHeader>

      <CardContent>
        {/* Error state */}
        {!weather && error && (
          <p className="text-sm text-muted-foreground">Unavailable</p>
        )}

        {/* Skeleton */}
        {!weather && !error && (
          <div className="space-y-3">
            <div className="h-10 w-28 bg-muted rounded animate-pulse" />
            <div className="h-3 w-36 bg-muted rounded animate-pulse" />
            <div className="h-px bg-muted" />
            <div className="grid grid-cols-3 gap-1">
              {[0,1,2].map(i => <div key={i} className="h-14 bg-muted rounded animate-pulse" />)}
            </div>
          </div>
        )}

        {/* Live data */}
        {weather && (
          <div className="space-y-3">
            {/* Temperature row */}
            <div className="flex items-end gap-2.5">
              <span className="text-4xl font-bold tabular-nums leading-none">
                {toDisplayTemp(weather.tempC, unit)}°
              </span>
              <span className="text-sm text-muted-foreground pb-0.5">
                feels {toDisplayTemp(weather.feelsLikeC, unit)}°
              </span>
            </div>

            {/* Humidity + Wind */}
            <div className="flex gap-4 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Droplets className="h-3 w-3" /> {weather.humidity}%
              </span>
              <span className="flex items-center gap-1">
                <Wind className="h-3 w-3" /> {weather.windKmph} km/h
              </span>
            </div>

            {/* 3-day forecast strip */}
            <div className="pt-2 border-t border-border">
              <div className="grid grid-cols-3">
                {weather.forecast.map((day, i) => {
                  const DayIcon = wxIcon(day.code);
                  return (
                    <div key={day.date} className="flex flex-col items-center gap-1 py-1">
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {dayLabel(day.date, i)}
                      </span>
                      <DayIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-[10px] tabular-nums">
                        {toDisplayTemp(day.maxC, unit)}°
                        <span className="text-muted-foreground">/{toDisplayTemp(day.minC, unit)}°</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── System metrics card ───────────────────────────────────────────────────

function MetricBar({ label, pct, value }: { label: string; pct: number; value: string }) {
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px]">
        <span className="text-muted-foreground font-medium">{label}</span>
        <span className="tabular-nums text-foreground">{value}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${clamped}%`, backgroundColor: "var(--theme-accent)", opacity: clamped > 85 ? 1 : 0.7 }}
        />
      </div>
    </div>
  );
}

function SystemCard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { data } = useCachedRefresh<SystemMetrics>({
    cacheKey: "system",
    fetcher: async () => {
      const r = await fetch("/api/system");
      const d = await r.json();
      return d.error ? null : d;
    },
  });
  const metrics = mounted ? data : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">System</CardTitle>
        {metrics && (
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Load {metrics.cpu.loadAvg.map(l => l.toFixed(2)).join(" · ")}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {!metrics ? (
          <div className="space-y-3">
            {["CPU", "RAM", "Disk"].map(l => (
              <div key={l} className="space-y-1">
                <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                <div className="h-1.5 w-full bg-muted rounded-full animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <MetricBar label="CPU"  pct={metrics.cpu.pct}  value={`${metrics.cpu.pct.toFixed(1)}%`} />
            <MetricBar label="RAM"  pct={metrics.ram.pct}  value={`${fmtBytes(metrics.ram.usedBytes)} / ${fmtBytes(metrics.ram.totalBytes)}`} />
            <MetricBar label="Disk" pct={metrics.disk.pct} value={`${fmtBytes(metrics.disk.usedBytes)} / ${fmtBytes(metrics.disk.totalBytes)}`} />
            <div className="pt-2 border-t border-border space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">Uptime</span>
                <span className="tabular-nums">{fmtUptime(metrics.uptimeSeconds)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">Host</span>
                <span className="truncate ml-4 text-right" title={metrics.hostname}>{metrics.hostname}</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ── Tailscale card ────────────────────────────────────────────────────────

function TailscaleCard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { data, error } = useCachedRefresh<TailscaleData>({
    cacheKey: "tailscale",
    fetcher: async () => {
      const r = await fetch("/api/tailscale");
      const d = await r.json();
      return d.error ? null : d;
    },
  });
  const ts = mounted ? data : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-sm font-medium">
              <Link href="/nodes" className="hover:underline">
                Tailscale
              </Link>
            </CardTitle>
            {ts && (
              <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                {ts.self.ip}
              </p>
            )}
          </div>
          <Network className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
        </div>
      </CardHeader>

      <CardContent>
        {!ts && error && <p className="text-sm text-muted-foreground">Unavailable</p>}

        {!ts && !error && (
          <div className="space-y-2">
            {[0,1,2].map(i => (
              <div key={i} className="h-4 bg-muted rounded animate-pulse" style={{ width: `${70 + i * 10}%` }} />
            ))}
          </div>
        )}

        {ts && (
          <div className="space-y-1.5">
            {ts.peers.slice(0, 4).map(peer => (
              <div key={peer.ip} className="flex items-center gap-2 text-[11px]">
                {/* Status dot */}
                <span
                  className="h-1.5 w-1.5 rounded-full shrink-0"
                  style={{
                    backgroundColor: "var(--theme-accent)",
                    opacity: peer.active ? 1 : peer.online ? 0.6 : 0.3,
                  }}
                />
                <span className="font-medium truncate flex-1">{peer.name}</span>
                <span className="font-mono text-muted-foreground shrink-0">{peer.ip}</span>
              </div>
            ))}
            {ts.peers.length > 4 && (
              <p className="text-[10px] text-muted-foreground">
                +{ts.peers.length - 4} more nodes
              </p>
            )}
            <p className="text-[10px] text-muted-foreground pt-1 border-t border-border">
              {ts.online}/{ts.peers.length} online
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ActivitySummaryCard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { data } = useCachedRefresh<{
    total: number;
    toolCalls: number;
    messages: number;
    cronRuns: number;
  }>({
    cacheKey: "activity-summary",
    fetcher: async () => {
      const since = Date.now() - 24 * 60 * 60 * 1000;
      const [all, tools, msgs, cron] = await Promise.all([
        fetch(`/api/activities?since=${since}&limit=1`).then(r => r.json() as Promise<ActivitiesResponse>),
        fetch(`/api/activities?since=${since}&limit=1&type=tool_call`).then(r => r.json() as Promise<ActivitiesResponse>),
        fetch(`/api/activities?since=${since}&limit=1&type=user_message,assistant_message`).then(r => r.json() as Promise<ActivitiesResponse>),
        fetch(`/api/activities?since=${since}&limit=1&type=cron_run`).then(r => r.json() as Promise<ActivitiesResponse>),
      ]);
      return {
        total: all.total,
        toolCalls: tools.total,
        messages: msgs.total,
        cronRuns: cron.total,
      };
    },
  });
  const summary = mounted ? data : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          <Link href="/activities" className="hover:underline">
            24h Activity
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-3xl font-bold tabular-nums">
          {summary ? summary.total.toLocaleString() : "…"}
        </p>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p><span className="tabular-nums text-foreground">{summary?.toolCalls ?? "…"}</span> tool calls</p>
          <p><span className="tabular-nums text-foreground">{summary?.messages ?? "…"}</span> messages</p>
          <p><span className="tabular-nums text-foreground">{summary?.cronRuns ?? "…"}</span> cron runs</p>
        </div>
      </CardContent>
    </Card>
  );
}

function fmtRelativeNextRun(nextRunMs?: number) {
  if (!nextRunMs) return "—";
  const diffMs = nextRunMs - Date.now();
  if (diffMs <= 0) return "overdue";
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "in <1m";
  if (mins < 60) return `in ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `in ${hours}h ${mins % 60}m`;
  const days = Math.floor(hours / 24);
  return `in ${days}d`;
}

function UpcomingCronsCard() {
  const { data: tasks, isRefreshing } = useCachedRefresh<ScheduledTask[]>({
    cacheKey: "scheduled-tasks",
    fetcher: async () => {
      const r = await fetch("/api/scheduled-tasks");
      const d = await r.json();
      if (!Array.isArray(d)) throw new Error("Invalid response");
      return d;
    },
  });
  const displayTasks = tasks || [];

  const upcoming = displayTasks
    .filter(task => task.type === "cron" && task.enabled && !!task.nextRunAtMs && task.nextRunAtMs > Date.now())
    .sort((a, b) => (a.nextRunAtMs ?? 0) - (b.nextRunAtMs ?? 0));
  
  const showAll = upcoming.length > 4;
  const visible = upcoming.slice(0, 4);

  return (
    <Card className={isRefreshing ? "opacity-80" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            <Link href="/crons" className="hover:underline">
              Upcoming Crons
            </Link>
          </CardTitle>
          {isRefreshing && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {displayTasks.length === 0 && (
          <div className="space-y-2">
            {[0, 1, 2].map(i => (
              <div key={i} className="h-4 bg-muted rounded animate-pulse" style={{ width: `${80 - i * 10}%` }} />
            ))}
          </div>
        )}
        {displayTasks.length > 0 && upcoming.length === 0 && (
          <p className="text-sm text-muted-foreground">No upcoming cron runs.</p>
        )}
        {upcoming.length > 0 && (
          <div className="space-y-2">
            {visible.map(task => (
              <div key={task.id} className="text-xs sm:text-sm space-y-0.5">
                <p className="font-medium truncate" title={task.name}>{task.name}</p>
                <p className="text-muted-foreground truncate">
                  <span className="tabular-nums">{fmtRelativeNextRun(task.nextRunAtMs)}</span>
                  {" · "}
                  <span>{task.model || "default"}</span>
                </p>
              </div>
            ))}
            {showAll && (
              <Link href="/crons" className="text-xs hover:underline" style={{ color: "var(--theme-accent)" }}>
                View all {upcoming.length} crons →
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MiniSparkline({ values }: { values: number[] }) {
  if (!values.length) return <div className="h-8 rounded bg-muted" />;
  const width = 120;
  const height = 28;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  const points = values
    .map((v, i) => {
      const x = (i / Math.max(values.length - 1, 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-8 w-full">
      <polyline
        fill="none"
        stroke="var(--theme-accent)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

function QuickAgentsCard() {
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

  const defaultId = summary?.defaultAgent ?? "main";
  const displayAgents = agents || [];

  return (
    <Card className={isRefreshing ? "opacity-80" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            <Link href="/agents" className="hover:underline">
              Agents
            </Link>
          </CardTitle>
          <div className="flex items-center gap-1.5">
            {isRefreshing && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
            {summary && summary.recentErrors > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-600 tabular-nums">
                {summary.recentErrors} err
              </span>
            )}
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
                "h-3 w-3 rounded-full border",
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

function ChannelsHealthCard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { data } = useCachedRefresh<ChannelsHealthData>({
    cacheKey: "channels-health",
    fetcher: async () => {
      const r = await fetch("/api/channels-health");
      const d = await r.json();
      return d.error ? null : d;
    },
  });
  const displayData = mounted ? data : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            <Link href="/channels" className="hover:underline">
              Channels Health
            </Link>
          </CardTitle>
          <span className="text-xs tabular-nums">{displayData ? `${displayData.overallPct}%` : "…"}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="h-2 rounded-md overflow-hidden flex bg-muted">
          {(displayData?.channels ?? []).map((channel) => (
            <div
              key={channel.id}
              title={`${channel.name}: ${channel.healthPct}%`}
              className="h-full"
              style={{ width: `${100 / Math.max((displayData?.channels.length ?? 1), 1)}%`, backgroundColor: "var(--theme-accent)", opacity: Math.max(0.4, channel.healthPct / 100) }}
            />
          ))}
          {!displayData && <div className="h-full w-full animate-pulse bg-muted" />}
        </div>
        <p className="text-[11px] text-muted-foreground">
          {(displayData?.channels.length ?? 0)} channels monitored
        </p>
      </CardContent>
    </Card>
  );
}

function TodaySpendCard() {
  const { settings } = useSettings();
  const { data, isRefreshing } = useCachedRefresh<CostHistoryData>({
    cacheKey: "cost-history",
    fetcher: async () => {
      const r = await fetch("/api/cost-history");
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      return d;
    },
  });
  const displayData = data;

  const daily = displayData?.daily ?? [];
  const points = daily.slice(-14).map((d) => d.cost);
  const today = displayData?.summary.today ?? 0;
  const yesterday = daily.length > 1 ? daily[daily.length - 2].cost : 0;
  const delta = today - yesterday;
  const symbol = settings.currency === "EUR" ? "€" : "$";

  return (
    <Card className={isRefreshing ? "opacity-80" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            <Link href="/costs" className="hover:underline">
              Today Spend
            </Link>
          </CardTitle>
          {isRefreshing && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="flex items-end justify-between">
          <p className="text-3xl leading-none font-bold tabular-nums">{symbol}{today.toFixed(2)}</p>
          <span className={cn("text-xs inline-flex items-center gap-0.5 tabular-nums", delta >= 0 ? "text-red-500" : "text-green-600")}>
            {delta >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {symbol}{Math.abs(delta).toFixed(2)}
          </span>
        </div>
        <MiniSparkline values={points} />
      </CardContent>
    </Card>
  );
}

function CredentialsStatusCard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { data } = useCachedRefresh<CredentialsSummary>({
    cacheKey: "credentials-summary",
    fetcher: async () => {
      const r = await fetch("/api/credentials-summary");
      const d = await r.json();
      return d.error ? null : d;
    },
  });
  const displayData = mounted ? data : null;

  const total = Math.max(displayData?.total ?? 0, 1);
  const valid = displayData?.valid ?? 0;
  const expired = displayData?.expired ?? 0;
  const expiring = displayData?.expiringSoon ?? 0;
  const validPct = Math.round((valid / total) * 100);
  const expiredPct = Math.round((expired / total) * 100);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          <Link href="/credentials" className="hover:underline">
            Credentials
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-3">
          <div
            className="h-14 w-14 rounded-full"
            style={{
              background: `conic-gradient(var(--theme-accent) 0 ${validPct}%, var(--theme-accent) ${validPct}% ${validPct + expiredPct}%, var(--theme-accent) ${validPct + expiredPct}% 100%)`,
            }}
          >
            <div className="h-full w-full scale-[0.62] rounded-full bg-card flex items-center justify-center">
              <span className="text-xs font-bold tabular-nums">{validPct}%</span>
            </div>
          </div>
          <div className="text-xs space-y-0.5">
            <p className="tabular-nums"><span className="text-foreground font-medium">{valid}</span> valid</p>
            <p className="tabular-nums"><span className="text-foreground font-medium">{expired}</span> expired</p>
            <p className="tabular-nums"><span className="text-foreground font-medium">{expiring}</span> soon</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MemoryActivityCard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { data } = useCachedRefresh<MemoryActivityData>({
    cacheKey: "memory-activity",
    fetcher: async () => {
      const r = await fetch("/api/memory-activity");
      const d = await r.json();
      return d.error ? null : d;
    },
  });
  const displayData = mounted ? data : null;

  const maxEdits = Math.max(...(displayData?.timeline.map((p) => p.edits) ?? [1]), 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          <Link href="/memory" className="hover:underline">
            Memory Activity
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="h-2 flex items-end gap-0.5 rounded overflow-hidden bg-muted">
          {(displayData?.timeline ?? []).map((point) => (
            <div
              key={point.day}
              title={`${point.day}: ${point.edits}`}
              className="flex-1 h-full"
              style={{ backgroundColor: "var(--theme-accent)", opacity: Math.max(0.3, point.edits / maxEdits) }}
            />
          ))}
          {!displayData && <div className="h-full w-full animate-pulse bg-muted" />}
        </div>
        <div className="flex flex-wrap gap-1">
          {(displayData?.recentTopics ?? []).slice(0, 5).map((topic) => (
            <span key={topic} className="text-[10px] px-1.5 py-0.5 rounded bg-muted max-w-[8rem] truncate">{topic}</span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function MessageQueueCard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { data } = useCachedRefresh<MessagesSummary>({
    cacheKey: "messages-summary",
    fetcher: async () => {
      const r = await fetch("/api/messages-summary");
      const d = await r.json();
      return d.error ? null : d;
    },
  });
  const displayData = mounted ? data : null;

  const queued = displayData?.queued ?? 0;
  const stuck = displayData?.stuck ?? 0;
  const pct = Math.min(100, (queued / 25) * 100);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            <Link href="/messages" className="hover:underline">
              Message Queue
            </Link>
          </CardTitle>
          {stuck > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 inline-flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> {stuck}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="h-2 rounded bg-muted overflow-hidden">
          <div className="h-full transition-all" style={{ width: `${pct}%`, backgroundColor: "var(--theme-accent)", opacity: queued > 15 ? 0.6 : 1 }} />
        </div>
        <p className="text-xs text-muted-foreground tabular-nums">{queued} queued</p>
      </CardContent>
    </Card>
  );
}

function ActiveModelsCard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { data } = useCachedRefresh<ModelUsage[]>({
    cacheKey: "model-usage",
    fetcher: async () => {
      const r = await fetch("/api/model-usage");
      const d = await r.json();
      return Array.isArray(d) ? d : [];
    },
  });
  const models = mounted ? (data || []) : [];

  const top = models
    .map((model) => ({ id: model.modelId, count: model.jobs.length }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const max = Math.max(...top.map((m) => m.count), 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          <Link href="/models" className="hover:underline">
            Active Models
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {top.map((model) => (
          <div key={model.id} className="space-y-0.5">
            <div className="text-[10px] text-muted-foreground truncate">{model.id}</div>
            <div className="h-2 rounded bg-muted overflow-hidden">
              <div className="h-full" style={{ width: `${(model.count / max) * 100}%`, backgroundColor: "var(--theme-accent)" }} />
            </div>
          </div>
        ))}
        {top.length === 0 && <div className="h-10 rounded bg-muted animate-pulse" />}
      </CardContent>
    </Card>
  );
}

function ConnectedNodesCard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { data } = useCachedRefresh<PairedNode[]>({
    cacheKey: "nodes",
    fetcher: async () => {
      const r = await fetch("/api/nodes");
      const d = await r.json();
      return Array.isArray(d) ? d : [];
    },
  });
  const nodes = mounted ? (data || []) : [];

  const now = Date.now();
  const statuses = nodes.map((node) => {
    const age = now - node.lastUsedAtMs;
    if (age < 15 * 60 * 1000) return "active";
    if (age < 6 * 60 * 60 * 1000) return "idle";
    return "offline";
  });
  const active = statuses.filter((s) => s === "active").length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          <Link href="/nodes" className="hover:underline">
            Connected Nodes
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-8 gap-1">
          {statuses.slice(0, 24).map((status, i) => (
            <Circle
              key={i}
              className="h-2.5 w-2.5 fill-current"
              style={{ color: "var(--theme-accent)", opacity: status === "active" ? 1 : status === "idle" ? 0.6 : 0.3 }}
            />
          ))}
          {statuses.length === 0 && <div className="col-span-8 h-4 rounded bg-muted animate-pulse" />}
        </div>
        <p className="text-xs text-muted-foreground tabular-nums">{active}/{nodes.length} active now</p>
      </CardContent>
    </Card>
  );
}

function ActiveSessionsCard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { data } = useCachedRefresh<SessionsData>({
    cacheKey: "sessions",
    fetcher: async () => {
      const r = await fetch("/api/sessions");
      const d = await r.json();
      return "error" in d ? null : d;
    },
  });
  const { data: cost } = useCachedRefresh<CostHistoryData>({
    cacheKey: "cost-history",
    fetcher: async () => {
      const r = await fetch("/api/cost-history");
      const d = await r.json();
      return "error" in d ? null : d;
    },
  });
  const displayData = mounted ? data : null;
  const displayCost = mounted ? cost : null;

  const sessions = displayData?.sessions ?? [];
  const now = Date.now();
  const active = sessions.filter((s) => now - s.updatedAt < 30 * 60 * 1000).length;
  const idle = Math.max(0, sessions.length - active);
  const total = Math.max(sessions.length, 1);
  const points = (displayCost?.daily ?? []).slice(-7).map((d) => d.cost);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          <Link href="/sessions" className="hover:underline">
            Active Sessions
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-2xl font-bold tabular-nums">{sessions.length}</p>
        <div className="h-2 rounded bg-muted overflow-hidden flex">
          <div className="h-full" style={{ width: `${(active / total) * 100}%`, backgroundColor: "var(--theme-accent)" }} />
          <div className="h-full" style={{ width: `${(idle / total) * 100}%`, backgroundColor: "var(--theme-accent)", opacity: 0.4 }} />
        </div>
        <p className="text-[11px] text-muted-foreground tabular-nums">{active} active · {idle} idle</p>
        <MiniSparkline values={points} />
      </CardContent>
    </Card>
  );
}

function SkillsQuickAccessCard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { data } = useCachedRefresh<Array<{ location: "workspace" | "extension" | "global" }>>({
    cacheKey: "skills",
    fetcher: async () => {
      const r = await fetch("/api/skills");
      const d = await r.json();
      return Array.isArray(d) ? d : [];
    },
  });
  const skills = mounted ? (data || []) : [];

  const counts = {
    workspace: skills.filter((s) => s.location === "workspace").length,
    extension: skills.filter((s) => s.location === "extension").length,
    global: skills.filter((s) => s.location === "global").length,
  };
  const total = Math.max(counts.workspace + counts.extension + counts.global, 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          <Link href="/skills" className="hover:underline">
            Skills
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="h-2 rounded bg-muted overflow-hidden flex">
          <div className="h-full" style={{ width: `${(counts.workspace / total) * 100}%`, backgroundColor: "var(--theme-accent)" }} />
          <div className="h-full" style={{ width: `${(counts.extension / total) * 100}%`, backgroundColor: "var(--theme-accent)", opacity: 0.7 }} />
          <div className="h-full" style={{ width: `${(counts.global / total) * 100}%`, backgroundColor: "var(--theme-accent)", opacity: 0.4 }} />
        </div>
        <p className="text-[11px] text-muted-foreground tabular-nums">
          W {counts.workspace} · E {counts.extension} · G {counts.global}
        </p>
      </CardContent>
    </Card>
  );
}

function fmtSize(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(0)} MB`;
  return `${Math.round(bytes / 1e3)} KB`;
}

function WorkspacesOverviewCard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { data } = useCachedRefresh<WorkspaceSize[]>({
    cacheKey: "workspace-sizes",
    fetcher: async () => {
      const r = await fetch("/api/workspace-sizes");
      const d = await r.json();
      return Array.isArray(d) ? d : [];
    },
  });
  const sizes = mounted ? (data || []) : [];

  const top = sizes.slice(0, 4);
  const max = Math.max(...top.map((s) => s.sizeBytes), 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          <Link href="/workspaces" className="hover:underline">
            Workspaces
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {top.map((ws) => (
          <div key={ws.id} className="space-y-0.5">
            <div className="flex justify-between text-[10px]">
              <span className="truncate max-w-[60%]">{ws.id}</span>
              <span className="text-muted-foreground tabular-nums">{fmtSize(ws.sizeBytes)}</span>
            </div>
            <div className="h-1.5 rounded bg-muted overflow-hidden">
              <div className="h-full" style={{ width: `${(ws.sizeBytes / max) * 100}%`, backgroundColor: "var(--theme-accent)" }} />
            </div>
          </div>
        ))}
        {top.length === 0 && <div className="h-12 rounded bg-muted animate-pulse" />}
      </CardContent>
    </Card>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { settings } = useSettings();
  const cards = [
    { key: "quick-agents", visible: true, node: <QuickAgentsCard /> },
    { key: "channels-health", visible: true, node: <ChannelsHealthCard /> },
    { key: "today-spend", visible: true, node: <TodaySpendCard /> },
    { key: "credentials-status", visible: true, node: <CredentialsStatusCard /> },
    { key: "memory-activity", visible: true, node: <MemoryActivityCard /> },
    { key: "message-queue", visible: true, node: <MessageQueueCard /> },
    { key: "active-models", visible: true, node: <ActiveModelsCard /> },
    { key: "connected-nodes", visible: true, node: <ConnectedNodesCard /> },
    { key: "active-sessions", visible: true, node: <ActiveSessionsCard /> },
    { key: "skills-quick-access", visible: true, node: <SkillsQuickAccessCard /> },
    { key: "workspaces-overview", visible: true, node: <WorkspacesOverviewCard /> },
    { key: "weather", visible: settings.dashboardCards.weather, node: <WeatherCard /> },
    { key: "system", visible: settings.dashboardCards.system, node: <SystemCard /> },
    { key: "tailscale", visible: settings.dashboardCards.tailscale, node: <TailscaleCard /> },
    { key: "activity", visible: settings.dashboardCards.activity, node: <ActivitySummaryCard /> },
    { key: "upcoming-crons", visible: true, node: <UpcomingCronsCard /> },
  ].filter(card => card.visible);

  return (
    <Layout>
      <div className="space-y-6">
        <div>
            <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-4xl font-bold">Dashboard</h1>
              <PageInfo page="dashboard" />
            </div>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-xs sm:text-sm text-muted-foreground">Welcome to Helm</p>
          </div>
        </div>

        {/* Dense masonry dashboard cards */}
        {cards.length > 0 ? (
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
            {cards.map(card => (
              <div key={card.key} className="break-inside-avoid mb-4">{card.node}</div>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground">
              No dashboard cards are enabled in Settings.
            </CardContent>
          </Card>
        )}

        {/* Activity charts + log */}
        <ActivityCharts />
      </div>
    </Layout>
  );
}
