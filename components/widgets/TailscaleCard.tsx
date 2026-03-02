import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Network } from "lucide-react";
import { useCachedRefresh } from "@/lib/cache-refresh";
import type { TailscaleData } from "@/pages/api/tailscale";

export function TailscaleCard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { data, error } = useCachedRefresh<TailscaleData>({
    cacheKey: "tailscale",
    fetcher: async () => {
      const r = await fetch("/api/tailscale");
      const d = await r.json();
      return d.error ? null : d;
    },
  });
  const ts = mounted ? data : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-sm font-medium">
              <Link href="/nodes" className="hover:underline">
                Tailscale
              </Link>
            </CardTitle>
            {ts && (
              <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                {ts.self.ip}
              </p>
            )}
          </div>
          <Network className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
        </div>
      </CardHeader>

      <CardContent>
        {!ts && error && <p className="text-sm text-muted-foreground">Unavailable</p>}

        {!ts && !error && (
          <div className="space-y-2">
            {[0,1,2].map(i => (
              <div key={i} className="h-4 bg-muted rounded animate-pulse" style={{ width: `${70 + i * 10}%` }} />
            ))}
          </div>
        )}

        {ts && (
          <div className="space-y-1.5">
            {ts.peers.slice(0, 4).map(peer => (
              <div key={peer.ip} className="flex items-center gap-2 text-[11px]">
                <span
                  className="h-1.5 w-1.5 rounded-full shrink-0"
                  style={{
                    backgroundColor: "var(--theme-accent)",
                    opacity: peer.active ? 1 : peer.online ? 0.6 : 0.3,
                  }}
                />
                <span className="font-medium truncate flex-1">{peer.name}</span>
                <span className="font-mono text-muted-foreground shrink-0">{peer.ip}</span>
              </div>
            ))}
            {ts.peers.length > 4 && (
              <p className="text-[10px] text-muted-foreground">
                +{ts.peers.length - 4} more nodes
              </p>
            )}
            <p className="text-[10px] text-muted-foreground pt-1 border-t border-border">
              {ts.online}/{ts.peers.length} online
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
