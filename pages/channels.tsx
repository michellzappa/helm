import Layout from "@/components/Layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MessageCircle, Users, Send, MessageSquare, Radio } from "lucide-react";
import { useState, useEffect } from "react";
import { useCounts } from "@/lib/counts-context";
import type { Channel } from "@/lib/types";

function ChannelIcon({ id }: { id: string }) {
  const cls = "h-5 w-5 text-muted-foreground shrink-0";
  if (id === "telegram") return <Send className={cls} />;
  if (id === "whatsapp") return <MessageSquare className={cls} />;
  return <Radio className={cls} />;
}
const POLICY_COLORS: Record<string, string> = {
  allowlist: "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200",
  pairing:   "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200",
  deny:      "bg-red-50 dark:bg-red-900 text-red-600 dark:text-red-300",
  allow:     "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
};

export default function ChannelsPage() {
  const { counts } = useCounts();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/channels")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setChannels(d); else setError(d.error); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  return (
    <Layout>
      <div className="space-y-6 sm:space-y-8">
        <div>
          <h1 className="text-2xl sm:text-4xl font-bold">Channels</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">{counts?.channels ?? "…"} configured</p>
        </div>

        {error && <div className="bg-red-50 dark:bg-red-900 border border-red-200 text-red-700 px-4 py-3 rounded">Error: {error}</div>}
        {loading ? <p className="text-muted-foreground">Loading…</p> : (
          <div className="space-y-6">
            {channels.map(ch => (
              <div key={ch.id} className="rounded-lg border overflow-hidden">
                {/* Channel header */}
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b">
                  <div className="flex items-center gap-3">
                    <ChannelIcon id={ch.id} />
                    <div>
                      <span className="font-semibold text-sm">{ch.name}</span>
                      {ch.streaming && (
                        <span className="ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-200">streaming</span>
                      )}
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded ${ch.enabled ? "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300" : "bg-red-50 text-red-600"}`}>
                    {ch.enabled ? "Enabled" : "Disabled"}
                  </span>
                </div>

                {/* Policies */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-gray-100 dark:bg-gray-700">
                  {[
                    { label: "DM Policy",    value: ch.dmPolicy },
                    { label: "Group Policy", value: ch.groupPolicy ?? "—" },
                    { label: "Groups",       value: String(ch.groups.length) },
                    { label: "Allow From",   value: ch.allowFrom.length === 1 && ch.allowFrom[0] === "*" ? "everyone" : String(ch.allowFrom.length) + " entries" },
                  ].map(item => (
                    <div key={item.label} className="bg-white dark:bg-gray-900 px-4 py-3">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">{item.label}</div>
                      <div className="mt-1">
                        {item.label.includes("Policy") ? (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded ${POLICY_COLORS[item.value] ?? POLICY_COLORS.allow}`}>{item.value}</span>
                        ) : (
                          <span className="text-sm font-medium">{item.value}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Groups */}
                {ch.groups.length > 0 && (
                  <div>
                    <button
                      className="w-full text-left px-4 py-2 text-xs text-muted-foreground hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-1 border-t"
                      onClick={() => setExpanded(expanded === ch.id ? null : ch.id)}
                    >
                      <Users className="h-3 w-3" />
                      {expanded === ch.id ? "Hide" : "Show"} {ch.groups.length} group{ch.groups.length !== 1 ? "s" : ""}
                    </button>
                    {expanded === ch.id && (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Group ID</TableHead>
                            <TableHead>Require Mention</TableHead>
                            <TableHead>Enabled</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {ch.groups.map(g => (
                            <TableRow key={g.id}>
                              <TableCell className="font-mono text-xs">{g.id}</TableCell>
                              <TableCell>{g.requireMention ? "Yes" : "No"}</TableCell>
                              <TableCell>{g.enabled === false ? "No" : "Yes"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
