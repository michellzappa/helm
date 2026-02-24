import Layout from "@/components/Layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SortableTableHead } from "@/components/SortableTableHead";
import { sortData, getNextSortDirection, type SortDirection } from "@/lib/sorting";
import { useState, useEffect } from "react";
import { useCounts } from "@/lib/counts-context";
import { Zap, Cpu } from "lucide-react";

interface Model {
  id: string;
  name: string;
  provider: string;
  context: number;
  costInput: string;
  costOutput: string;
  speed: "fast" | "balanced" | "slow";
  status: "active" | "inactive";
}

interface ModelUsage {
  modelId: string;
  jobs: Array<{
    jobId: string;
    jobName: string;
    modelRef: string;
  }>;
}

const SPEED_COLORS = {
  fast: "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200",
  balanced: "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200",
  slow: "bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-200",
};

export default function ModelsPage() {
  const { counts } = useCounts();
  const [models, setModels] = useState<Model[]>([]);
  const [usage, setUsage] = useState<ModelUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string | null>("name");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");

  useEffect(() => {
    Promise.all([
      fetch("/api/models").then((res) => res.json()),
      fetch("/api/model-usage").then((res) => res.json()),
    ])
      .then(([modelsData, usageData]) => {
        if (Array.isArray(modelsData)) {
          setModels(modelsData);
        } else if (modelsData.error) {
          setError(modelsData.error);
        }
        if (Array.isArray(usageData)) {
          setUsage(usageData);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const getUsageForModel = (modelId: string) => {
    return usage.find((u) => u.modelId === modelId)?.jobs || [];
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDir(getNextSortDirection(sortDir));
    } else {
      setSortBy(column);
      setSortDir("asc");
    }
  };

  const sortedModels = sortData(models, sortBy, sortDir);

  return (
    <Layout>
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-4 sm:p-8 space-y-6 sm:space-y-8">
        <div>
          <h1 className="text-2xl sm:text-4xl font-bold">Models</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {counts?.models ?? "…"} models available
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded">
            Error: {error}
          </div>
        )}

        {loading ? (
          <p className="text-muted-foreground">Loading models...</p>
        ) : (
          <div className="rounded-lg border dark:border-gray-700 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer">
                    <SortableTableHead
                      column="name"
                      label="Model"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="cursor-pointer">
                    <SortableTableHead
                      column="provider"
                      label="Provider"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="cursor-pointer">
                    <SortableTableHead
                      column="speed"
                      label="Speed"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="text-right cursor-pointer">
                    <SortableTableHead
                      column="context"
                      label="Context"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="text-center">Input Cost</TableHead>
                  <TableHead className="text-center">Output Cost</TableHead>
                  <TableHead>Used For</TableHead>
                  <TableHead className="cursor-pointer">
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
                {sortedModels.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No models found
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedModels.map((model) => (
                    <TableRow key={model.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {model.provider === "Local" ? (
                            <Cpu className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          ) : (
                            <Zap className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          )}
                          <div>
                            <div className="truncate">{model.name}</div>
                            <code className="text-xs text-muted-foreground">{model.id}</code>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{model.provider}</TableCell>
                      <TableCell>
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded capitalize ${
                            SPEED_COLORS[model.speed]
                          }`}
                        >
                          {model.speed}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {model.context > 0 ? `${Math.round(model.context / 1000)}K` : "—"}
                      </TableCell>
                      <TableCell className="text-center text-xs text-muted-foreground">
                        {model.costInput}
                      </TableCell>
                      <TableCell className="text-center text-xs text-muted-foreground">
                        {model.costOutput}
                      </TableCell>
                      <TableCell className="text-xs">
                        {(() => {
                          const jobs = getUsageForModel(model.id);
                          if (jobs.length === 0) {
                            return <span className="text-muted-foreground italic">Not used</span>;
                          }
                          return (
                            <div className="space-y-1">
                              {jobs.map((job) => (
                                <a
                                  key={job.jobId}
                                  href={`/calendar#${job.jobId}`}
                                  className="block text-foreground hover:underline truncate"
                                  title={job.jobName}
                                >
                                  → {job.jobName}
                                </a>
                              ))}
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`text-xs px-2 py-1 rounded font-medium ${
                            model.status === "active"
                              ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200"
                              : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {model.status === "active" ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </Layout>
  );
}
