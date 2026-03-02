import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderOpen } from "lucide-react";
import { useCachedRefresh } from "@/lib/cache-refresh";
import { WidgetIcon, fmtSize } from "./shared";
import type { WorkspaceSize } from "@/pages/api/workspace-sizes";

export function WorkspacesOverviewCard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { data } = useCachedRefresh<WorkspaceSize[]>({
    cacheKey: "workspace-sizes",
    fetcher: async () => {
      const r = await fetch("/api/workspace-sizes");
      const d = await r.json();
      return Array.isArray(d) ? d : [];
    },
  });
  const sizes = mounted ? (data || []) : [];

  const top = sizes.slice(0, 4);
  const max = Math.max(...top.map((s) => s.sizeBytes), 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-sm font-medium">
              <Link href="/workspaces" className="hover:underline">
                Workspaces
              </Link>
            </CardTitle>
          </div>
          <WidgetIcon icon={FolderOpen} />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {top.map((ws) => (
          <div key={ws.name} className="space-y-0.5">
            <div className="flex justify-between text-[10px]">
              <span className="text-muted-foreground truncate">{ws.name}</span>
              <span className="tabular-nums">{fmtSize(ws.sizeBytes)}</span>
            </div>
            <div className="h-2 rounded bg-muted overflow-hidden">
              <div className="h-full" style={{ width: `${(ws.sizeBytes / max) * 100}%`, backgroundColor: "var(--theme-accent)" }} />
            </div>
          </div>
        ))}
        {top.length === 0 && <div className="h-10 rounded bg-muted animate-pulse" />}
      </CardContent>
    </Card>
  );
}
