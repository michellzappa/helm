import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";
import { useCachedRefresh } from "@/lib/cache-refresh";
import { WidgetIcon } from "./shared";
import type { ActivityData } from "@/pages/api/activity";

export function ActivityCard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { data } = useCachedRefresh<ActivityData>({
    cacheKey: "activity",
    fetcher: async () => {
      const r = await fetch("/api/activity");
      const d = await r.json();
      return d.error ? null : d;
    },
  });
  const activity = mounted ? data : null;
  const daily = activity?.daily || [];
  const maxVal = Math.max(...daily.map(d => d.user + d.system), 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-sm font-medium">Activity</CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">Last 30 days</p>
          </div>
          <WidgetIcon icon={Activity} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-px h-16">
          {daily.map((day: { date: string; user: number; system: number }) => {
            const total = day.user + day.system;
            const heightPct = total > 0 ? Math.max((total / maxVal) * 100, 4) : 0;
            return (
              <div
                key={day.date}
                className="flex-1 flex flex-col rounded-sm overflow-hidden"
                style={{ height: total === 0 ? "3px" : `${heightPct}%` }}
              >
                {total > 0 && (
                  <>
                    <div style={{ height: `${(day.user / total) * 100}%`, backgroundColor: "var(--theme-accent)", opacity: 0.85, minHeight: day.user > 0 ? 1 : 0 }} />
                    <div style={{ height: `${(day.system / total) * 100}%`, backgroundColor: "var(--theme-accent)", opacity: 0.2, minHeight: day.system > 0 ? 1 : 0 }} />
                  </>
                )}
                {total === 0 && <div style={{ backgroundColor: "var(--theme-accent)", opacity: 0.08, height: "100%" }} />}
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-1.5 text-[9px] text-muted-foreground/50">
          {daily.length > 0 && [0, Math.floor(daily.length / 2), daily.length - 1].map(i => (
            <span key={i}>{new Date(daily[i]?.date + "T12:00:00").toLocaleDateString("en", { month: "short", day: "numeric" })}</span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
