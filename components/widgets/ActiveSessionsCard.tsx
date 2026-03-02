import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { History } from "lucide-react";
import { useCachedRefresh } from "@/lib/cache-refresh";
import { WidgetIcon } from "./shared";
import type { SessionsData } from "@/pages/api/sessions";
import type { CostHistoryData } from "@/pages/api/cost-history";

export function ActiveSessionsCard() {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(0);
  useEffect(() => {
    setMounted(true);
    setNow(Date.now());
  }, []);
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
  // Use client-side only timestamp to avoid hydration mismatch
  const active = now > 0 ? sessions.filter((s) => now - s.updatedAt < 30 * 60 * 1000).length : 0;
  const idle = Math.max(0, sessions.length - active);
  const total = Math.max(sessions.length, 1);
  const last7 = (displayCost?.daily ?? []).slice(-7);
  const maxCost = Math.max(...last7.map(d => d.cost), 1);
  const fmtDay = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString("en", { weekday: "short" });

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-sm font-medium">
              <Link href="/sessions" className="hover:underline">
                Active Sessions
              </Link>
            </CardTitle>
          </div>
          <WidgetIcon icon={History} />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-2xl font-bold tabular-nums">{sessions.length}</p>
        <div className="h-2 rounded bg-muted overflow-hidden flex">
          <div className="h-full" style={{ width: `${(active / total) * 100}%`, backgroundColor: "var(--theme-accent)" }} />
          <div className="h-full" style={{ width: `${(idle / total) * 100}%`, backgroundColor: "var(--theme-accent)", opacity: 0.4 }} />
        </div>
        <p className="text-[11px] text-muted-foreground tabular-nums">{active} active · {idle} idle</p>
        <div className="flex items-end gap-1 h-14">
          {last7.map((day, i) => {
            const pct = (day.cost / maxCost) * 100;
            const isToday = i === last7.length - 1;
            return (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full relative" style={{ height: "44px" }}>
                  <div
                    className="absolute bottom-0 w-full rounded-sm"
                    title={`${fmtDay(day.date)}: $${day.cost.toFixed(2)}`}
                    style={{
                      height: `${Math.max(pct, 4)}%`,
                      backgroundColor: "var(--theme-accent)",
                      opacity: isToday ? 1 : 0.5,
                    }}
                  />
                </div>
                <span className="text-[9px] text-muted-foreground/50">{fmtDay(day.date).slice(0, 2)}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
