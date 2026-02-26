import { PageInfo } from "@/components/PageInfo";
import Layout from "@/components/Layout";
import { TableFilter } from "@/components/TableFilter";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Bot, Radio } from "lucide-react";
import { useState } from "react";
import { useAutoRefresh } from "@/lib/settings-context";
import { useCounts } from "@/lib/counts-context";
import { SortableTableHead } from "@/components/SortableTableHead";
import { sortData, getNextSortDirection, type SortDirection } from "@/lib/sorting";
import type { OcAgent } from "./api/oc-agents";

function shortPath(p: string) {
  return p.replace(/^\/Users\/[^/]+/, "~");
}

export default function AgentsPage() {
  const { counts } = useCounts();
  const [agents, setAgents] = useState<OcAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<OcAgent | null>(null);
  const [sortBy, setSortBy] = useState<string | null>("name");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");
  const [filterQuery, setFilterQuery] = useState("");

  useAutoRefresh(() => {
    fetch("/api/oc-agents")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) {
          setAgents(d);
          setError(null);
        } else {
          setError(d.error || "Failed to load agents");
          setAgents([]);
        }
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setAgents([]);
        setLoading(false);
      });
  });

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDir(getNextSortDirection(sortDir));
    } else {
      setSortBy(column);
      setSortDir("asc");
    }
  };

  const tableAgents = agents.map((agent) => ({
    ...agent,
    channelCount: Array.from(new Set(agent.bindings.map((b) => b.channel))).length,
    skillCount: agent.skillCount ?? 0,
    statusSort: agent.isDefault ? 1 : 0,
  }));

  const q = filterQuery.trim().toLowerCase();
  const filteredAgents = tableAgents.filter((agent) => {
    if (!q) return true;
    return [agent.name, agent.id, agent.model, agent.workspace]
      .some((value) => value.toLowerCase().includes(q));
  });
  const sortedAgents = sortData(filteredAgents, sortBy, sortDir);

  return (
    <Layout>
      <div className="space-y-6 sm:space-y-8">
        <div>
            <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-4xl font-bold">Agents</h1>
              <PageInfo page="agents" />
            </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {counts?.agents ?? "…"} configured agents
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded">
            Error: {error}
          </div>
        )}

        {loading ? (
          <p className="text-muted-foreground">Loading agents...</p>
        ) : (
          <div className="space-y-3">
            <TableFilter
              placeholder="Filter agents..."
              value={filterQuery}
              onChange={setFilterQuery}
            />
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                  <TableHead className="cursor-pointer">
                    <SortableTableHead
                      column="name"
                      label="Agent Name"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="cursor-pointer">
                    <SortableTableHead
                      column="workspace"
                      label="Workspace"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="cursor-pointer">
                    <SortableTableHead
                      column="model"
                      label="Model"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="cursor-pointer">
                    <SortableTableHead
                      column="channelCount"
                      label="Channels"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="cursor-pointer">
                    <SortableTableHead
                      column="skillCount"
                      label="Skills"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="cursor-pointer">
                    <SortableTableHead
                      column="statusSort"
                      label="Status"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                  </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedAgents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No agents found
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedAgents.map((agent) => (
                      <TableRow
                        key={agent.id}
                        className="cursor-pointer"
                        onClick={() => setSelected(agent)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Bot className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <div className="min-w-0">
                              <div className="truncate">{agent.name}</div>
                              <div className="text-xs text-muted-foreground font-mono truncate">{agent.id}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground max-w-xs">
                          <code className="bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded">
                            {shortPath(agent.workspace)}
                          </code>
                        </TableCell>
                        <TableCell>
                          <span
                            className="text-xs font-medium px-2 py-1 rounded"
                            style={{
                              backgroundColor: "color-mix(in srgb, var(--theme-accent) 15%, transparent)",
                              color: "var(--theme-accent)",
                            }}
                          >
                            {agent.model}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">{agent.channelCount}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">{agent.skillCount}</span>
                        </TableCell>
                        <TableCell>
                          {agent.isDefault ? (
                            <span className="text-xs font-medium bg-gray-100 dark:bg-gray-800 text-muted-foreground px-2 py-1 rounded">
                              Default
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      <Sheet open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          {selected && (
            <>
              <SheetHeader className="pb-4">
                <SheetTitle className="flex items-center gap-3 pr-8">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                    <Bot className="h-4 w-4 text-muted-foreground" />
                  </div>
                  {selected.name}
                  {selected.isDefault && (
                    <span className="text-xs font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded">default</span>
                  )}
                </SheetTitle>
              </SheetHeader>

              <div className="px-6 pb-6 space-y-5">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Agent ID</p>
                  <p className="text-sm font-mono">{selected.id}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Model</p>
                  <p className="text-sm font-mono">{selected.model}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Workspace</p>
                  <p className="text-xs font-mono bg-muted px-3 py-2 rounded break-all">{shortPath(selected.workspace)}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Agent Dir</p>
                  <p className="text-xs font-mono bg-muted px-3 py-2 rounded break-all">{shortPath(selected.agentDir)}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    Sessions ({selected.sessionCount})
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selected.sessionCount > 0
                      ? `${selected.sessionCount} session file${selected.sessionCount !== 1 ? "s" : ""} on disk`
                      : "No sessions yet"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    Channels ({Array.from(new Set(selected.bindings.map((b) => b.channel))).length})
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selected.bindings.length > 0
                      ? selected.bindings.map((b) => b.channel).filter((v, i, arr) => arr.indexOf(v) === i).join(", ")
                      : "Catch-all (no explicit channel bindings)"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    Skills ({selected.skillCount ?? 0})
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(selected.skillCount ?? 0) > 0
                      ? `${selected.skillCount} configured skill${(selected.skillCount ?? 0) !== 1 ? "s" : ""}`
                      : "No per-agent skill overrides"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Bindings ({selected.bindings.length})
                  </p>
                  {selected.bindings.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">Catch-all - receives unmatched inbound messages</p>
                  ) : (
                    <div className="space-y-2">
                      {selected.bindings.map((b, i) => (
                        <div key={i} className="text-xs bg-muted rounded px-3 py-2 space-y-0.5">
                          <div className="font-medium flex items-center gap-1.5">
                            <Radio className="h-3 w-3" />{b.channel}
                            {b.accountId && <span className="text-muted-foreground">- {b.accountId}</span>}
                          </div>
                          {b.peer && (
                            <div className="text-muted-foreground pl-4.5">
                              {b.peer.kind}: <span className="font-mono">{b.peer.id}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </Layout>
  );
}
