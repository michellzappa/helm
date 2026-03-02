import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, AlertTriangle } from "lucide-react";
import { useCachedRefresh } from "@/lib/cache-refresh";
import { WidgetIcon } from "./shared";
import type { MessagesSummary } from "@/pages/api/messages-summary";

export function MessageQueueCard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { data } = useCachedRefresh<MessagesSummary>({
    cacheKey: "messages-summary",
    fetcher: async () => {
      const r = await fetch("/api/messages-summary");
      const d = await r.json();
      return d.error ? null : d;
    },
  });
  const displayData = mounted ? data : null;

  const queued = displayData?.queued ?? 0;
  const stuck = displayData?.stuck ?? 0;
  const pct = Math.min(100, (queued / 25) * 100);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-sm font-medium">
              <Link href="/messages" className="hover:underline">
                Message Queue
              </Link>
            </CardTitle>
          </div>
          <div className="flex items-center gap-1.5">
            {stuck > 0 && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded inline-flex items-center gap-1"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--theme-accent) 10%, transparent)",
                  color: "var(--theme-accent)",
                  opacity: 0.7,
                }}
              >
                <AlertTriangle className="h-3 w-3" /> {stuck}
              </span>
            )}
            <WidgetIcon icon={Send} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="h-2 rounded bg-muted overflow-hidden">
          <div className="h-full transition-all" style={{ width: `${pct}%`, backgroundColor: "var(--theme-accent)", opacity: queued > 15 ? 0.6 : 1 }} />
        </div>
        <p className="text-xs text-muted-foreground tabular-nums">{queued} queued</p>
      </CardContent>
    </Card>
  );
}
