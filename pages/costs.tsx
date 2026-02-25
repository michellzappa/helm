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
import type { CostHistoryData } from "./api/cost-history";

function fmtCost(usd: number): string {
  if (usd >= 1) return "$" + usd.toFixed(2);
  return "$" + usd.toFixed(3);
}

function dayLabel(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function CostsPage() {
  const [data, setData] = useState<CostHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const { settings } = useSettings();

  useAutoRefresh(() => {
    fetch("/api/cost-history")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  });

  const accent =
    THEME_COLORS.find(c => c.id === settings.themeColor)?.accent ??
    "var(--theme-accent)";
  const summary = data?.summary ?? { today: 0, week: 0, month: 0, allTime: 0 };

  const costByModel = useMemo(() => {
    const rows = (data?.byModel ?? []).filter(x => x.cost > 0);
    const total = rows.reduce((sum, x) => sum + x.cost, 0);
    return rows.map(x => ({
      ...x,
      share: total > 0 ? (x.cost / total) * 100 : 0,
    }));
  }, [data?.byModel]);

  const costByKind = useMemo(() => {
    const rows = (data?.byKind ?? []).filter(x => x.cost > 0);
    const total = rows.reduce((sum, x) => sum + x.cost, 0);
    return rows.map(x => ({
      ...x,
      share: total > 0 ? (x.cost / total) * 100 : 0,
    }));
  }, [data?.byKind]);

  const dailyCosts = useMemo(
    () =>
      (data?.daily ?? []).map(row => ({
        date: row.date,
        label: dayLabel(row.date),
        cost: row.cost,
      })),
    [data?.daily]
  );

  return (
    <Layout>
      <div className="space-y-6 sm:space-y-8">
        <div>
          <h1 className="text-2xl sm:text-4xl font-bold">Costs</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {loading ? "…" : `${fmtCost(summary.allTime)} USD total`}
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
              <p className="text-xl sm:text-2xl font-semibold tabular-nums">{fmtCost(summary.week)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">30 days</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xl sm:text-2xl font-semibold tabular-nums">{fmtCost(summary.month)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">All time</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xl sm:text-2xl font-semibold tabular-nums">{fmtCost(summary.allTime)}</p>
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
                      <span className="tabular-nums text-muted-foreground">{fmtCost(row.cost)} ({row.share.toFixed(1)}%)</span>
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
                      <span className="tabular-nums text-muted-foreground">{fmtCost(row.cost)} ({row.share.toFixed(1)}%)</span>
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
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${Number(v).toFixed(2)}`} />
                  <Tooltip
                    formatter={(value) => [fmtCost(Number(value ?? 0)), "Cost"]}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ""}
                  />
                  <Bar dataKey="cost" fill={accent} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
