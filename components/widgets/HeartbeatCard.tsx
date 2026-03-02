import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart } from "lucide-react";
import { useCachedRefresh } from "@/lib/cache-refresh";
import { WidgetIcon } from "./shared";

interface HeartbeatData {
  ts: number;
  status: string;
  reason?: string;
  durationMs: number;
}

export function HeartbeatCard() {
  const [mounted, setMounted] = useState(false);
  const [ago, setAgo] = useState("…");
  useEffect(() => setMounted(true), []);
  const { data } = useCachedRefresh<HeartbeatData>({
    cacheKey: "heartbeat",
    fetcher: async () => {
      const r = await fetch("/api/heartbeats");
      const d = await r.json();
      return d.error ? null : d;
    },
  });
  const hb = mounted ? data : null;

  // Calculate "ago" only on client to avoid hydration mismatch
  useEffect(() => {
    if (!hb) {
      setAgo("…");
      return;
    }
    const calculateAgo = () => {
      const s = Math.floor((Date.now() - hb.ts) / 1000);
      if (s < 60) return `${s}s ago`;
      const m = Math.floor(s / 60);
      if (m < 60) return `${m}m ago`;
      const h = Math.floor(m / 60);
      return `${h}h ago`;
    };
    setAgo(calculateAgo());
    const interval = setInterval(() => setAgo(calculateAgo()), 60000); // Update every minute
    return () => clearInterval(interval);
  }, [hb]);

  const statusLabel = hb?.status === "ok" ? "OK" : hb?.status === "skipped" ? "Skipped" : hb?.status ?? "…";

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-sm font-medium">
              <Link href="/heartbeats" className="hover:underline">Heartbeat</Link>
            </CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">Last pulse {ago}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{
                backgroundColor: "var(--theme-accent)",
                opacity: hb?.status === "ok" ? 1 : hb?.status === "skipped" ? 0.4 : 0.2,
              }}
            />
            <WidgetIcon icon={Heart} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        <p className="text-lg font-bold">{statusLabel}</p>
        {hb?.reason && (
          <p className="text-[10px] text-muted-foreground truncate">{hb.reason.replace(/-/g, " ")}</p>
        )}
        {hb?.durationMs != null && (
          <p className="text-[10px] text-muted-foreground tabular-nums">{hb.durationMs}ms</p>
        )}
      </CardContent>
    </Card>
  );
}
