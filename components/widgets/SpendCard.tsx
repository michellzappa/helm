import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Euro, Loader2, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useSettings } from "@/lib/settings-context";
import { useCachedRefresh } from "@/lib/cache-refresh";
import { WidgetIcon } from "./shared";
import type { CostHistoryData } from "@/pages/api/cost-history";

export function SpendCard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
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
  const displayData = mounted ? data : null;

  const daily = displayData?.daily ?? [];
  const last7 = daily.slice(-7);
  const maxCost = Math.max(...last7.map(d => d.cost), 1);
  const today = displayData?.summary.today ?? 0;
  const yesterday = daily.length > 1 ? daily[daily.length - 2].cost : 0;
  const delta = today - yesterday;
  const symbol = settings.currency === "EUR" ? "€" : "$";
  const fmtDay = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString("en", { weekday: "short" });

  return (
    <Card className={isRefreshing ? "opacity-80" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-sm font-medium">
              <Link href="/spend" className="hover:underline">
                Spend
              </Link>
            </CardTitle>
          </div>
          <div className="flex items-center gap-1.5">
            {isRefreshing && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
            <WidgetIcon icon={Euro} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-end justify-between">
          <p className="text-3xl leading-none font-bold tabular-nums">{symbol}{today.toFixed(2)}</p>
          <span
            className="text-xs inline-flex items-center gap-0.5 tabular-nums"
            style={{ color: "var(--theme-accent)", opacity: delta >= 0 ? 1 : 0.5 }}
          >
            {delta >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {symbol}{Math.abs(delta).toFixed(2)}
          </span>
        </div>
        <div className="flex items-end gap-1 h-14">
          {last7.map((day, i) => {
            const pct = (day.cost / maxCost) * 100;
            const isToday = i === last7.length - 1;
            return (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full relative" style={{ height: "44px" }}>
                  <div
                    className="absolute bottom-0 w-full rounded-sm"
                    title={`${fmtDay(day.date)}: ${symbol}${day.cost.toFixed(2)}`}
                    style={{
                      height: `${Math.max(pct, 4)}%`,
                      backgroundColor: "var(--theme-accent)",
                      opacity: isToday ? 1 : 0.5,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex gap-1">
          {last7.map((day) => (
            <span key={day.date} className="flex-1 text-center text-[9px] text-muted-foreground/50">
              {fmtDay(day.date).slice(0, 2)}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
