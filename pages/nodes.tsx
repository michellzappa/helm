import Layout from "@/components/Layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Laptop, Smartphone, Terminal, Server } from "lucide-react";
import { SortableTableHead } from "@/components/SortableTableHead";
import { sortData, getNextSortDirection, type SortDirection } from "@/lib/sorting";
import { useState, useEffect } from "react";
import { useCounts } from "@/lib/counts-context";
import type { PairedNode } from "./api/nodes";

function timeAgo(ms: number) {
  if (!ms) return "—";
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return "just now";
}

function clientIcon(mode: string) {
  const cls = "h-4 w-4 text-muted-foreground shrink-0";
  if (mode === "node") return <Server className={cls} />;
  if (mode === "cli") return <Terminal className={cls} />;
  if (mode.includes("ios") || mode.includes("android")) return <Smartphone className={cls} />;
  return <Laptop className={cls} />;
}

function NodesSkeleton() {
  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Device</TableHead><TableHead>Platform</TableHead>
            <TableHead>Mode</TableHead><TableHead>Role</TableHead><TableHead>Last seen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              {[40, 32, 20, 24, 20].map((w, j) => (
                <TableCell key={j}><Skeleton className={`h-4 w-${w}`} /></TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function NodesPage() {
  const { counts } = useCounts();
  const [nodes, setNodes] = useState<PairedNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string | null>("lastUsedAtMs");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");

  useEffect(() => {
    fetch("/api/nodes")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setNodes(d); else setError(d.error); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const handleSort = (col: string) => {
    if (sortBy === col) setSortDir(getNextSortDirection(sortDir));
    else { setSortBy(col); setSortDir("asc"); }
  };

  const sorted = sortData(nodes, sortBy, sortDir);

  return (
    <Layout>
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-4 sm:p-8 space-y-6 sm:space-y-8">
        <div>
          <h1 className="text-2xl sm:text-4xl font-bold">Nodes</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {loading ? <Skeleton className="inline-block h-4 w-32" /> : `${counts?.nodes ?? "…"} paired devices`}
          </p>
        </div>

        {error && <div className="bg-red-50 dark:bg-red-900 border border-red-200 text-red-700 dark:text-red-200 px-4 py-3 rounded">Error: {error}</div>}

        {loading ? <NodesSkeleton /> : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead><SortableTableHead column="displayName" label="Device" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} /></TableHead>
                  <TableHead><SortableTableHead column="platform" label="Platform" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} /></TableHead>
                  <TableHead><SortableTableHead column="clientMode" label="Mode" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} /></TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead><SortableTableHead column="lastUsedAtMs" label="Last seen" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No paired nodes</TableCell></TableRow>
                ) : sorted.map(node => (
                  <TableRow key={node.deviceId} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {clientIcon(node.clientMode)}
                        {node.displayName}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{node.platform}</TableCell>
                    <TableCell>
                      <span className="text-xs font-mono bg-muted text-muted-foreground px-2 py-0.5 rounded">
                        {node.clientMode}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{node.role}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{timeAgo(node.lastUsedAtMs)}</TableCell>
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
