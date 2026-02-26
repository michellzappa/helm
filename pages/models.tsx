import { PageInfo } from "@/components/PageInfo";
import Layout from "@/components/Layout";
import { TableFilter } from "@/components/TableFilter";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SortableTableHead } from "@/components/SortableTableHead";
import { sortData, getNextSortDirection, type SortDirection } from "@/lib/sorting";
import { useState, useEffect } from "react";
import { Zap, Cpu } from "lucide-react";
import type { Model } from "./api/models";

interface ModelUsage {
  modelId: string;
  jobs: Array<{ jobId: string; jobName: string; modelRef: string }>;
}

const SPEED_COLORS: Record<string, { className?: string; style?: React.CSSProperties }> = {
  fast: {
    style: {
      backgroundColor: "color-mix(in srgb, var(--theme-accent) 15%, transparent)",
      color: "var(--theme-accent)",
    },
  },
  balanced: {
    style: {
      backgroundColor: "color-mix(in srgb, var(--theme-accent) 10%, transparent)",
      color: "var(--theme-accent)",
      opacity: 0.7,
    },
  },
  slow: { className: "bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-200" },
};

const TAG_COLORS: Record<string, { className?: string; style?: React.CSSProperties }> = {
  default: { className: "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-200" },
  configured: {
    style: {
      backgroundColor: "color-mix(in srgb, var(--theme-accent) 15%, transparent)",
      color: "var(--theme-accent)",
    },
  },
};

function formatBytes(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(0)} MB`;
  return `${bytes} B`;
}

export default function ModelsPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [usage, setUsage] = useState<ModelUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string | null>("source");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");
  const [filterQuery, setFilterQuery] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/models").then(r => r.json()),
      fetch("/api/model-usage").then(r => r.json()),
    ]).then(([modelsData, usageData]) => {
      if (Array.isArray(modelsData)) setModels(modelsData);
      else if (modelsData.error) setError(modelsData.error);
      if (Array.isArray(usageData)) setUsage(usageData);
      setLoading(false);
    }).catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const getUsage = (id: string) => usage.find(u => u.modelId === id)?.jobs || [];

  const handleSort = (col: string) => {
    if (sortBy === col) setSortDir(getNextSortDirection(sortDir));
    else { setSortBy(col); setSortDir("asc"); }
  };

  const q = filterQuery.trim().toLowerCase();
  const filteredModels = models.filter((model) => {
    if (!q) return true;
    const jobNames = getUsage(model.id).map((job) => job.jobName).join(" ");
    const tags = (model.tags ?? []).join(" ");
    return [
      model.id,
      model.name,
      model.provider,
      model.source,
      model.speed ?? "",
      tags,
      jobNames,
    ].some((value) => value.toLowerCase().includes(q));
  });
  const sorted = sortData(filteredModels, sortBy, sortDir);

  return (
    <Layout>
      <div className="space-y-6">
        <div>
            <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-4xl font-bold">Models</h1>
              <PageInfo page="models" />
            </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {loading ? "…" : `${models.length} configured models`}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded">
            Error: {error}
          </div>
        )}

        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : (
          <div className="space-y-3">
            <TableFilter
              placeholder="Filter models..."
              value={filterQuery}
              onChange={setFilterQuery}
            />
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead><SortableTableHead column="name"     label="Model"    sortBy={sortBy} sortDir={sortDir} onSort={handleSort} /></TableHead>
                    <TableHead><SortableTableHead column="provider" label="Provider" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} /></TableHead>
                    <TableHead><SortableTableHead column="tags"     label="Tags"     sortBy={sortBy} sortDir={sortDir} onSort={handleSort} /></TableHead>
                    <TableHead><SortableTableHead column="speed"    label="Speed"    sortBy={sortBy} sortDir={sortDir} onSort={handleSort} /></TableHead>
                    <TableHead className="text-right"><SortableTableHead column="context" label="Context" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} /></TableHead>
                    <TableHead className="text-center">Input</TableHead>
                    <TableHead className="text-center">Output</TableHead>
                    <TableHead>Used For</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">No models found</TableCell>
                    </TableRow>
                  ) : sorted.map(model => (
                    <TableRow key={model.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {model.source === "local"
                            ? <Cpu className="h-4 w-4 text-muted-foreground shrink-0" />
                            : <Zap className="h-4 w-4 text-muted-foreground shrink-0" />}
                          <div className="min-w-0">
                            <div className="truncate">{model.name}</div>
                            <code className="text-[10px] text-muted-foreground">{model.id}</code>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{model.provider}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {model.tags?.filter(t => !t.startsWith("alias:")).map(tag => (
                            (() => {
                              const tagStyle = TAG_COLORS[tag] ?? { className: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400" };
                              return (
                            <span key={tag} className={`text-xs font-medium px-2 py-0.5 rounded ${tagStyle.className ?? ""}`} style={tagStyle.style}>
                              {tag}
                            </span>
                              );
                            })()
                          ))}
                          {model.sizeBytes ? (
                            <span className="text-xs text-muted-foreground">{formatBytes(model.sizeBytes)}</span>
                          ) : null}
                          {(!model.tags?.length && !model.sizeBytes) ? "—" : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        {model.speed ? (() => {
                          const speedStyle = SPEED_COLORS[model.speed];
                          return (
                            <span className={`text-xs font-medium px-2 py-0.5 rounded capitalize ${speedStyle.className ?? ""}`} style={speedStyle.style}>
                              {model.speed}
                            </span>
                          );
                        })() : "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {model.context ? `${Math.round(model.context / 1000)}K` : "—"}
                      </TableCell>
                      <TableCell className="text-center text-xs text-muted-foreground whitespace-nowrap">
                        {model.costInput ?? "—"}
                      </TableCell>
                      <TableCell className="text-center text-xs text-muted-foreground whitespace-nowrap">
                        {model.costOutput ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {(() => {
                          const jobs = getUsage(model.id);
                          if (!jobs.length) return <span className="text-muted-foreground">—</span>;
                          return (
                            <div className="space-y-0.5">
                              {jobs.map(job => (
                                <div key={job.jobId} className="truncate text-muted-foreground" title={job.jobName}>
                                  {job.jobName}
                                </div>
                              ))}
                            </div>
                          );
                        })()}
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
