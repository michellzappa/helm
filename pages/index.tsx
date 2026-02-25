import { useState } from "react";
import Layout from "@/components/Layout";
import { ActivityCharts } from "@/components/ActivityCharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Bot, Calendar, History, Server, Zap, FolderOpen, Cpu, Radio, KeyRound, Send } from "lucide-react";
import Link from "next/link";
import { useCounts } from "@/lib/counts-context";
import { useAutoRefresh } from "@/lib/settings-context";
import type { SystemMetrics } from "./api/system";

// ── System metrics mini-card ──────────────────────────────────────────────

function fmtBytes(bytes: number): string {
  if (bytes >= 1e9) return (bytes / 1e9).toFixed(1) + " GB";
  if (bytes >= 1e6) return (bytes / 1e6).toFixed(0) + " MB";
  return (bytes / 1e3).toFixed(0) + " KB";
}

function MetricBar({ label, pct, value }: { label: string; pct: number; value: string }) {
  const clamped = Math.min(100, Math.max(0, pct));
  const color = clamped > 85 ? "var(--theme-accent)" : "var(--theme-accent)";
  const opacity = clamped > 85 ? 1 : 0.7;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px]">
        <span className="text-muted-foreground font-medium">{label}</span>
        <span className="tabular-nums text-foreground">{value}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${clamped}%`, backgroundColor: color, opacity }}
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
            <MetricBar
              label="CPU"
              pct={metrics.cpu.pct}
              value={`${metrics.cpu.pct.toFixed(1)}%`}
            />
            <MetricBar
              label="RAM"
              pct={metrics.ram.pct}
              value={`${fmtBytes(metrics.ram.usedBytes)} / ${fmtBytes(metrics.ram.totalBytes)}`}
            />
            <MetricBar
              label="Disk"
              pct={metrics.disk.pct}
              value={`${fmtBytes(metrics.disk.usedBytes)} / ${fmtBytes(metrics.disk.totalBytes)}`}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { counts } = useCounts();

  // Same order as sidebar (Dashboard excluded — you're already here)
  const stats = [
    { label: "Agents",      value: counts?.agents,        icon: Bot,     href: "/agents"     },
    { label: "Channels",    value: counts?.channels,      icon: Radio,   href: "/channels"   },
    { label: "Credentials", value: counts?.credentials,   icon: KeyRound,href: "/credentials"},
    { label: "Delivery",    value: counts?.deliveryQueue, icon: Send,    href: "/delivery"   },
    { label: "Memory",      value: counts?.memory,        icon: Brain,   href: "/memory"     },
    { label: "Models",      value: counts?.models,        icon: Cpu,     href: "/models"     },
    { label: "Nodes",       value: counts?.nodes,         icon: Server,  href: "/nodes"      },
    { label: "Scheduled",   value: counts?.scheduled,     icon: Calendar,href: "/scheduled"  },
    { label: "Sessions",    value: counts?.sessions,      icon: History, href: "/sessions"   },
    { label: "Skills",      value: counts?.skills,        icon: Zap,     href: "/skills"     },
    { label: "Workspaces",  value: counts?.workspaces,    icon: FolderOpen,href:"/workspaces" },
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

        {/* System metrics */}
        <SystemCard />

        {/* Activity charts + log */}
        <ActivityCharts />
      </div>
    </Layout>
  );
}
