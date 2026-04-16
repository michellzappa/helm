import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KeyRound, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { useModelAuth } from "@/lib/api";
import { WidgetIcon } from "./shared";

function formatRemaining(expiresInMs: number | null): string {
  if (expiresInMs === null) return "";
  if (expiresInMs < 0) return "expired";
  if (expiresInMs < 60_000) return "< 1m";
  if (expiresInMs < 3_600_000) return `${Math.floor(expiresInMs / 60_000)}m`;
  if (expiresInMs < 86_400_000) return `${Math.floor(expiresInMs / 3_600_000)}h`;
  return `${Math.floor(expiresInMs / 86_400_000)}d`;
}

function StatusBadge({ status, expiresInMs }: { status: string; expiresInMs: number | null }) {
  if (status === "ok") {
    return <span className="inline-flex items-center gap-1 text-[10px] text-green-600 dark:text-green-400"><CheckCircle2 className="h-3 w-3" /> OK</span>;
  }
  if (status === "warning") {
    return <span className="inline-flex items-center gap-1 text-[10px] text-orange-500"><AlertTriangle className="h-3 w-3" /> {formatRemaining(expiresInMs)}</span>;
  }
  if (status === "critical" || status === "expired") {
    return <span className="inline-flex items-center gap-1 text-[10px] text-red-600 dark:text-red-400"><AlertTriangle className="h-3 w-3" /> {status}</span>;
  }
  return null;
}

export function OAuthStatusCard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { data } = useModelAuth();
  const auth = mounted ? data : null;

  const accounts = auth?.oauthAccounts ?? [];
  const critical = accounts.filter((a) => a.status === "critical" || a.status === "expired");
  const warning = accounts.filter((a) => a.status === "warning");
  const ok = accounts.filter((a) => a.status === "ok");

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-sm font-medium">OAuth Tokens</CardTitle>
            {auth && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {critical.length > 0
                  ? `${critical.length} expired/critical — immediate attention needed`
                  : warning.length > 0
                    ? `${warning.length} expiring soon`
                    : accounts.length > 0
                      ? `${ok.length} token(s) healthy`
                      : "No OAuth tokens configured"}
              </p>
            )}
          </div>
          <WidgetIcon icon={KeyRound} />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {!auth && (
          <div className="space-y-2">
            <div className="h-4 w-40 rounded bg-muted animate-pulse" />
            <div className="h-4 w-32 rounded bg-muted animate-pulse" />
          </div>
        )}

        {auth && accounts.length === 0 && (
          <p className="text-xs text-muted-foreground">No OAuth tokens configured in openclaw.</p>
        )}

        {auth && accounts.length > 0 && (
          <div className="space-y-1.5">
            {accounts.map((account) => {
              const parts = account.account.split(":");
              const provider = parts[0];
              const label = parts.length > 1 ? parts[1] : provider;

              return (
                <div
                  key={account.account}
                  className={[
                    "flex items-center justify-between gap-2 rounded px-2 py-1.5 text-xs",
                    account.status === "critical" || account.status === "expired"
                      ? "bg-red-500/10 border border-red-500/20"
                      : account.status === "warning"
                        ? "bg-orange-500/10 border border-orange-500/20"
                        : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium truncate">{label}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">{provider}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {account.expiresInMs !== null && account.status === "ok" && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Clock className="h-3 w-3" />
                        {formatRemaining(account.expiresInMs)}
                      </span>
                    )}
                    <StatusBadge status={account.status} expiresInMs={account.expiresInMs} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}