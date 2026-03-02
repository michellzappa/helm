import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap } from "lucide-react";
import { useCachedRefresh } from "@/lib/cache-refresh";
import { WidgetIcon } from "./shared";

interface Skill {
  location: "workspace" | "extension" | "global";
}

export function SkillsQuickAccessCard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { data } = useCachedRefresh<Skill[]>({
    cacheKey: "skills",
    fetcher: async () => {
      const r = await fetch("/api/skills");
      const d = await r.json();
      return Array.isArray(d) ? d : [];
    },
  });
  const skills = mounted ? (data || []) : [];

  const counts = {
    workspace: skills.filter((s) => s.location === "workspace").length,
    extension: skills.filter((s) => s.location === "extension").length,
    global: skills.filter((s) => s.location === "global").length,
  };
  const total = Math.max(counts.workspace + counts.extension + counts.global, 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-sm font-medium">
              <Link href="/skills" className="hover:underline">
                Skills
              </Link>
            </CardTitle>
          </div>
          <WidgetIcon icon={Zap} />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="h-2 rounded bg-muted overflow-hidden flex">
          <div className="h-full" style={{ width: `${(counts.workspace / total) * 100}%`, backgroundColor: "var(--theme-accent)" }} />
          <div className="h-full" style={{ width: `${(counts.extension / total) * 100}%`, backgroundColor: "var(--theme-accent)", opacity: 0.7 }} />
          <div className="h-full" style={{ width: `${(counts.global / total) * 100}%`, backgroundColor: "var(--theme-accent)", opacity: 0.4 }} />
        </div>
        <p className="text-[11px] text-muted-foreground tabular-nums">
          W {counts.workspace} · E {counts.extension} · G {counts.global}
        </p>
      </CardContent>
    </Card>
  );
}
