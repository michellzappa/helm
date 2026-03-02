import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ActivityData } from "@/pages/api/activity";
import { CardSkeleton } from "./shared";

interface ChannelDistributionProps {
  data: ActivityData | null;
  onCronFailClick?: () => void;
}

export function ChannelDistribution({ data, onCronFailClick }: ChannelDistributionProps) {
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
            <span className="tabular-nums" style={{ color: "var(--theme-accent)" }}>
              ✓ {cron.success} ok
            </span>
            {cron.fail > 0 && onCronFailClick ? (
              <button
                type="button"
                onClick={onCronFailClick}
                title="Show cron errors in log"
                className="tabular-nums font-medium underline underline-offset-2 decoration-dotted transition-opacity hover:opacity-70"
                style={{ color: "var(--theme-accent)" }}
              >
                ✗ {cron.fail} failed
              </button>
            ) : (
              <span className={`tabular-nums ${cron.fail > 0 ? "" : "text-muted-foreground"}`}
                style={cron.fail > 0 ? { color: "var(--theme-accent)" } : undefined}>
                ✗ {cron.fail} failed
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
