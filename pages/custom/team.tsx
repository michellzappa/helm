import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SortableTableHead } from "@/components/SortableTableHead";
import { sortData, getNextSortDirection, type SortDirection } from "@/lib/sorting";
import { useState, useEffect } from "react";

interface WorkStream {
  id: string;
  name: string;
  focus: string;
  category: "core" | "gym" | "newsletter";
  responsibility: string;
  automatedTasks: string[];
  dataSource: string[];
  status: "active" | "on-demand";
  cronJobs: string[];
}

export default function TeamPage() {
  const [workstreams, setWorkstreams] = useState<WorkStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string | null>("name");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");

  useEffect(() => {
    fetch("/api/team")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setWorkstreams(data);
        } else if (data.error) {
          setError(data.error);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDir(getNextSortDirection(sortDir));
    } else {
      setSortBy(column);
      setSortDir("asc");
    }
  };

  const sortedWorkstreams = sortData(workstreams, sortBy, sortDir);

  return (
    <Layout>
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-4 sm:p-8 space-y-6 sm:space-y-8">
        <div>
          <h1 className="text-2xl sm:text-4xl font-bold">Team</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {workstreams.length} active work streams
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            Error: {error}
          </div>
        )}

        {loading ? (
          <p className="text-muted-foreground">Loading work streams...</p>
        ) : (
          <div className="rounded-lg border dark:border-gray-700 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer">
                    <SortableTableHead
                      column="name"
                      label="Name"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="cursor-pointer">
                    <SortableTableHead
                      column="focus"
                      label="Focus"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead>Responsibility</TableHead>
                  <TableHead>Tasks</TableHead>
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
                {workstreams.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No work streams
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedWorkstreams.map((stream) => (
                    <TableRow key={stream.id}>
                      <TableCell className="font-medium">{stream.name}</TableCell>
                      <TableCell className="text-sm">{stream.focus}</TableCell>
                      <TableCell className="text-sm max-w-xs">{stream.responsibility}</TableCell>
                      <TableCell className="text-xs">
                        <div className="space-y-1">
                          {stream.automatedTasks.length > 0 && (
                            <div>
                              <p className="font-semibold text-gray-600 dark:text-gray-400">
                                Tasks:
                              </p>
                              <ul className="space-y-0.5">
                                {stream.automatedTasks.map((task) => (
                                  <li key={task} className="text-gray-700 dark:text-gray-300">
                                    • {task}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {stream.cronJobs.length > 0 && (
                            <div className="mt-2">
                              <p className="font-semibold text-gray-600 dark:text-gray-400">
                                Cron:
                              </p>
                              <ul className="space-y-0.5">
                                {stream.cronJobs.map((job) => (
                                  <li key={job} className="text-gray-700 dark:text-gray-300">
                                    → {job}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded ${
                            stream.status === "active"
                              ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200"
                              : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {stream.status === "active" ? "Active" : "On-Demand"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        <Card className="bg-gray-50 dark:bg-gray-800">
          <CardHeader>
            <CardTitle className="text-base">Overview</CardTitle>
          </CardHeader>
          <CardContent className="text-xs sm:text-sm text-muted-foreground">
            <p>
              Three active work streams: <strong>Lagosta</strong> (orchestration) runs the main
              system, <strong>Gym</strong> handles personalized fitness coaching with Oura
              integration, and <strong>Newsletter</strong> manages AI/emerging tech content
              operations with RSS monitoring and Substack drafts.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
