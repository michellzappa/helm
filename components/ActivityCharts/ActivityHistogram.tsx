import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ActivityData, DayBucket } from "@/pages/api/activity";
import { CardSkeleton, fmtDate } from "./shared";

export function ActivityHistogram({ data }: { data: ActivityData | null }) {
  const [tip, setTip] = useState<DayBucket | null>(null);

  if (!data) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Activity</CardTitle>
        </CardHeader>
        <CardContent><CardSkeleton /></CardContent>
      </Card>
    );
  }

  const { daily } = data;
  const maxVal = Math.max(...daily.map(d => d.user + d.system), 1);

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-sm font-medium">Activity</CardTitle>
          <p className="text-[11px] text-muted-foreground mt-0.5">Last 30 days</p>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground shrink-0 pt-0.5">
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-sm"
              style={{ backgroundColor: "var(--theme-accent)", opacity: 0.85 }}
            />
            User
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-sm"
              style={{ backgroundColor: "var(--theme-accent)", opacity: 0.2 }}
            />
            System
          </span>
        </div>
      </CardHeader>

      <CardContent>
        {/* Hover tooltip row */}
        <p className="h-4 mb-2 text-[11px] text-muted-foreground">
          {tip ? (
            <>
              <span className="font-medium text-foreground">{fmtDate(tip.date)}</span>
              {" — "}
              {tip.user > 0 && (
                <span style={{ color: "var(--theme-accent)" }}>
                  {tip.user} message{tip.user !== 1 ? "s" : ""}
                </span>
              )}
              {tip.user > 0 && tip.system > 0 && ", "}
              {tip.system > 0 && (
                <span className="text-muted-foreground">{tip.system} system</span>
              )}
              {tip.user === 0 && tip.system === 0 && (
                <span className="text-muted-foreground">No activity</span>
              )}
            </>
          ) : "\u00A0"}
        </p>

        {/* Bars */}
        <div className="flex items-end gap-px h-16">
          {daily.map(day => {
            const total = day.user + day.system;
            const heightPct = total > 0 ? Math.max((total / maxVal) * 100, 4) : 0;

            return (
              <div
                key={day.date}
                className="flex-1 flex flex-col rounded-sm overflow-hidden cursor-default"
                style={{
                  height: total === 0 ? "3px" : `${heightPct}%`,
                  ...(total === 0 && {
                    backgroundColor: "var(--theme-accent)",
                    opacity: 0.08,
                  }),
                }}
                onMouseEnter={() => setTip(day)}
                onMouseLeave={() => setTip(null)}
              >
                {total > 0 && (
                  <>
                    {/* User segment — top, accent */}
                    <div
                      style={{
                        height: `${(day.user / total) * 100}%`,
                        backgroundColor: "var(--theme-accent)",
                        opacity: 0.85,
                        minHeight: day.user > 0 ? 1 : 0,
                      }}
                    />
                    {/* System segment — bottom, muted */}
                    <div
                      style={{
                        height: `${(day.system / total) * 100}%`,
                        backgroundColor: "var(--theme-accent)",
                        opacity: 0.2,
                        minHeight: day.system > 0 ? 1 : 0,
                      }}
                    />
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Date labels */}
        <div className="flex justify-between mt-1.5 text-[9px] text-muted-foreground/50 select-none">
          {[0, 14, 29].map(i => (
            <span key={i}>{fmtDate(daily[i]?.date ?? "")}</span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
