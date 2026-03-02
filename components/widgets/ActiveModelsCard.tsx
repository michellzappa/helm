import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cpu } from "lucide-react";
import { useCachedRefresh } from "@/lib/cache-refresh";
import { WidgetIcon } from "./shared";
import type { ModelUsage } from "@/pages/api/model-usage";

export function ActiveModelsCard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { data } = useCachedRefresh<ModelUsage[]>({
    cacheKey: "model-usage",
    fetcher: async () => {
      const r = await fetch("/api/model-usage");
      const d = await r.json();
      return Array.isArray(d) ? d : [];
    },
  });
  const models = mounted ? (data || []) : [];

  const top = models
    .map((model) => ({ id: model.modelId, count: model.jobs.length }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const max = Math.max(...top.map((m) => m.count), 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-sm font-medium">
              <Link href="/models" className="hover:underline">
                Active Models
              </Link>
            </CardTitle>
          </div>
          <WidgetIcon icon={Cpu} />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {top.map((model) => (
          <div key={model.id} className="space-y-0.5">
            <div className="text-[10px] text-muted-foreground truncate">{model.id}</div>
            <div className="h-2 rounded bg-muted overflow-hidden">
              <div className="h-full" style={{ width: `${(model.count / max) * 100}%`, backgroundColor: "var(--theme-accent)" }} />
            </div>
          </div>
        ))}
        {top.length === 0 && <div className="h-10 rounded bg-muted animate-pulse" />}
      </CardContent>
    </Card>
  );
}
