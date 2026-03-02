import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ActivityData } from "@/pages/api/activity";
import { CardSkeleton } from "./shared";

export function HourlyChart({ data }: { data: ActivityData | null }) {
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
