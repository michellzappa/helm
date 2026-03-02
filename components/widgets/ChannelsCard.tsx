import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Radio } from "lucide-react";
import { useCachedRefresh } from "@/lib/cache-refresh";
import { WidgetIcon } from "./shared";
import type { ActivityData } from "@/pages/api/activity";

export function ChannelsCard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { data } = useCachedRefresh<ActivityData>({
    cacheKey: "activity",
    fetcher: async () => {
      const r = await fetch("/api/activity");
      const d = await r.json();
      return d.error ? null : d;
    },
  });
  const activity = mounted ? data : null;
  const channels = activity?.channels || [];
  const maxCount = Math.max(...channels.map((c: { count: number }) => c.count), 1);
  const cron = activity?.cron || { success: 0, fail: 0 };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-sm font-medium">
              <Link href="/channels" className="hover:underline">Channels</Link>
            </CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">Last 30 days</p>
          </div>
          <WidgetIcon icon={Radio} />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {channels.slice(0, 3).map((ch: { name: string; label: string; count: number }) => (
          <div key={ch.name} className="space-y-0.5">
            <div className="flex justify-between text-[10px]">
              <span className="font-medium">{ch.label}</span>
              <span className="text-muted-foreground tabular-nums">{ch.count}</span>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${(ch.count / maxCount) * 100}%`, backgroundColor: "var(--theme-accent)", opacity: 0.8 }} />
            </div>
          </div>
        ))}
        {channels.length === 0 && <div className="h-8 rounded bg-muted animate-pulse" />}
        <div className="pt-2 border-t border-border flex gap-3 text-[10px]">
          <span className="tabular-nums opacity-80">✓ {cron.success} ok</span>
          <span className="tabular-nums opacity-50">✗ {cron.fail} fail</span>
        </div>
      </CardContent>
    </Card>
  );
}
