import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Loader2 } from "lucide-react";
import { useCachedRefresh } from "@/lib/cache-refresh";
import { WidgetIcon, fmtRelativeNextRun } from "./shared";

interface ScheduledTask {
  id: string;
  name: string;
  type: "cron" | "launchagent";
  schedule: string;
  enabled: boolean;
  nextRunAtMs?: number;
  model?: string;
}

export function UpcomingCronsCard() {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(0);
  useEffect(() => {
    setMounted(true);
    setNow(Date.now());
  }, []);
  const { data: tasks, isRefreshing } = useCachedRefresh<ScheduledTask[]>({
    cacheKey: "scheduled-tasks",
    fetcher: async () => {
      const r = await fetch("/api/scheduled-tasks");
      const d = await r.json();
      if (!Array.isArray(d)) throw new Error("Invalid response");
      return d;
    },
  });
  const displayTasks = mounted ? (tasks || []) : [];

  const upcoming = displayTasks
    .filter(task => task.type === "cron" && task.enabled && !!task.nextRunAtMs && (now === 0 || task.nextRunAtMs > now))
    .sort((a, b) => (a.nextRunAtMs ?? 0) - (b.nextRunAtMs ?? 0));
  
  const showAll = upcoming.length > 4;
  const visible = upcoming.slice(0, 4);

  return (
    <Card className={isRefreshing ? "opacity-80" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-sm font-medium">
              <Link href="/crons" className="hover:underline">
                Upcoming Crons
              </Link>
            </CardTitle>
          </div>
          <div className="flex items-center gap-1.5">
            {isRefreshing && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
            <WidgetIcon icon={Calendar} />
          </div>
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
                  <span className="tabular-nums">{fmtRelativeNextRun(task.nextRunAtMs, now)}</span>
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
