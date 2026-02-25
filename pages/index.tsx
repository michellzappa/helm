import { useState } from "react";
import Layout from "@/components/Layout";
import { ActivityCharts } from "@/components/ActivityCharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Brain, Bot, Calendar, History, Server, Zap, FolderOpen,
  Cpu, Radio, KeyRound, Send,
  Sun, Cloud, CloudDrizzle, CloudRain, CloudSnow, CloudLightning,
  Droplets, Wind,
} from "lucide-react";
import Link from "next/link";
import { useCounts } from "@/lib/counts-context";
import { useAutoRefresh } from "@/lib/settings-context";
import type { SystemMetrics } from "./api/system";
import type { WeatherData } from "./api/weather";

// ── Helpers ───────────────────────────────────────────────────────────────

function fmtBytes(bytes: number): string {
  if (bytes >= 1e9) return (bytes / 1e9).toFixed(1) + " GB";
  if (bytes >= 1e6) return (bytes / 1e6).toFixed(0) + " MB";
  return (bytes / 1e3).toFixed(0) + " KB";
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

// ── Weather card ──────────────────────────────────────────────────────────

function WeatherCard() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [error, setError]     = useState(false);

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
                {weather.tempC}°
              </span>
              <span className="text-sm text-muted-foreground pb-0.5">
                feels {weather.feelsLikeC}°
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
                        {day.maxC}°
                        <span className="text-muted-foreground">/{day.minC}°</span>
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
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { counts } = useCounts();

  const stats = [
    { label: "Agents",      value: counts?.agents,        icon: Bot,      href: "/agents"      },
    { label: "Channels",    value: counts?.channels,      icon: Radio,    href: "/channels"    },
    { label: "Credentials", value: counts?.credentials,   icon: KeyRound, href: "/credentials" },
    { label: "Delivery",    value: counts?.deliveryQueue, icon: Send,     href: "/delivery"    },
    { label: "Memory",      value: counts?.memory,        icon: Brain,    href: "/memory"      },
    { label: "Models",      value: counts?.models,        icon: Cpu,      href: "/models"      },
    { label: "Nodes",       value: counts?.nodes,         icon: Server,   href: "/nodes"       },
    { label: "Scheduled",   value: counts?.scheduled,     icon: Calendar, href: "/scheduled"   },
    { label: "Sessions",    value: counts?.sessions,      icon: History,  href: "/sessions"    },
    { label: "Skills",      value: counts?.skills,        icon: Zap,      href: "/skills"      },
    { label: "Workspaces",  value: counts?.workspaces,    icon: FolderOpen, href: "/workspaces" },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-4xl font-bold">Dashboard</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Welcome to Helm</p>
        </div>

        {/* Count tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Link key={stat.label} href={stat.href} className="block">
                <Card className="cursor-pointer hover:shadow-md active:scale-[0.98] transition-all h-full">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-xs sm:text-sm font-medium">{stat.label}</CardTitle>
                    <Icon className="h-3 sm:h-4 w-3 sm:w-4 text-muted-foreground flex-shrink-0" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl sm:text-2xl font-bold">
                      {counts === null ? "—" : (stat.value ?? 0)}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Weather + System side by side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <WeatherCard />
          <SystemCard />
        </div>

        {/* Activity charts + log */}
        <ActivityCharts />
      </div>
    </Layout>
  );
}
