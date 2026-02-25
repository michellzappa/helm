import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAutoRefresh, useSettings } from "@/lib/settings-context";
import { THEME_COLORS } from "@/lib/theme-colors";
import type { SessionEntry, SessionsData } from "./api/sessions";

type WindowKey = "today" | "7d" | "30d" | "all";

const KINDS: SessionEntry["kind"][] = ["direct", "cron", "telegram", "whatsapp", "api", "other"];

function fmtCost(eur: number): string {
  if (eur === 0) return "€0.00";
  if (eur < 0.01) return "< €0.01";
  if (eur >= 1) return "€" + eur.toFixed(2);
  return "€" + eur.toFixed(3);
}

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function daysAgoStart(days: number): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d.getTime();
}

function dayKey(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dayLabel(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function CostsPage() {
  const [data, setData] = useState<SessionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const { settings } = useSettings();

  useAutoRefresh(() => {
    fetch("/api/sessions")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  });

  const accent =
    THEME_COLORS.find(c => c.id === settings.themeColor)?.accent ??
    "var(--theme-accent)";
  const sessions = data?.sessions ?? [];

  const summary = useMemo(() => {
    const now = Date.now();
    const todayStart = startOfDay(now);
    const sevenStart = daysAgoStart(6);
    const thirtyStart = daysAgoStart(29);
    const totals: Record<WindowKey, number> = { today: 0, "7d": 0, "30d": 0, all: 0 };

    for (const s of sessions) {
      totals.all += s.costEur;
      if (!s.updatedAt) continue;
      if (s.updatedAt >= todayStart) totals.today += s.costEur;
      if (s.updatedAt >= sevenStart) totals["7d"] += s.costEur;
      if (s.updatedAt >= thirtyStart) totals["30d"] += s.costEur;
    }
    return totals;
  }, [sessions]);

  const costByModel = useMemo(() => {
    const rows = (data?.byCost ?? []).filter(x => x.costEur > 0);
    const total = rows.reduce((sum, x) => sum + x.costEur, 0);
    return rows.map(x => ({
      ...x,
      share: total > 0 ? (x.costEur / total) * 100 : 0,
    }));
  }, [data?.byCost]);

  const costByKind = useMemo(() => {
    const map: Record<SessionEntry["kind"], number> = {
      direct: 0,
      cron: 0,
      telegram: 0,
      whatsapp: 0,
      api: 0,
      other: 0,
    };
    for (const s of sessions) map[s.kind] += s.costEur;
    const total = Object.values(map).reduce((sum, v) => sum + v, 0);
    return KINDS.map(kind => ({
      kind,
      costEur: map[kind],
      share: total > 0 ? (map[kind] / total) * 100 : 0,
    })).filter(x => x.costEur > 0);
  }, [sessions]);

  const dailyCosts = useMemo(() => {
    const buckets: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const ts = daysAgoStart(i);
      buckets[dayKey(ts)] = 0;
    }
    const minTs = daysAgoStart(29);
    for (const s of sessions) {
      if (!s.updatedAt || s.updatedAt < minTs) continue;
      const key = dayKey(s.updatedAt);
      if (key in buckets) buckets[key] += s.costEur;
    }
    return Object.entries(buckets).map(([date, costEur]) => ({
      date,
      label: dayLabel(date),
      costEur: Number(costEur.toFixed(6)),
    }));
  }, [sessions]);

  return (
    <Layout>
      <div className="space-y-6 sm:space-y-8">
        <div>
          <h1 className="text-2xl sm:text-4xl font-bold">Costs <span className="text-sm font-normal text-muted-foreground align-middle">estimated</span></h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {loading ? "…" : `${sessions.length} sessions · ${fmtCost(summary.all)} estimated (API-equivalent)`}
          </p>
        </div>

        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Today</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xl sm:text-2xl font-semibold tabular-nums">{fmtCost(summary.today)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">7 days</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xl sm:text-2xl font-semibold tabular-nums">{fmtCost(summary["7d"])}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">30 days</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xl sm:text-2xl font-semibold tabular-nums">{fmtCost(summary["30d"])}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">All time</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xl sm:text-2xl font-semibold tabular-nums">{fmtCost(summary.all)}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Cost by Model</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {costByModel.length === 0 ? (
                <p className="text-sm text-muted-foreground">No model costs yet.</p>
              ) : (
                costByModel.map(row => (
                  <div key={row.model} className="space-y-1">
                    <div className="flex justify-between gap-3 text-xs">
                      <span className="truncate font-medium" title={row.model}>{row.model}</span>
                      <span className="tabular-nums text-muted-foreground">{fmtCost(row.costEur)} ({row.share.toFixed(1)}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${row.share}%`, backgroundColor: accent }}
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Cost by Session Type</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {costByKind.length === 0 ? (
                <p className="text-sm text-muted-foreground">No session type costs yet.</p>
              ) : (
                costByKind.map(row => (
                  <div key={row.kind} className="space-y-1">
                    <div className="flex justify-between gap-3 text-xs">
                      <span className="capitalize font-medium">{row.kind}</span>
                      <span className="tabular-nums text-muted-foreground">{fmtCost(row.costEur)} ({row.share.toFixed(1)}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${row.share}%`, backgroundColor: accent }}
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Daily Cost (30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyCosts}>
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={4} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `€${Number(v).toFixed(2)}`} />
                  <Tooltip
                    formatter={(value) => [fmtCost(Number(value ?? 0)), "Cost"]}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ""}
                  />
                  <Bar dataKey="costEur" fill={accent} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
