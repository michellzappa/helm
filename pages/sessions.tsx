import { PageInfo } from "@/components/PageInfo";
import Layout from "@/components/Layout";
import { TableFilter } from "@/components/TableFilter";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MessageSquare, Bot, Clock, Cpu, Globe } from "lucide-react";
import { SortableTableHead } from "@/components/SortableTableHead";
import { sortData, getNextSortDirection, type SortDirection } from "@/lib/sorting";
import { useState } from "react";
import { useAutoRefresh } from "@/lib/settings-context";
import { fmtAge } from "@/lib/format";
import type { SessionEntry, SessionsData } from "./api/sessions";

const KIND_ICON: Record<SessionEntry["kind"], React.ReactNode> = {
  direct:   <Bot         className="h-3.5 w-3.5" />,
  cron:     <Clock       className="h-3.5 w-3.5" />,
  telegram: <MessageSquare className="h-3.5 w-3.5" />,
  whatsapp: <MessageSquare className="h-3.5 w-3.5" />,
  api:      <Globe       className="h-3.5 w-3.5" />,
  other:    <Cpu         className="h-3.5 w-3.5" />,
};

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(0) + "k";
  return String(n);
}

function fmtCost(eur: number): string {
  if (eur === 0) return "—";
  return "€" + eur.toFixed(3);
}

function modelShort(m: string | null): string {
  if (!m) return "—";
  return m.replace("anthropic/claude-", "").replace("anthropic/", "").replace("-latest", "");
}

export default function SessionsPage() {
  const [data, setData]       = useState<SessionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy]   = useState<string | null>("updatedAt");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");
  const [filterQuery, setFilterQuery] = useState("");

  useAutoRefresh(() => {
    fetch("/api/sessions")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  });

  const handleSort = (col: string) => {
    if (sortBy === col) setSortDir(getNextSortDirection(sortDir));
    else { setSortBy(col); setSortDir("desc"); }
  };

  const sessions = data?.sessions ?? [];
  const q = filterQuery.trim().toLowerCase();
  const filtered = sessions.filter((session) => {
    if (!q) return true;
    return [session.label, session.model ?? ""]
      .some((value) => value.toLowerCase().includes(q));
  });
  const sorted = sortData(filtered, sortBy, sortDir);

  return (
    <Layout>
      <div className="space-y-6 sm:space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-4xl font-bold">Sessions</h1>
              <PageInfo page="sessions" />
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              {loading ? "…" : `${sessions.length} sessions`}
              {data && data.totalCostEur > 0 && (
                <span className="ml-2 text-muted-foreground">
                  · total cost <span className="font-medium text-foreground">€{data.totalCostEur.toFixed(2)}</span>
                </span>
              )}
            </p>
          </div>

          {/* Cost breakdown pills */}
          {data && data.byCost.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {data.byCost.map(({ model, costEur }) => (
                <span key={model} className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground tabular-nums">
                  {modelShort(model)} · <span className="font-medium text-foreground">€{costEur.toFixed(2)}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <p className="text-muted-foreground text-sm">Loading sessions…</p>
        ) : (
          <div className="space-y-3">
            <TableFilter
              placeholder="Filter sessions..."
              value={filterQuery}
              onChange={setFilterQuery}
            />
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                  <TableHead>
                    <SortableTableHead column="label"      label="Session"    sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  </TableHead>
                  <TableHead>
                    <SortableTableHead column="model"      label="Model"      sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  </TableHead>
                  <TableHead className="text-right">
                    <SortableTableHead column="totalTokens" label="Context"   sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  </TableHead>
                  <TableHead className="text-right">
                    <SortableTableHead column="inputTokens" label="Input"     sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  </TableHead>
                  <TableHead className="text-right">
                    <SortableTableHead column="outputTokens" label="Output"   sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  </TableHead>
                  <TableHead className="text-right">
                    <SortableTableHead column="cacheRead"  label="Cache R"    sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  </TableHead>
                  <TableHead className="text-right">
                    <SortableTableHead column="costEur"    label="Cost"       sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  </TableHead>
                  <TableHead className="text-right">
                    <SortableTableHead column="updatedAt"  label="Last active" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">No sessions found</TableCell>
                    </TableRow>
                  ) : sorted.map(s => (
                    <TableRow key={s.key}>
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-muted-foreground shrink-0">{KIND_ICON[s.kind]}</span>
                        <span className="truncate text-sm font-medium max-w-[400px]" title={s.key}>
                          {s.label}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-mono text-muted-foreground">
                        {modelShort(s.model)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                      {fmtTokens(s.totalTokens)}
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                      {fmtTokens(s.inputTokens)}
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                      {fmtTokens(s.outputTokens)}
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                      {fmtTokens(s.cacheRead)}
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums font-medium">
                      {fmtCost(s.costEur)}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground tabular-nums">
                      {fmtAge(s.updatedAt)}
                    </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
