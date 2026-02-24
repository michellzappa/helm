import Layout from "@/components/Layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { SortableTableHead } from "@/components/SortableTableHead";
import { sortData, getNextSortDirection, type SortDirection } from "@/lib/sorting";
import { useState } from "react";

interface Task {
  id: string;
  title: string;
  status: "todo" | "in-progress" | "done" | "blocked";
  assignee: "Michell" | "Lagosta";
  dueDate?: string;
}

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState("");
  const [sortBy, setSortBy] = useState<string | null>("title");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");

  const getStatusColor = (status: Task["status"]) => {
    const colors = {
      todo: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400",
      "in-progress": "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200",
      done: "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200",
      blocked: "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200",
    };
    return colors[status];
  };

  const getStatusLabel = (status: Task["status"]) => {
    return status.charAt(0).toUpperCase() + status.slice(1).replace("-", " ");
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
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-4 sm:p-8 space-y-6 sm:space-y-8">
        <div>
          <h1 className="text-2xl sm:text-4xl font-bold">Tasks</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {tasks.length} total tasks
          </p>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Add new task..."
            className="flex-1 px-3 py-2 border border-input rounded-lg bg-gray-50 dark:bg-gray-800 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newTask.trim()) {
                const task: Task = {
                  id: Math.random().toString(),
                  title: newTask,
                  status: "todo",
                  assignee: "Michell",
                };
                setTasks([...tasks, task]);
                setNewTask("");
              }
            }}
          />
          <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">
            <Plus className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer">
                  <SortableTableHead
                    column="title"
                    label="Title"
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
                <TableHead className="cursor-pointer">
                  <SortableTableHead
                    column="assignee"
                    label="Assignee"
                    sortBy={sortBy}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                </TableHead>
                <TableHead className="cursor-pointer">
                  <SortableTableHead
                    column="dueDate"
                    label="Due Date"
                    sortBy={sortBy}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                </TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No tasks yet
                  </TableCell>
                </TableRow>
              ) : (
                sortedTasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">{task.title}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-1 rounded ${getStatusColor(task.status)}`}>
                        {getStatusLabel(task.status)}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm text-muted-foreground">
                      {task.assignee}
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm text-muted-foreground">
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <button
                        onClick={() => setTasks(tasks.filter((t) => t.id !== task.id))}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition"
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-red-600" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </Layout>
  );
}
