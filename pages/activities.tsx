import { useMemo, useState } from "react";
import Link from "next/link";
import { PageInfo } from "@/components/PageInfo";
import Layout from "@/components/Layout";
import { TableFilter } from "@/components/TableFilter";
import { SortableTableHead } from "@/components/SortableTableHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { sortData, getNextSortDirection, type SortDirection } from "@/lib/sorting";
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
  const [sortBy, setSortBy] = useState<string | null>("timestamp");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");
  const [filterQuery, setFilterQuery] = useState("");
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

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDir(getNextSortDirection(sortDir));
    } else {
      setSortBy(column);
      setSortDir(column === "timestamp" ? "desc" : "asc");
    }
  };

  const activities = data?.activities ?? [];
  const q = filterQuery.trim().toLowerCase();
  const filteredActivities = activities.filter((activity) => {
    if (!q) return true;
    return [
      activity.type,
      activity.status,
      activity.summary,
      activity.sessionKey,
      activity.cronJobId ?? "",
      activity.channel ?? "",
      activity.model ?? "",
      activity.toolName ?? "",
    ].some((value) => value.toLowerCase().includes(q));
  });
  const sortedActivities = sortData(filteredActivities, sortBy, sortDir);

  return (
    <Layout>
      <div className="space-y-6 sm:space-y-8">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-4xl font-bold">Activities</h1>
            <PageInfo page="activities" />
          </div>
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
          <TableFilter
            placeholder="Filter activities..."
            value={filterQuery}
            onChange={setFilterQuery}
          />

          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <SortableTableHead
                      column="timestamp"
                      label="Time"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead>
                    <SortableTableHead
                      column="type"
                      label="Type"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead>
                    <SortableTableHead
                      column="summary"
                      label="Summary"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead>
                    <SortableTableHead
                      column="sessionKey"
                      label="Session"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead>Meta</TableHead>
                  <TableHead>
                    <SortableTableHead
                      column="status"
                      label="Status"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Loading activities…</TableCell>
                  </TableRow>
                ) : sortedActivities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No activities found for this filter.</TableCell>
                  </TableRow>
                ) : sortedActivities.map((activity) => {
                  const Icon = iconFor(activity.type);
                  return (
                    <TableRow key={activity.id}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground tabular-nums">
                        <div>{fmtAge(activity.timestamp)}</div>
                        <div>{fmtDate(new Date(activity.timestamp), settings.dateFormat)}</div>
                      </TableCell>
                      <TableCell>
                        <div className="inline-flex items-center gap-2 text-xs">
                          <Icon
                            className="h-4 w-4"
                            style={{ color: activity.status === "error" ? "var(--theme-accent)" : accent, opacity: activity.status === "error" ? 0.5 : 1 }}
                          />
                          {TYPE_LABELS[activity.type]}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm leading-relaxed max-w-[520px]">
                        <p className="break-words">{activity.summary}</p>
                      </TableCell>
                      <TableCell className="text-xs">
                        <span className="font-mono text-muted-foreground break-all">{activity.sessionKey}</span>
                      </TableCell>
                      <TableCell>
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
                          {!activity.cronJobId && !activity.channel && !activity.toolName && !activity.model && (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {activity.status === "error" ? (
                          <span
                            className="px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: "color-mix(in srgb, var(--theme-accent) 8%, transparent)",
                              color: "var(--theme-accent)",
                              opacity: 0.5,
                            }}
                          >
                            error
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            ok
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
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
