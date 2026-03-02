import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain } from "lucide-react";
import { useCachedRefresh } from "@/lib/cache-refresh";
import { WidgetIcon } from "./shared";
import type { MemoryActivityData } from "@/pages/api/memory-activity";

export function MemoryActivityCard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { data } = useCachedRefresh<MemoryActivityData>({
    cacheKey: "memory-activity",
    fetcher: async () => {
      const r = await fetch("/api/memory-activity");
      const d = await r.json();
      return d.error ? null : d;
    },
  });
  const displayData = mounted ? data : null;

  const maxEdits = Math.max(...(displayData?.timeline.map((p) => p.edits) ?? [1]), 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-sm font-medium">
              <Link href="/memory" className="hover:underline">
                Memory Activity
              </Link>
            </CardTitle>
          </div>
          <WidgetIcon icon={Brain} />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="h-2 flex items-end gap-0.5 rounded overflow-hidden bg-muted">
          {(displayData?.timeline ?? []).map((point) => (
            <div
              key={point.day}
              title={`${point.day}: ${point.edits}`}
              className="flex-1 h-full"
              style={{ backgroundColor: "var(--theme-accent)", opacity: Math.max(0.3, point.edits / maxEdits) }}
            />
          ))}
          {!displayData && <div className="h-full w-full animate-pulse bg-muted" />}
        </div>
        <div className="flex flex-wrap gap-1">
          {(displayData?.recentTopics ?? []).slice(0, 5).map((topic) => (
            <span key={topic} className="text-[10px] px-1.5 py-0.5 rounded bg-muted max-w-[8rem] truncate">{topic}</span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
