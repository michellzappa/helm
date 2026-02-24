import Layout from "@/components/Layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Clock, Zap } from "lucide-react";
import { SortableTableHead } from "@/components/SortableTableHead";
import { sortData, getNextSortDirection, type SortDirection } from "@/lib/sorting";
import { useState, useEffect } from "react";
import { useCounts } from "@/lib/counts-context";

interface ScheduledTask {
  id: string;
  name: string;
  type: "cron" | "launchagent";
  schedule: string;
  enabled: boolean;
  nextRunAtMs?: number;
  lastRunAtMs?: number;
  workspace?: string;
  model?: string;
}

export default function ScheduledPage() {
  const { counts } = useCounts();
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string | null>("name");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");

  useEffect(() => {
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
  }, []);

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
      return `In ${diffDays}d ${next.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    }
  };

  const getLastRun = (lastRunMs?: number) => {
    if (!lastRunMs) return "Never";
    const now = new Date();
    const last = new Date(lastRunMs);
    const diffMs = now.getTime() - lastRunMs;
    
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) {
      return "Just now";
    } else if (diffMins < 60) {
      return `${diffMins} min ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return last.toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    }
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

  const sortedTasks = sortData(tasks, sortBy, sortDir);

  return (
    <Layout>
      <div className="space-y-6 sm:space-y-8">
        <div>
          <h1 className="text-2xl sm:text-4xl font-bold">Scheduled</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {counts?.scheduled ?? "…"} scheduled tasks
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
                      column="workspace"
                      label="Workspace"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="cursor-pointer">
                    <SortableTableHead
                      column="type"
                      label="Type"
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
                      column="enabled"
                      label="Status"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.length === 0 ? (
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
                          {task.workspace || "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-medium px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                          {getTypeDisplay(task)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-medium px-2 py-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200">
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
                        <span
                          className={`text-xs px-2 py-1 rounded font-medium ${
                            task.enabled
                              ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200"
                              : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400"
                          }`}
                        >
                          {task.type === "cron"
                            ? task.enabled
                              ? "Active"
                              : "Disabled"
                            : task.enabled
                            ? "Running"
                            : "Stopped"}
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
