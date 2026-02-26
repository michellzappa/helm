import { useState } from "react";
import Link from "next/link";
import { PageInfo } from "@/components/PageInfo";
import Layout from "@/components/Layout";
import { ActivityCharts } from "@/components/ActivityCharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sun, Cloud, CloudDrizzle, CloudRain, CloudSnow, CloudLightning,
  Droplets, Wind, Network,
} from "lucide-react";
import { useAutoRefresh, useSettings } from "@/lib/settings-context";
import { cn } from "@/lib/utils";
import type { SystemMetrics } from "./api/system";
import type { WeatherData } from "./api/weather";
import type { TailscaleData } from "./api/tailscale";

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
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [error, setError]     = useState(false);
  const { settings } = useSettings();
  const unit = settings.temperatureUnit;

  useAutoRefresh(() => {
    fetch("/api/weather")
      .then(r => r.json())
      .then(d => { if (d.error) setError(true); else { setWeather(d); setError(false); } })
      .catch(() => setError(true));
  });

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
        {error && (
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
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);

  useAutoRefresh(() => {
    fetch("/api/system")
      .then(r => r.json())
      .then(d => { if (!d.error) setMetrics(d); })
      .catch(() => {});
  });

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
                <span className="truncate ml-4 text-right">{metrics.hostname}</span>
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
  const [ts, setTs]     = useState<TailscaleData | null>(null);
  const [error, setErr] = useState(false);

  useAutoRefresh(() => {
    fetch("/api/tailscale")
      .then(r => r.json())
      .then(d => { if (d.error) setErr(true); else { setTs(d); setErr(false); } })
      .catch(() => setErr(true));
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-sm font-medium">Tailscale</CardTitle>
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
        {error && <p className="text-sm text-muted-foreground">Unavailable</p>}

        {!ts && !error && (
          <div className="space-y-2">
            {[0,1,2].map(i => (
              <div key={i} className="h-4 bg-muted rounded animate-pulse" style={{ width: `${70 + i * 10}%` }} />
            ))}
          </div>
        )}

        {ts && (
          <div className="space-y-1.5">
            {ts.peers.map(peer => (
              <div key={peer.ip} className="flex items-center gap-2 text-[11px]">
                {/* Status dot */}
                <span
                  className="h-1.5 w-1.5 rounded-full shrink-0"
                  style={{
                    backgroundColor: peer.active
                      ? "#22c55e"   // green  — active (recent traffic)
                      : peer.online
                        ? "#f59e0b" // amber  — online, idle
                        : "#6b7280", // gray  — offline
                    opacity: peer.online ? 1 : 0.4,
                  }}
                />
                <span className="font-medium truncate flex-1">{peer.name}</span>
                <span className="font-mono text-muted-foreground shrink-0">{peer.ip}</span>
              </div>
            ))}
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
  const [total, setTotal] = useState<number | null>(null);
  const [toolCalls, setToolCalls] = useState<number | null>(null);
  const [messages, setMessages] = useState<number | null>(null);
  const [cronRuns, setCronRuns] = useState<number | null>(null);

  useAutoRefresh(() => {
    const since = Date.now() - 24 * 60 * 60 * 1000;
    Promise.all([
      fetch(`/api/activities?since=${since}&limit=1`).then(r => r.json() as Promise<ActivitiesResponse>),
      fetch(`/api/activities?since=${since}&limit=1&type=tool_call`).then(r => r.json() as Promise<ActivitiesResponse>),
      fetch(`/api/activities?since=${since}&limit=1&type=user_message,assistant_message`).then(r => r.json() as Promise<ActivitiesResponse>),
      fetch(`/api/activities?since=${since}&limit=1&type=cron_run`).then(r => r.json() as Promise<ActivitiesResponse>),
    ])
      .then(([all, tools, msgs, cron]) => {
        setTotal(all.total);
        setToolCalls(tools.total);
        setMessages(msgs.total);
        setCronRuns(cron.total);
      })
      .catch(() => {});
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">24h Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-3xl font-bold tabular-nums">
          {total ?? "…"}
        </p>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p><span className="tabular-nums text-foreground">{toolCalls ?? "…"}</span> tool calls</p>
          <p><span className="tabular-nums text-foreground">{messages ?? "…"}</span> messages</p>
          <p><span className="tabular-nums text-foreground">{cronRuns ?? "…"}</span> cron runs</p>
        </div>
        <Link href="/activities" className="text-xs hover:underline" style={{ color: "var(--theme-accent)" }}>
          View activity timeline
        </Link>
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
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [error, setError] = useState(false);

  useAutoRefresh(() => {
    fetch("/api/scheduled-tasks")
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) {
          setTasks(d);
          setError(false);
          return;
        }
        setError(true);
      })
      .catch(() => setError(true));
  });

  const upcoming = tasks
    .filter(task => task.type === "cron" && task.enabled && !!task.nextRunAtMs && task.nextRunAtMs > Date.now())
    .sort((a, b) => (a.nextRunAtMs ?? 0) - (b.nextRunAtMs ?? 0))
    .slice(0, 5);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Upcoming Crons</CardTitle>
      </CardHeader>
      <CardContent>
        {error && <p className="text-sm text-muted-foreground">Unavailable</p>}
        {!error && tasks.length === 0 && (
          <div className="space-y-2">
            {[0, 1, 2].map(i => (
              <div key={i} className="h-4 bg-muted rounded animate-pulse" style={{ width: `${80 - i * 10}%` }} />
            ))}
          </div>
        )}
        {!error && tasks.length > 0 && upcoming.length === 0 && (
          <p className="text-sm text-muted-foreground">No upcoming cron runs.</p>
        )}
        {!error && upcoming.length > 0 && (
          <div className="space-y-2">
            {upcoming.map(task => (
              <div key={task.id} className="text-xs sm:text-sm space-y-0.5">
                <p className="font-medium truncate" title={task.name}>{task.name}</p>
                <p className="text-muted-foreground truncate">
                  <span className="tabular-nums">{fmtRelativeNextRun(task.nextRunAtMs)}</span>
                  {" · "}
                  <span>{task.model || "default"}</span>
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { settings } = useSettings();
  const cards = [
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
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Welcome to Helm</p>
        </div>

        {/* Masonry-style dashboard cards */}
        {cards.length > 0 ? (
          <div
            className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4"
          >
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
