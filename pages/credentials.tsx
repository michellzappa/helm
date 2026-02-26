import Layout from "@/components/Layout";
import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SortableTableHead } from "@/components/SortableTableHead";
import { sortData, getNextSortDirection, type SortDirection } from "@/lib/sorting";
import { Database, BarChart2, ShoppingBag, Globe, Cpu, Radio, Settings, KeyRound } from "lucide-react";
import type { Credential } from "@/lib/types";

// Icon map — any category not listed falls back to Settings icon
const CATEGORY_ICON: Record<string, React.ElementType> = {
  Databases:    Database,
  Analytics:    BarChart2,
  Commerce:     ShoppingBag,
  Google:       Globe,
  "AI Tools":   Cpu,
  Channels:     Radio,
  System:       Settings,
  Credentials:  KeyRound,
};

const STATUS_STYLE: Record<string, string> = {
  ok:      "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
  empty:   "bg-red-50 dark:bg-red-900 text-red-600 dark:text-red-300",
  missing: "bg-red-50 dark:bg-red-900 text-red-600 dark:text-red-300",
};
const STATUS_LABEL: Record<string, string> = {
  ok:      "Connected",
  empty:   "Empty",
  missing: "Missing",
};

export default function CredentialsPage() {
  const [creds, setCreds] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string | null>("name");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");

  useEffect(() => {
    fetch("/api/credentials")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setCreds(d); else setError(d.error); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const okCount = creds.filter(c => c.status === "ok").length;
  const tableCreds = creds.map((cred) => ({
    ...cred,
    statusSort: STATUS_LABEL[cred.status],
  }));
  const sortedCreds = sortData(tableCreds, sortBy, sortDir);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDir(getNextSortDirection(sortDir));
    } else {
      setSortBy(column);
      setSortDir("asc");
    }
  };

  return (
    <Layout>
      <div className="space-y-6 sm:space-y-8">
        <div>
          <h1 className="text-2xl sm:text-4xl font-bold">Credentials</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {loading ? "Loading…" : `${okCount} of ${creds.length} connected`}
          </p>
        </div>

        {error && <div className="bg-red-50 dark:bg-red-900 border border-red-200 text-red-700 px-4 py-3 rounded">Error: {error}</div>}

        {loading ? (
          <p className="text-muted-foreground">Loading credentials...</p>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer">
                    <SortableTableHead
                      column="name"
                      label="Credential"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="cursor-pointer">
                    <SortableTableHead
                      column="category"
                      label="Category"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="cursor-pointer">
                    <SortableTableHead
                      column="file"
                      label="File"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="cursor-pointer">
                    <SortableTableHead
                      column="keys"
                      label="Keys"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="cursor-pointer">
                    <SortableTableHead
                      column="statusSort"
                      label="Status"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedCreds.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No credentials found
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedCreds.map((cred) => {
                    const Icon = CATEGORY_ICON[cred.category] ?? Settings;
                    return (
                      <TableRow key={cred.id}>
                        <TableCell className="font-medium">
                          <div className="min-w-0">
                            <div className="truncate">{cred.name}</div>
                            {cred.note && (
                              <div className="text-xs text-muted-foreground truncate">{cred.note}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{cred.category}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-[10px] font-mono text-muted-foreground">
                          {cred.file}
                        </TableCell>
                        <TableCell>
                          {cred.keys !== undefined && cred.status === "ok" ? (
                            <span className="text-xs text-muted-foreground">
                              {cred.keys} key{cred.keys !== 1 ? "s" : ""}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={`text-xs font-medium px-2 py-1 rounded ${STATUS_STYLE[cred.status]}`}>
                            {STATUS_LABEL[cred.status]}
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
      </div>
    </Layout>
  );
}
