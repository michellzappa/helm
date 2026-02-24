import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ActivityData, DayBucket } from "@/pages/api/activity";

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("en", {
    month: "short",
    day: "numeric",
  });
}

function CardSkeleton({ height = "h-20" }: { height?: string }) {
  return <div className={`${height} rounded-md bg-muted animate-pulse`} />;
}

// ── Activity Histogram (30 days, stacked user/system) ──────────────────────

function ActivityHistogram({ data }: { data: ActivityData | null }) {
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

// ── Active Hours (24-hour distribution) ────────────────────────────────────

function HourlyChart({ data }: { data: ActivityData | null }) {
  if (!data) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Active hours</CardTitle>
        </CardHeader>
        <CardContent><CardSkeleton height="h-16" /></CardContent>
      </Card>
    );
  }

  const maxH = Math.max(...data.hourly, 1);
  const peakHour = data.hourly.indexOf(Math.max(...data.hourly));
  const peakLabel = `${peakHour.toString().padStart(2, "0")}:00`;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Active hours</CardTitle>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {data.hourly.some(h => h > 0)
            ? `Peak at ${peakLabel}`
            : "No data yet"}
        </p>
      </CardHeader>

      <CardContent>
        <div className="flex items-end gap-px h-14">
          {data.hourly.map((count, h) => {
            const pct = (count / maxH) * 100;
            const opacity = count > 0 ? 0.25 + 0.75 * (count / maxH) : 0.07;
            return (
              <div
                key={h}
                title={`${h.toString().padStart(2, "0")}:00 — ${count} events`}
                className="flex-1 rounded-sm cursor-default"
                style={{
                  height: count > 0 ? `${Math.max(pct, 4)}%` : "2px",
                  backgroundColor: "var(--theme-accent)",
                  opacity,
                }}
              />
            );
          })}
        </div>
        <div className="flex justify-between mt-1.5 text-[9px] text-muted-foreground/50 select-none">
          {["00", "06", "12", "18", "23"].map(h => (
            <span key={h}>{h}</span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Channel Breakdown + Cron health ────────────────────────────────────────

function ChannelBreakdown({ data }: { data: ActivityData | null }) {
  if (!data) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Channels</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <CardSkeleton height="h-4" />
            <CardSkeleton height="h-4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const { channels, cron } = data;
  const maxCount = Math.max(...channels.map(c => c.count), 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Channels</CardTitle>
        <p className="text-[11px] text-muted-foreground mt-0.5">Last 30 days</p>
      </CardHeader>

      <CardContent className="space-y-3">
        {channels.length === 0 ? (
          <p className="text-xs text-muted-foreground">No channel activity logged.</p>
        ) : (
          channels.map(ch => (
            <div key={ch.name} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium">{ch.label}</span>
                <span className="text-muted-foreground tabular-nums">{ch.count}</span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(ch.count / maxCount) * 100}%`,
                    backgroundColor: "var(--theme-accent)",
                    opacity: 0.8,
                    transition: "width 0.4s ease",
                  }}
                />
              </div>
            </div>
          ))
        )}

        {/* Cron health */}
        <div className="pt-2 border-t border-border">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
            Cron runs
          </p>
          <div className="flex gap-4 text-xs">
            <span className="text-green-600 dark:text-green-400 tabular-nums">
              ✓ {cron.success} ok
            </span>
            <span
              className={`tabular-nums ${
                cron.fail > 0 ? "text-red-500" : "text-muted-foreground"
              }`}
            >
              ✗ {cron.fail} failed
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main export ─────────────────────────────────────────────────────────────

export function ActivityCharts() {
  const [data, setData] = useState<ActivityData | null>(null);

  useEffect(() => {
    fetch("/api/activity")
      .then(r => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-4">
      <ActivityHistogram data={data} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <HourlyChart data={data} />
        <ChannelBreakdown data={data} />
      </div>
    </div>
  );
}
