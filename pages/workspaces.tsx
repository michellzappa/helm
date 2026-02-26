import { PageInfo } from "@/components/PageInfo";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SortableTableHead } from "@/components/SortableTableHead";
import { sortData, getNextSortDirection, type SortDirection } from "@/lib/sorting";
import { useState, useEffect } from "react";
import { useCounts } from "@/lib/counts-context";
import { Folder, Code, BookOpen, Database } from "lucide-react";

interface Workspace {
  id: string;
  name: string;
  path: string;
  type: "main" | "project" | "skill" | "session";
  description: string;
  itemCount?: number;
  status: "active" | "archived";
}

const TYPE_ICONS = {
  main: Folder,
  project: Code,
  skill: BookOpen,
  session: Database,
};

const TYPE_LABELS = {
  main: "Main",
  project: "Project",
  skill: "Skill",
  session: "Session",
};

const TYPE_COLORS = {
  main: "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-200",
  project: "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200",
  skill: "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200",
  session: "bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-200",
};

export default function WorkspacesPage() {
  const { counts } = useCounts();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string | null>("name");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");

  useEffect(() => {
    fetch("/api/workspaces")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setWorkspaces(data);
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

  const sortedWorkspaces = sortData(workspaces, sortBy, sortDir);

  const shortenPath = (path: string) => {
    return path.replace(process.env.HOME || "", "~");
  };

  return (
    <Layout>
      <div className="space-y-6 sm:space-y-8">
        <div>
            <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-4xl font-bold">Workspaces</h1>
              <PageInfo page="workspaces" />
            </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {counts?.workspaces ?? "…"} workspaces and projects
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded">
            Error: {error}
          </div>
        )}

        {loading ? (
          <p className="text-muted-foreground">Loading workspaces...</p>
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
                      column="type"
                      label="Type"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="cursor-pointer">
                    <SortableTableHead
                      column="itemCount"
                      label="Items"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead>Path</TableHead>
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
                {workspaces.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No workspaces found
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedWorkspaces.map((workspace) => {
                    const Icon = TYPE_ICONS[workspace.type];
                    return (
                      <TableRow key={workspace.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span>{workspace.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`text-xs font-medium px-2 py-1 rounded ${
                              TYPE_COLORS[workspace.type]
                            }`}
                          >
                            {TYPE_LABELS[workspace.type]}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm max-w-md">
                          {workspace.description}
                        </TableCell>
                        <TableCell className="text-sm">
                          {workspace.itemCount !== undefined ? (
                            <span className="font-mono text-gray-600 dark:text-gray-400">
                              {workspace.itemCount}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-gray-600 dark:text-gray-400 max-w-xs">
                          <code className="bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded">
                            {shortenPath(workspace.path)}
                          </code>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`text-xs font-medium px-2 py-1 rounded ${
                              workspace.status === "active"
                                ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200"
                                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                            }`}
                          >
                            {workspace.status === "active" ? "Active" : "Archived"}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}

        <Card className="bg-gray-50 dark:bg-gray-800">
          <CardHeader>
            <CardTitle className="text-base">About Workspaces</CardTitle>
          </CardHeader>
          <CardContent className="text-xs sm:text-sm text-muted-foreground space-y-2">
            <p>
              <strong>Main Workspace:</strong> The central OpenClaw workspace containing system
              files, memory, and configuration.
            </p>
            <p>
              <strong>Projects:</strong> Integrated applications like Helm, memory
              banks, and data repositories.
            </p>
            <p>
              <strong>Skills:</strong> Installed tools and extensions that extend OpenClaw
              capabilities.
            </p>
            <p>
              <strong>Sessions:</strong> Isolated work contexts for sub-agents and specialized
              tasks.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
