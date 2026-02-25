import { useMemo, useState } from "react";
import Link from "next/link";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAutoRefresh, useSettings, type DateFormat } from "@/lib/settings-context";
import { THEME_COLORS } from "@/lib/theme-colors";
import { fmtAge, fmtDate } from "@/lib/format";
import {
  AlertTriangle,
  Clock,
  MessageSquare,
  Wrench,
} from "lucide-react";

type ActivityType =
  | "tool_call"
  | "user_message"
  | "assistant_message"
  | "cron_run"
  | "compaction"
  | "error";

interface Activity {
  id: string;
  timestamp: number;
  type: ActivityType;
  sessionKey: string;
  cronJobId?: string;
  channel?: "telegram" | "whatsapp" | "discord";
  model?: string;
  toolName?: string;
  summary: string;
  status: "ok" | "error";
}

interface ActivitiesResponse {
  activities: Activity[];
  total: number;
}

const FILTER_TYPES: ActivityType[] = [
  "tool_call",
  "user_message",
  "assistant_message",
  "cron_run",
  "error",
];

const TYPE_LABELS: Record<ActivityType, string> = {
  tool_call: "Tool calls",
  user_message: "User messages",
  assistant_message: "Assistant messages",
  cron_run: "Cron runs",
  compaction: "Compactions",
  error: "Errors",
};

function iconFor(type: ActivityType) {
  if (type === "tool_call") return Wrench;
  if (type === "user_message" || type === "assistant_message") return MessageSquare;
  if (type === "cron_run") return Clock;
  if (type === "error") return AlertTriangle;
  return MessageSquare;
}

function formatRange(sinceMs: number, dateFormat: DateFormat): string {
  const since = new Date(sinceMs);
  const now = new Date();
  const sameDay = since.toDateString() === now.toDateString();
  if (sameDay) return "last 24h";
  return `${fmtDate(since, dateFormat)} - ${fmtDate(now, dateFormat)}`;
}

export default function ActivitiesPage() {
  const [data, setData] = useState<ActivitiesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTypes, setSelectedTypes] = useState<Set<ActivityType>>(
    () => new Set(FILTER_TYPES)
  );
  const { settings } = useSettings();
  const accent =
    THEME_COLORS.find(c => c.id === settings.themeColor)?.accent ?? "var(--theme-accent)";

  const since = useMemo(() => Date.now() - 24 * 60 * 60 * 1000, []);

  const typeQuery = useMemo(() => {
    const entries = [...selectedTypes].filter(type => FILTER_TYPES.includes(type));
    if (entries.length === 0) return "";
    return `&type=${encodeURIComponent(entries.join(","))}`;
  }, [selectedTypes]);

  useAutoRefresh(() => {
    if (selectedTypes.size === 0) {
      setData({ activities: [], total: 0 });
      setLoading(false);
      return;
    }
    fetch(`/api/activities?since=${since}&limit=300${typeQuery}`)
      .then(r => r.json())
      .then((payload: ActivitiesResponse) => {
        setData(payload);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  });

  const toggleType = (type: ActivityType) => {
    setSelectedTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const activities = data?.activities ?? [];

  return (
    <Layout>
      <div className="space-y-6 sm:space-y-8">
        <div>
          <h1 className="text-2xl sm:text-4xl font-bold">Activities</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {loading ? "…" : `${data?.total ?? 0} events`} · {formatRange(since, settings.dateFormat)}
          </p>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Filters</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 flex flex-wrap gap-2">
            {FILTER_TYPES.map(type => {
              const active = selectedTypes.has(type);
              return (
                <Button
                  key={type}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => toggleType(type)}
                  className="text-xs"
                  style={active ? {
                    borderColor: accent,
                    color: accent,
                    backgroundColor: "color-mix(in srgb, var(--theme-accent) 12%, transparent)",
                  } : undefined}
                >
                  {TYPE_LABELS[type]}
                </Button>
              );
            })}
          </CardContent>
        </Card>

        <div className="space-y-3">
          {loading && (
            <Card>
              <CardContent className="py-6 text-sm text-muted-foreground">Loading activities…</CardContent>
            </Card>
          )}

          {!loading && activities.length === 0 && (
            <Card>
              <CardContent className="py-6 text-sm text-muted-foreground">No activities found for this filter.</CardContent>
            </Card>
          )}

          {activities.map(activity => {
            const Icon = iconFor(activity.type);
            return (
              <Card key={activity.id}>
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      <Icon
                        className="h-4 w-4"
                        style={{ color: activity.status === "error" ? "#ef4444" : accent }}
                      />
                    </div>

                    <div className="min-w-0 flex-1 space-y-2">
                      <p className="text-sm leading-relaxed break-words">{activity.summary}</p>
                      <div className="flex flex-wrap gap-2 text-[11px]">
                        {activity.cronJobId && (
                          <span
                            className="px-2 py-0.5 rounded-full tabular-nums"
                            style={{
                              color: accent,
                              backgroundColor: "color-mix(in srgb, var(--theme-accent) 12%, transparent)",
                            }}
                          >
                            cron:{activity.cronJobId}
                          </span>
                        )}
                        {activity.channel && (
                          <span
                            className="px-2 py-0.5 rounded-full"
                            style={{
                              color: accent,
                              backgroundColor: "color-mix(in srgb, var(--theme-accent) 12%, transparent)",
                            }}
                          >
                            {activity.channel}
                          </span>
                        )}
                        {activity.toolName && (
                          <span
                            className="px-2 py-0.5 rounded-full"
                            style={{
                              color: accent,
                              backgroundColor: "color-mix(in srgb, var(--theme-accent) 12%, transparent)",
                            }}
                          >
                            {activity.toolName}
                          </span>
                        )}
                        {activity.model && (
                          <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {activity.model}
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground truncate" title={activity.sessionKey}>
                          {activity.sessionKey}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 text-xs text-muted-foreground tabular-nums">
                      {fmtAge(activity.timestamp)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div>
          <Link href="/sessions" className="text-xs text-muted-foreground hover:underline">
            Open Sessions
          </Link>
        </div>
      </div>
    </Layout>
  );
}
