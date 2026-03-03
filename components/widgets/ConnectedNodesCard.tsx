import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Server } from "lucide-react";
import { useCachedRefresh } from "@/lib/cache-refresh";
import { WidgetIcon } from "./shared";
import type { PairedNode } from "@/pages/api/nodes";

export function ConnectedNodesCard() {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(0);
  useEffect(() => {
    setMounted(true);
    setNow(Date.now());
  }, []);
  const { data } = useCachedRefresh<PairedNode[]>({
    cacheKey: "nodes",
    fetcher: async () => {
      const r = await fetch("/api/nodes");
      const d = await r.json();
      return Array.isArray(d) ? d : [];
    },
  });
  const nodes = mounted ? (data || []) : [];

  // Calculate statuses only on client to avoid hydration mismatch
  const statuses = now > 0 ? nodes.map((node) => {
    const age = now - node.lastUsedAtMs;
    if (age < 15 * 60 * 1000) return "active";
    if (age < 6 * 60 * 60 * 1000) return "idle";
    return "offline";
  }) : nodes.map(() => "offline");
  const active = statuses.filter((s) => s === "active").length;
  const idle = statuses.filter((s) => s === "idle").length;
  const offline = statuses.filter((s) => s === "offline").length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-sm font-medium">
              <Link href="/nodes" className="hover:underline">
                Nodes
              </Link>
            </CardTitle>
          </div>
          <WidgetIcon icon={Server} />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex gap-1.5">
          {nodes.slice(0, 8).map((node, i) => {
            const status = statuses[i];
            return (
              <div
                key={node.deviceId}
                title={`${node.displayName} (${status})`}
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor: "var(--theme-accent)",
                  opacity: status === "active" ? 1 : status === "idle" ? 0.5 : 0.2,
                }}
              />
            );
          })}
          {nodes.length === 0 && <div className="h-2 w-20 rounded bg-muted animate-pulse" />}
        </div>
        <p className="text-[11px] text-muted-foreground tabular-nums">
          {active} active · {idle} idle · {offline} offline
        </p>
      </CardContent>
    </Card>
  );
}
