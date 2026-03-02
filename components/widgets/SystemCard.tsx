import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Monitor } from "lucide-react";
import { useSystem } from "@/lib/api";
import { WidgetIcon, MetricBar, fmtBytes, fmtUptime } from "./shared";

export function SystemCard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { data } = useSystem();
  const metrics = mounted ? data : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-sm font-medium">System</CardTitle>
            {metrics && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Load {metrics.cpu.loadAvg.map(l => l.toFixed(2)).join(" · ")}
              </p>
            )}
          </div>
          <WidgetIcon icon={Monitor} />
        </div>
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
            <MetricBar label="CPU"  pct={metrics.cpu.pct}  value={`${metrics.cpu.pct.toFixed(1)}%`} />
            <MetricBar label="RAM"  pct={metrics.ram.pct}  value={`${fmtBytes(metrics.ram.usedBytes)} / ${fmtBytes(metrics.ram.totalBytes)}`} />
            <MetricBar label="Disk" pct={metrics.disk.pct} value={`${fmtBytes(metrics.disk.usedBytes)} / ${fmtBytes(metrics.disk.totalBytes)}`} />
            <div className="pt-2 border-t border-border space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">Uptime</span>
                <span className="tabular-nums">{fmtUptime(metrics.uptimeSeconds)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">Host</span>
                <span className="truncate ml-4 text-right" title={metrics.hostname}>{metrics.hostname}</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
