import { useEffect, useState } from "react";
import Link from "next/link";
import { BrainCircuit, Loader2, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCachedRefresh } from "@/lib/cache-refresh";
import { WidgetIcon } from "./shared";
import { fmtAge } from "@/lib/format";
import type { ModelHealthData } from "@/pages/api/model-health";

export function ModelHealthCard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { data, isRefreshing } = useCachedRefresh<ModelHealthData>({
    cacheKey: "model-health",
    fetcher: async () => {
      const response = await fetch("/api/model-health");
      const payload = await response.json();
      if (!response.ok || payload.error) throw new Error(payload.error || "Failed to fetch model health");
      return payload as ModelHealthData;
    },
  });

  const displayData = mounted ? data : null;
  const providers = (displayData?.providers ?? [])
    .filter((provider) => provider.errors24h > 0 || provider.activeCooldown || !!provider.activeFailover)
    .slice(0, 5);

  return (
    <Card className={isRefreshing ? "opacity-90" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-sm font-medium">
              <Link href="/models" className="hover:underline">
                Model Fallback Health
              </Link>
            </CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {displayData ? `${displayData.parsedEvents} events from ${displayData.scannedLines} log lines` : "Parsing gateway failover log"}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {isRefreshing && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
            <WidgetIcon icon={BrainCircuit} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {!displayData && (
          <div className="space-y-2">
            <div className="h-4 w-40 rounded bg-muted animate-pulse" />
            <div className="h-4 w-48 rounded bg-muted animate-pulse" />
            <div className="h-4 w-36 rounded bg-muted animate-pulse" />
          </div>
        )}

        {displayData && providers.length === 0 && (
          <p className="text-xs sm:text-sm text-muted-foreground">No fallback pressure in the last 24 hours.</p>
        )}

        {displayData && providers.length > 0 && (
          <div className="space-y-2.5">
            {providers.map((provider) => (
              <div key={provider.provider} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs sm:text-sm font-medium truncate">{provider.provider}</p>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded tabular-nums"
                    style={{
                      backgroundColor: "color-mix(in srgb, var(--theme-accent) 10%, transparent)",
                      color: "var(--theme-accent)",
                      opacity: provider.errors24h > 0 ? 1 : 0.5,
                    }}
                    title={`${provider.errors24h} errors in last 24h`}
                  >
                    {provider.errors24h}/24h
                  </span>
                </div>

                {provider.lastErrorReason && (
                  <p className="text-xs sm:text-sm text-muted-foreground truncate" title={provider.lastErrorReason}>
                    {provider.lastErrorReason}
                  </p>
                )}

                <div className="flex items-center flex-wrap gap-1.5">
                  {provider.lastErrorAtMs && (
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      last {fmtAge(provider.lastErrorAtMs)}
                    </span>
                  )}
                  {provider.activeCooldown && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: "color-mix(in srgb, var(--theme-accent) 8%, transparent)",
                        color: "var(--theme-accent)",
                        opacity: 0.7,
                      }}
                    >
                      cooldown active
                    </span>
                  )}
                  {provider.activeFailover && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded inline-flex items-center gap-1"
                      style={{
                        backgroundColor: "color-mix(in srgb, var(--theme-accent) 8%, transparent)",
                        color: "var(--theme-accent)",
                        opacity: 0.9,
                      }}
                      title={`${provider.activeFailover.decision} · ${provider.activeFailover.reason} · ${provider.activeFailover.stage}`}
                    >
                      <ShieldAlert className="h-3 w-3" />
                      failover active
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
