import Layout from "@/components/Layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, FileText, Book, Tag, Settings, Calendar } from "lucide-react";
import { SortableTableHead } from "@/components/SortableTableHead";
import { sortData, getNextSortDirection, type SortDirection } from "@/lib/sorting";
import { useState, useEffect } from "react";
import { useCounts } from "@/lib/counts-context";

interface MemoryFile {
  name: string;
  path: string;
  content: string;
  size: number;
  category: string;
  lastModifiedMs: number;
}

const CATEGORY_ICON: Record<string, React.ReactNode> = {
  System: <Settings className="h-3.5 w-3.5" />,
  Daily:  <Calendar className="h-3.5 w-3.5" />,
  Topic:  <Tag className="h-3.5 w-3.5" />,
  Skill:  <Book className="h-3.5 w-3.5" />,
};
const CATEGORY_COLOR: Record<string, string> = {
  System: "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-200",
  Daily:  "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200",
  Topic:  "bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-200",
  Skill:  "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200",
  Other:  "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
};

function formatDate(ms: number): string {
  if (!ms) return "—";
  const d = new Date(ms);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: diffDays > 365 ? "numeric" : undefined });
}

function MemorySkeleton() {
  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Last Updated</TableHead>
            <TableHead className="text-right">Size</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 8 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-4 w-48" /></TableCell>
              <TableCell><Skeleton className="h-4 w-16" /></TableCell>
              <TableCell><Skeleton className="h-4 w-20" /></TableCell>
              <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function Memory() {
  const { counts } = useCounts();
  const [search, setSearch] = useState("");
  const [memories, setMemories] = useState<MemoryFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<MemoryFile | null>(null);
  const [sortBy, setSortBy] = useState<string | null>("lastModifiedMs");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");

  useEffect(() => {
    fetch("/api/memories")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setMemories(d); else setError(d.error); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const filtered = memories.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.content.toLowerCase().includes(search.toLowerCase())
  );

  const handleSort = (col: string) => {
    if (sortBy === col) setSortDir(getNextSortDirection(sortDir));
    else { setSortBy(col); setSortDir(col === "lastModifiedMs" ? "desc" : "asc"); }
  };

  const sorted = sortData(filtered, sortBy, sortDir);

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-4xl font-bold">Memory Bank</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {loading ? <Skeleton className="inline-block h-4 w-32" /> : `${counts?.memory ?? "…"} files across all knowledge`}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900 border border-red-200 text-red-700 dark:text-red-200 px-4 py-3 rounded">
            Error: {error}
          </div>
        )}

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search all memories…"
            className="w-full pl-10 pr-4 py-2 border border-input rounded-md bg-gray-50 dark:bg-gray-800 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading ? <MemorySkeleton /> : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead><SortableTableHead column="name"           label="Name"         sortBy={sortBy} sortDir={sortDir} onSort={handleSort} /></TableHead>
                  <TableHead><SortableTableHead column="category"       label="Category"     sortBy={sortBy} sortDir={sortDir} onSort={handleSort} /></TableHead>
                  <TableHead><SortableTableHead column="lastModifiedMs" label="Last Updated" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} /></TableHead>
                  <TableHead className="text-right"><SortableTableHead column="size" label="Size" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map(memory => (
                  <TableRow
                    key={memory.path}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={() => setSelected(memory)}
                  >
                    <TableCell className="font-medium">{memory.name}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded font-medium ${CATEGORY_COLOR[memory.category] ?? CATEGORY_COLOR.Other}`}>
                        {CATEGORY_ICON[memory.category] ?? <FileText className="h-3.5 w-3.5" />}
                        {memory.category}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(memory.lastModifiedMs)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {Math.round(memory.size / 1024)} KB
                    </TableCell>
                  </TableRow>
                ))}
                {sorted.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">No memories found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={open => { if (!open) setSelected(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-2">
              {selected && (CATEGORY_ICON[selected.category] ?? <FileText className="h-4 w-4" />)}
              {selected?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6">
            <pre className="text-xs bg-gray-50 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto font-mono border border-gray-200 dark:border-gray-700 whitespace-pre-wrap break-words">
              <code>{selected?.content}</code>
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
