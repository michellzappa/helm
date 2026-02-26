import { PageInfo } from "@/components/PageInfo";
import Layout from "@/components/Layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAutoRefresh } from "@/lib/settings-context";
import { useState } from "react";
import { Activity, Heart, Clock, Play } from "lucide-react";
import type { HeartbeatData } from "./api/heartbeats";

function fmtAge(ts: number): string {
  const diff = Date.now() - ts;
  const secs = Math.floor(diff / 1000);
  const mins = Math.floor(secs / 60);
  const hours = Math.floor(mins / 60);
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return `${secs}s ago`;
}

function statusColor(status: string): { className?: string; style?: React.CSSProperties } {
  switch (status) {
    case "ok":
    case "success":
      return {
        style: {
          backgroundColor: "color-mix(in srgb, var(--theme-accent) 15%, transparent)",
          color: "var(--theme-accent)",
        },
      };
    case "skipped":
      return {
        style: {
          backgroundColor: "color-mix(in srgb, var(--theme-accent) 10%, transparent)",
          color: "var(--theme-accent)",
          opacity: 0.7,
        },
      };
    case "error":
    case "failed":
      return {
        style: {
          backgroundColor: "color-mix(in srgb, var(--theme-accent) 8%, transparent)",
          color: "var(--theme-accent)",
          opacity: 0.5,
        },
      };
    default:
      return { className: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400" };
  }
}

export default function HeartbeatsPage() {
  const [data, setData] = useState<HeartbeatData | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);

  const fetchHeartbeat = async () => {
    try {
      const r = await fetch("/api/heartbeats");
      const d = await r.json();
      setData(d.error ? null : d);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const triggerNow = async () => {
    setTriggering(true);
    try {
      // Trigger via system event
      await fetch("/api/trigger-heartbeat", { method: "POST" });
      // Wait a moment then refresh
      await new Promise(r => setTimeout(r, 1000));
      await fetchHeartbeat();
    } finally {
      setTriggering(false);
    }
  };

  useAutoRefresh(fetchHeartbeat);

  return (
    <Layout>
      <div className="space-y-6 sm:space-y-8">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-4xl font-bold">Heartbeats</h1>
            <PageInfo page="heartbeats" />
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Periodic health checks and system polling
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Heart className="h-4 w-4 text-muted-foreground" />
                Last Check
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xl sm:text-2xl font-semibold tabular-nums">
                {loading ? "…" : data ? fmtAge(data.ts) : "—"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                Status
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xl sm:text-2xl font-semibold">
                {loading ? "…" : data ? (() => {
                  const statusStyle = statusColor(data.status);
                  return (
                    <span className={`text-xs px-2 py-1 rounded font-medium ${statusStyle.className ?? ""}`} style={statusStyle.style}>
                      {data.status}
                    </span>
                  );
                })() : "—"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Duration
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xl sm:text-2xl font-semibold tabular-nums">
                {loading ? "…" : data ? `${data.durationMs}ms` : "—"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Action</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Button
                size="sm"
                variant="outline"
                onClick={triggerNow}
                disabled={triggering}
                className="w-full"
              >
                <Play className="h-4 w-4 mr-1" />
                {triggering ? "Running…" : "Trigger Now"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* History Table */}
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="text-right">Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : !data ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No heartbeat data available
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow>
                  <TableCell className="font-mono text-xs">
                    {new Date(data.ts).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const statusStyle = statusColor(data.status);
                      return (
                        <span className={`text-xs px-2 py-1 rounded font-medium ${statusStyle.className ?? ""}`} style={statusStyle.style}>
                          {data.status}
                        </span>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {data.reason || "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {data.durationMs}ms
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </Layout>
  );
}
