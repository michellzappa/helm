import { PageInfo } from "@/components/PageInfo";
import Layout from "@/components/Layout";
import { TableFilter } from "@/components/TableFilter";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Clock, Zap, Play, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { SortableTableHead } from "@/components/SortableTableHead";
import { sortData, getNextSortDirection, type SortDirection } from "@/lib/sorting";
import { useState } from "react";
import { useAutoRefresh, useSettings } from "@/lib/settings-context";
import { useCounts } from "@/lib/counts-context";
import { fmtAge, fmtDate, fmtTime } from "@/lib/format";

interface ScheduledTask {
  id: string;
  name: string;
  type: "cron" | "launchagent";
  schedule: string;
  enabled: boolean;
  nextRunAtMs?: number;
  lastRunAtMs?: number;
  agent?: string;
  model?: string;
  status?: string;
  lastError?: string;
}

export default function ScheduledPage() {
  const { counts } = useCounts();
  const { settings } = useSettings();
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string | null>("name");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");
  const [filterQuery, setFilterQuery] = useState("");
  // Per-job run state: "idle" | "running" | "ok" | "error"
  const [runState, setRunState] = useState<Record<string, "idle" | "running" | "ok" | "error">>({});

  useAutoRefresh(() => {
    fetch("/api/scheduled-tasks")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setTasks(data);
        } else if (data.error) {
          setError(data.error);
          setTasks([]);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setTasks([]);
        setLoading(false);
      });
  });

  async function handleRunNow(jobId: string) {
    setRunState(s => ({ ...s, [jobId]: "running" }));
    try {
      const res = await fetch("/api/cron-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      const json = await res.json();
      setRunState(s => ({ ...s, [jobId]: json.ok ? "ok" : "error" }));
    } catch {
      setRunState(s => ({ ...s, [jobId]: "error" }));
    }
    // Reset to idle after 3s
    setTimeout(() => setRunState(s => ({ ...s, [jobId]: "idle" })), 3000);
  }

  const getNextRun = (nextRunMs?: number) => {
    if (!nextRunMs) return "—";
    const now = new Date();
    const next = new Date(nextRunMs);
    const diffMs = nextRunMs - now.getTime();
    
    if (diffMs < 0) {
      return "Overdue";
    }
    
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) {
      return "In < 1 min";
    } else if (diffMins < 60) {
      return `In ${diffMins} min`;
    } else if (diffHours < 24) {
      return `In ${diffHours}h ${diffMins % 60}m`;
    } else {
      return `In ${diffDays}d (${fmtDate(next, settings.dateFormat)} ${fmtTime(next, settings.timeFormat)})`;
    }
  };

  const getLastRun = (lastRunMs?: number) => {
    if (!lastRunMs) return "Never";
    const last = new Date(lastRunMs);
    const diffMs = Date.now() - lastRunMs;
    if (diffMs < 7 * 24 * 60 * 60 * 1000) return fmtAge(lastRunMs);
    return `${fmtDate(last, settings.dateFormat)} ${fmtTime(last, settings.timeFormat)}`;
  };

  const getTypeDisplay = (task: ScheduledTask) => {
    return task.type === "cron" ? "Cron" : "LaunchAgent";
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDir(getNextSortDirection(sortDir));
    } else {
      setSortBy(column);
      setSortDir("asc");
    }
  };

  const q = filterQuery.trim().toLowerCase();
  const filteredTasks = tasks.filter((task) => {
    if (!q) return true;
    const resolvedStatus = task.status || (task.enabled ? "ok" : "disabled");
    const displayStatus = task.type === "launchagent"
      ? (task.enabled ? "running" : "stopped")
      : resolvedStatus;
    return [task.name, task.agent ?? "", task.model ?? "", resolvedStatus, displayStatus]
      .some((value) => value.toLowerCase().includes(q));
  });
  const sortedTasks = sortData(filteredTasks, sortBy, sortDir);

  return (
    <Layout>
      <div className="space-y-6 sm:space-y-8">
        <div>
            <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-4xl font-bold">Crons</h1>
              <PageInfo page="crons" />
            </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {counts?.scheduled ?? "…"} cron jobs
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            Error: {error}
          </div>
        )}

        {loading ? (
          <p className="text-muted-foreground">Loading scheduled tasks...</p>
        ) : (
          <div className="space-y-3">
            <TableFilter
              placeholder="Filter scheduled tasks..."
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
                      label="Task Name"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="cursor-pointer">
                    <SortableTableHead
                      column="agent"
                      label="Agent"
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
                  <TableHead>Schedule</TableHead>
                  <TableHead className="cursor-pointer">
                    <SortableTableHead
                      column="lastRunAtMs"
                      label="Last Run"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="cursor-pointer">
                    <SortableTableHead
                      column="nextRunAtMs"
                      label="Next Run"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="cursor-pointer">
                    <SortableTableHead
                      column="status"
                      label="Status"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="w-16 text-right">Run</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedTasks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No scheduled tasks
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedTasks.map((task) => (
                      <TableRow key={task.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {task.type === "cron" ? (
                            <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          ) : (
                            <Zap className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          )}
                          <span className="truncate">{task.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-medium px-2 py-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 capitalize">
                          {task.agent || "default"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                          {task.model || "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs whitespace-nowrap bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded border border-gray-200 dark:border-gray-700">
                          {task.schedule}
                        </code>
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm text-muted-foreground">
                        {task.type === "cron" ? getLastRun(task.lastRunAtMs) : "—"}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm text-muted-foreground">
                        {task.type === "cron" ? (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {getNextRun(task.nextRunAtMs)}
                          </div>
                        ) : (
                          "On-demand"
                        )}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const status = task.status || (task.enabled ? "ok" : "disabled");
                          const styles: Record<string, string> = {
                            ok: "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200",
                            error: "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200",
                            pending: "bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-200",
                            idle: "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400",
                            disabled: "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500",
                          };
                          const labels: Record<string, string> = {
                            ok: "OK",
                            error: "Error",
                            pending: "Pending",
                            idle: "Idle",
                            disabled: "Disabled",
                          };
                          // LaunchAgents: keep simple Running/Stopped
                          if (task.type === "launchagent") {
                            return (
                              <span className={`text-xs px-2 py-1 rounded font-medium ${task.enabled ? styles.ok : styles.disabled}`}>
                                {task.enabled ? "Running" : "Stopped"}
                              </span>
                            );
                          }
                          return (
                            <span
                              className={`text-xs px-2 py-1 rounded font-medium ${styles[status] || styles.idle}`}
                              title={task.lastError || undefined}
                            >
                              {labels[status] || status}
                            </span>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="text-right">
                        {task.type === "cron" && (() => {
                          const state = runState[task.id] ?? "idle";
                          return (
                            <button
                              type="button"
                              disabled={state === "running"}
                              onClick={() => handleRunNow(task.id)}
                              title="Run now"
                              className="inline-flex items-center justify-center h-7 w-7 rounded hover:bg-muted transition-colors disabled:opacity-50"
                            >
                              {state === "running" && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                              {state === "ok"      && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
                              {state === "error"   && <XCircle className="h-3.5 w-3.5 text-red-500" />}
                              {state === "idle"    && <Play className="h-3.5 w-3.5 text-muted-foreground" />}
                            </button>
                          );
                        })()}
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
    </Layout>
  );
}
