import { PageInfo } from "@/components/PageInfo";
import Layout from "@/components/Layout";
import { SortableTableHead } from "@/components/SortableTableHead";
import { TableFilter } from "@/components/TableFilter";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MessageSquare, Radio, Send, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useCounts } from "@/lib/counts-context";
import { getNextSortDirection, sortData, type SortDirection } from "@/lib/sorting";
import type { Channel } from "@/lib/types";

function ChannelIcon({ id }: { id: string }) {
  const cls = "h-5 w-5 text-muted-foreground shrink-0";
  if (id === "telegram") return <Send className={cls} />;
  if (id === "whatsapp") return <MessageSquare className={cls} />;
  return <Radio className={cls} />;
}

const POLICY_COLORS: Record<string, { className?: string; style?: React.CSSProperties }> = {
  allowlist: {
    style: {
      backgroundColor: "color-mix(in srgb, var(--theme-accent) 15%, transparent)",
      color: "var(--theme-accent)",
    },
  },
  pairing: {
    style: {
      backgroundColor: "color-mix(in srgb, var(--theme-accent) 10%, transparent)",
      color: "var(--theme-accent)",
      opacity: 0.7,
    },
  },
  deny: {
    style: {
      backgroundColor: "color-mix(in srgb, var(--theme-accent) 8%, transparent)",
      color: "var(--theme-accent)",
      opacity: 0.5,
    },
  },
  allow: { className: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400" },
};

export default function ChannelsPage() {
  const { counts } = useCounts();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string | null>("name");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");
  const [filterQuery, setFilterQuery] = useState("");

  useEffect(() => {
    fetch("/api/channels")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) {
          setChannels(d);
          setError(null);
        } else {
          setError(d.error || "Failed to load channels");
          setChannels([]);
        }
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setChannels([]);
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

  const tableChannels = channels.map((ch) => ({
    ...ch,
    statusSort: ch.enabled ? 1 : 0,
    groupCount: ch.groups.length,
    groupPolicySort: ch.groupPolicy ?? "",
    allowFromCount: ch.allowFrom.length === 1 && ch.allowFrom[0] === "*" ? Number.POSITIVE_INFINITY : ch.allowFrom.length,
    streamingSort: ch.streaming ? 1 : 0,
  }));

  const q = filterQuery.trim().toLowerCase();
  const filteredChannels = tableChannels.filter((ch) => {
    if (!q) return true;
    const status = ch.enabled ? "enabled" : "disabled";
    return [ch.id, status].some((value) => value.toLowerCase().includes(q));
  });
  const sortedChannels = sortData(filteredChannels, sortBy, sortDir);

  return (
    <Layout>
      <div className="space-y-6 sm:space-y-8">
        <div>
            <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-4xl font-bold">Channels</h1>
              <PageInfo page="channels" />
            </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">{counts?.channels ?? "…"} configured</p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded">
            Error: {error}
          </div>
        )}

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : (
          <div className="space-y-3">
            <TableFilter
              placeholder="Filter channels..."
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
                      label="Channel"
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
                  <TableHead className="cursor-pointer">
                    <SortableTableHead
                      column="dmPolicy"
                      label="DM Policy"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="cursor-pointer">
                    <SortableTableHead
                      column="groupPolicySort"
                      label="Group Policy"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="cursor-pointer">
                    <SortableTableHead
                      column="groupCount"
                      label="Groups"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="cursor-pointer">
                    <SortableTableHead
                      column="allowFromCount"
                      label="Allow From"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="cursor-pointer">
                    <SortableTableHead
                      column="streamingSort"
                      label="Streaming"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                  </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedChannels.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No channels found
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedChannels.map((ch) => {
                      const allowFromText = ch.allowFrom.length === 1 && ch.allowFrom[0] === "*"
                        ? "everyone"
                        : `${ch.allowFrom.length} entries`;

                      return [
                        <TableRow key={ch.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <ChannelIcon id={ch.id} />
                              <div className="min-w-0">
                                <div className="truncate">{ch.name}</div>
                                <div className="text-xs text-muted-foreground font-mono truncate">{ch.id}</div>
                                {ch.id === "discord" && (
                                  <div className="text-[10px] text-muted-foreground truncate">
                                    Thread lifecycle: idle {ch.sessionRouting?.discordThreadLifecycle?.idleHours ?? 24}h
                                    {typeof ch.sessionRouting?.discordThreadLifecycle?.maxAgeHours === "number"
                                      ? ` · max ${ch.sessionRouting.discordThreadLifecycle.maxAgeHours}h`
                                      : ""}
                                  </div>
                                )}
                                {ch.id === "telegram" && (
                                  <div className="text-[10px] text-muted-foreground truncate">
                                    Topic-aware sessions:{" "}
                                    {ch.sessionRouting?.telegramTopicAware === true
                                      ? "enabled"
                                      : ch.sessionRouting?.telegramTopicAware === false
                                        ? "disabled"
                                        : "not configured"}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const statusStyle = ch.enabled
                                ? {
                                    backgroundColor: "color-mix(in srgb, var(--theme-accent) 10%, transparent)",
                                    color: "var(--theme-accent)",
                                    opacity: 0.7,
                                  }
                                : {
                                    backgroundColor: "color-mix(in srgb, var(--theme-accent) 8%, transparent)",
                                    color: "var(--theme-accent)",
                                    opacity: 0.5,
                                  };
                              return (
                            <span
                              className="text-xs font-medium px-2 py-1 rounded"
                              style={statusStyle}
                            >
                              {ch.enabled ? "Enabled" : "Disabled"}
                            </span>
                              );
                            })()}
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const policy = POLICY_COLORS[ch.dmPolicy] ?? POLICY_COLORS.allow;
                              return (
                              <span className={`text-xs font-medium px-2 py-0.5 rounded ${policy.className ?? ""}`} style={policy.style}>
                              {ch.dmPolicy}
                            </span>
                              );
                            })()}
                          </TableCell>
                          <TableCell>
                            {ch.groupPolicy ? (
                              (() => {
                                const policy = POLICY_COLORS[ch.groupPolicy] ?? POLICY_COLORS.allow;
                                return (
                              <span className={`text-xs font-medium px-2 py-0.5 rounded ${policy.className ?? ""}`} style={policy.style}>
                                {ch.groupPolicy}
                              </span>
                                );
                              })()
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {ch.groups.length > 0 ? (
                              <button
                                className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                                onClick={() => setExpanded(expanded === ch.id ? null : ch.id)}
                              >
                                <Users className="h-3.5 w-3.5" />
                                {expanded === ch.id ? "Hide" : "Show"} {ch.groups.length}
                              </button>
                            ) : (
                              <span className="font-mono text-sm">0</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-medium">{allowFromText}</span>
                          </TableCell>
                          <TableCell>
                            {ch.streaming ? (
                              <span className="text-xs font-medium px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-200">
                                streaming
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>,
                        expanded === ch.id && ch.groups.length > 0 ? (
                          <TableRow key={`${ch.id}-groups`}>
                            <TableCell colSpan={7} className="p-0">
                              <div className="border-t bg-muted/20">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Group ID</TableHead>
                                      <TableHead>Require Mention</TableHead>
                                      <TableHead>Enabled</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {ch.groups.map((g) => (
                                      <TableRow key={g.id}>
                                        <TableCell className="font-mono text-xs">{g.id}</TableCell>
                                        <TableCell>{g.requireMention ? "Yes" : "No"}</TableCell>
                                        <TableCell>{g.enabled === false ? "No" : "Yes"}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : null,
                      ];
                    })
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
