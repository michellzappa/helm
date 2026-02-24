import Layout from "@/components/Layout";
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

const SPEED_COLORS: Record<string, string> = {
  fast:     "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200",
  balanced: "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200",
  slow:     "bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-200",
};

const TAG_COLORS: Record<string, string> = {
  default:    "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-200",
  configured: "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200",
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

  const sorted = sortData(models, sortBy, sortDir);

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-4xl font-bold">Models</h1>
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
                          <span key={tag} className={`text-xs font-medium px-2 py-0.5 rounded ${TAG_COLORS[tag] ?? "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"}`}>
                            {tag}
                          </span>
                        ))}
                        {model.sizeBytes ? (
                          <span className="text-xs text-muted-foreground">{formatBytes(model.sizeBytes)}</span>
                        ) : null}
                        {(!model.tags?.length && !model.sizeBytes) ? "—" : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      {model.speed ? (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded capitalize ${SPEED_COLORS[model.speed]}`}>
                          {model.speed}
                        </span>
                      ) : "—"}
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
        )}
      </div>
    </Layout>
  );
}
