import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageInfo } from "@/components/PageInfo";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CURRENCY_RATES, useAutoRefresh, useSettings } from "@/lib/settings-context";
import { THEME_COLORS } from "@/lib/theme-colors";
import type { CostHistoryData } from "./api/cost-history";

function fmtCost(value: number, symbol: string): string {
  if (value >= 1) return symbol + value.toFixed(2);
  return symbol + value.toFixed(3);
}

function dayLabel(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function CostsPage() {
  const [data, setData] = useState<CostHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const { settings } = useSettings();
  const currencyInfo = CURRENCY_RATES[settings.currency];
  const convertCost = (usdValue: number) => usdValue * currencyInfo.rate;

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
      displayCost: convertCost(x.cost),
      share: total > 0 ? (x.cost / total) * 100 : 0,
    }));
  }, [data?.byModel, currencyInfo.rate]);

  const modelAccentOpacity = (index: number) => Math.max(0.35, 1 - index * 0.2);

  const costByKind = useMemo(() => {
    const rows = (data?.byKind ?? []).filter(x => x.cost > 0);
    const total = rows.reduce((sum, x) => sum + x.cost, 0);
    return rows.map(x => ({
      ...x,
      displayCost: convertCost(x.cost),
      share: total > 0 ? (x.cost / total) * 100 : 0,
    }));
  }, [data?.byKind, currencyInfo.rate]);

  // Build stacked daily data: one key per model
  const { dailyCosts, dailyModels } = useMemo(() => {
    const modelSet = new Set<string>();
    const rows = (data?.daily ?? []).map(row => {
      const entry: Record<string, unknown> = {
        date: row.date,
        label: dayLabel(row.date),
        cost: convertCost(row.cost),
      };
      if (row.byModel) {
        for (const [model, cost] of Object.entries(row.byModel)) {
          modelSet.add(model);
          entry[model] = convertCost(cost);
        }
      }
      return entry;
    });
    // Sort models by total cost (matching byModel order)
    const modelOrder = (data?.byModel ?? []).map(m => m.model);
    const sorted = Array.from(modelSet).sort((a, b) => {
      const ai = modelOrder.indexOf(a);
      const bi = modelOrder.indexOf(b);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
    return { dailyCosts: rows, dailyModels: sorted };
  }, [data?.daily, data?.byModel, currencyInfo.rate]);

  return (
    <Layout>
      <div className="space-y-6 sm:space-y-8">
        <div>
            <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-4xl font-bold">Spend</h1>
              <PageInfo page="spend" />
            </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {loading ? "…" : `${fmtCost(convertCost(summary.allTime), currencyInfo.symbol)} total · API-equivalent`}
          </p>
        </div>

        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Today</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xl sm:text-2xl font-semibold tabular-nums">{fmtCost(convertCost(summary.today), currencyInfo.symbol)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">7 days</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xl sm:text-2xl font-semibold tabular-nums">{fmtCost(convertCost(summary.week), currencyInfo.symbol)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">30 days</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xl sm:text-2xl font-semibold tabular-nums">{fmtCost(convertCost(summary.month), currencyInfo.symbol)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">All time</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xl sm:text-2xl font-semibold tabular-nums">{fmtCost(convertCost(summary.allTime), currencyInfo.symbol)}</p>
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
                costByModel.map((row, index) => (
                  <div key={row.model} className="space-y-1">
                    <div className="flex justify-between gap-3 text-xs">
                      <span className="truncate font-medium" title={row.model}>{row.model}</span>
                      <span className="tabular-nums text-muted-foreground">{fmtCost(row.displayCost, currencyInfo.symbol)} ({row.share.toFixed(1)}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${row.share}%`, backgroundColor: accent, opacity: modelAccentOpacity(index) }}
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
                      <span className="tabular-nums text-muted-foreground">{fmtCost(row.displayCost, currencyInfo.symbol)} ({row.share.toFixed(1)}%)</span>
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
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => fmtCost(Number(v), currencyInfo.symbol)} />
                  <Tooltip
                    formatter={(value: number, name: string) => [fmtCost(Number(value ?? 0), currencyInfo.symbol), name]}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ""}
                    contentStyle={{ fontSize: 12 }}
                  />
                  {dailyModels.map((model, index) => (
                    <Bar
                      key={model}
                      dataKey={model}
                      stackId="cost"
                      fill={accent}
                      fillOpacity={modelAccentOpacity(index)}
                      radius={index === dailyModels.length - 1 ? [4, 4, 0, 0] : undefined}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
