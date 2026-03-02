import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KeyRound } from "lucide-react";
import { useCachedRefresh } from "@/lib/cache-refresh";
import { WidgetIcon } from "./shared";
import type { CredentialsSummary } from "@/pages/api/credentials-summary";

export function CredentialsStatusCard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { data } = useCachedRefresh<CredentialsSummary>({
    cacheKey: "credentials-summary",
    fetcher: async () => {
      const r = await fetch("/api/credentials-summary");
      const d = await r.json();
      return d.error ? null : d;
    },
  });
  const displayData = mounted ? data : null;

  const total = Math.max(displayData?.total ?? 0, 1);
  const valid = displayData?.valid ?? 0;
  const expired = displayData?.expired ?? 0;
  const expiring = displayData?.expiringSoon ?? 0;
  const validPct = Math.round((valid / total) * 100);
  const expiredPct = Math.round((expired / total) * 100);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-sm font-medium">
              <Link href="/credentials" className="hover:underline">
                Credentials
              </Link>
            </CardTitle>
          </div>
          <WidgetIcon icon={KeyRound} />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-3">
          <div
            className="h-14 w-14 rounded-full"
            style={{
              background: `conic-gradient(var(--theme-accent) 0 ${validPct}%, var(--theme-accent) ${validPct}% ${validPct + expiredPct}%, var(--theme-accent) ${validPct + expiredPct}% 100%)`,
            }}
          >
            <div className="h-full w-full scale-[0.62] rounded-full bg-card flex items-center justify-center">
              <span className="text-xs font-bold tabular-nums">{validPct}%</span>
            </div>
          </div>
          <div className="text-xs space-y-0.5">
            <p className="tabular-nums"><span className="text-foreground font-medium">{valid}</span> valid</p>
            <p className="tabular-nums"><span className="text-foreground font-medium">{expired}</span> expired</p>
            <p className="tabular-nums"><span className="text-foreground font-medium">{expiring}</span> soon</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
