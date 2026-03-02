import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { useCachedRefresh } from "@/lib/cache-refresh";
import { WidgetIcon } from "./shared";
import type { ActivityData } from "@/pages/api/activity";

export function ActiveHoursCard() {
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
  const hourly = activity?.hourly || new Array(24).fill(0);
  const maxH = Math.max(...hourly, 1);
  const peakHour = hourly.indexOf(Math.max(...hourly));

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-sm font-medium">Active Hours</CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {hourly.some((h: number) => h > 0) ? `Peak at ${peakHour.toString().padStart(2, "0")}:00` : "No data"}
            </p>
          </div>
          <WidgetIcon icon={Clock} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-px h-14">
          {hourly.map((count: number, h: number) => {
            const opacity = count > 0 ? 0.25 + 0.75 * (count / maxH) : 0.07;
            return (
              <div
                key={h}
                title={`${h.toString().padStart(2, "0")}:00 — ${count} events`}
                className="flex-1 rounded-sm"
                style={{
                  height: count > 0 ? `${Math.max((count / maxH) * 100, 4)}%` : "2px",
                  backgroundColor: "var(--theme-accent)",
                  opacity,
                }}
              />
            );
          })}
        </div>
        <div className="flex justify-between mt-1.5 text-[9px] text-muted-foreground/50">
          {["00", "06", "12", "18", "23"].map(h => <span key={h}>{h}</span>)}
        </div>
      </CardContent>
    </Card>
  );
}
