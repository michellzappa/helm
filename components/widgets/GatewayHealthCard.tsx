import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart } from "lucide-react";
import { useGatewayHealth } from "@/lib/api";
import { WidgetIcon } from "./shared";

export function GatewayHealthCard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { data, error } = useGatewayHealth();
  const gateway = mounted ? data : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-sm font-medium">Gateway Health</CardTitle>
            {gateway && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {gateway.summary.available
                  ? `${gateway.summary.healthy}/${gateway.summary.total} probes healthy`
                  : "Probe status unavailable"}
              </p>
            )}
          </div>
          <WidgetIcon icon={Heart} />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {!gateway && !error && (
          <div className="space-y-2">
            <div className="h-4 w-40 rounded bg-muted animate-pulse" />
            <div className="h-4 w-48 rounded bg-muted animate-pulse" />
            <div className="h-4 w-32 rounded bg-muted animate-pulse" />
          </div>
        )}
        {!gateway && error && (
          <p className="text-xs text-muted-foreground">Gateway health unavailable.</p>
        )}
        {gateway && (
          <>
            <div className="flex flex-wrap gap-1">
              {gateway.endpoints.map((endpoint) => (
                <span key={endpoint} className="text-[10px] px-1.5 py-0.5 rounded bg-muted font-mono">
                  {endpoint}
                </span>
              ))}
            </div>

            {gateway.probes.length > 0 ? (
              <div className="space-y-1">
                {gateway.probes.map((probe) => (
                  <div key={probe.endpoint} className="flex items-center justify-between text-[10px]">
                    <span className="font-mono">{probe.endpoint}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {probe.ok ? probe.statusCode : "error"}
                      {typeof probe.latencyMs === "number" ? ` · ${probe.latencyMs}ms` : ""}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                {gateway.note ?? "No configured gateway base URL. Endpoints listed for reference."}
              </p>
            )}

            <div className="pt-2 border-t border-border space-y-1">
              <div className="flex justify-between gap-2 text-[10px]">
                <span className="text-muted-foreground">Config path</span>
                <span className="text-muted-foreground uppercase">{gateway.configPath.source}</span>
              </div>
              <p className="text-[10px] font-mono break-all">{gateway.configPath.path}</p>
              {gateway.configPath.helpText && (
                <p className="text-[10px] text-muted-foreground">{gateway.configPath.helpText}</p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
