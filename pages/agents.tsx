import Layout from "@/components/Layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Bot, FolderOpen, Radio, MessageSquare, Layers } from "lucide-react";
import { useState, useEffect } from "react";
import { useCounts } from "@/lib/counts-context";
import type { OcAgent } from "./api/oc-agents";

function AgentsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {[1, 2].map(i => (
        <div key={i} className="rounded-xl border border-border p-5 space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <Skeleton className="h-3 w-48" />
          <Skeleton className="h-3 w-36" />
        </div>
      ))}
    </div>
  );
}

function shortPath(p: string) {
  return p.replace(/^\/Users\/[^/]+/, "~");
}

function BindingPill({ b }: { b: OcAgent["bindings"][number] }) {
  const label = [
    b.channel,
    b.accountId && b.accountId !== "default" ? `(${b.accountId})` : "",
    b.peer ? `→ ${b.peer.kind} ${b.peer.id}` : "",
  ].filter(Boolean).join(" ");

  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 px-2 py-0.5 rounded-full">
      <Radio className="h-3 w-3" />
      {label}
    </span>
  );
}

export default function AgentsPage() {
  const { counts } = useCounts();
  const [agents, setAgents] = useState<OcAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<OcAgent | null>(null);

  useEffect(() => {
    fetch("/api/oc-agents")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setAgents(d); else setError(d.error); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  return (
    <Layout>
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-4 sm:p-8 space-y-6 sm:space-y-8">
        <div>
          <h1 className="text-2xl sm:text-4xl font-bold">Agents</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {loading
              ? <Skeleton className="inline-block h-4 w-40" />
              : `${counts?.agents ?? "…"} configured agents`}
          </p>
        </div>

        {error && <div className="bg-red-50 dark:bg-red-900 border border-red-200 text-red-700 dark:text-red-200 px-4 py-3 rounded">Error: {error}</div>}

        {loading ? <AgentsSkeleton /> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {agents.map(agent => (
              <button
                key={agent.id}
                onClick={() => setSelected(agent)}
                className="text-left rounded-xl border border-border p-5 hover:border-gray-400 dark:hover:border-gray-600 hover:shadow-sm transition-all space-y-4"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Bot className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm flex items-center gap-2">
                        {agent.name}
                        {agent.isDefault && (
                          <span className="text-[10px] font-medium bg-gray-100 dark:bg-gray-800 text-muted-foreground px-1.5 py-0.5 rounded">
                            default
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">{agent.id}</div>
                    </div>
                  </div>
                  {agent.sessionCount > 0 && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0">
                      <MessageSquare className="h-3 w-3" />
                      {agent.sessionCount}
                    </span>
                  )}
                </div>

                {/* Model */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Layers className="h-3.5 w-3.5 shrink-0" />
                  <span className="font-mono truncate">{agent.model}</span>
                </div>

                {/* Workspace */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <FolderOpen className="h-3.5 w-3.5 shrink-0" />
                  <span className="font-mono truncate">{shortPath(agent.workspace)}</span>
                </div>

                {/* Bindings */}
                {agent.bindings.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {agent.bindings.map((b, i) => <BindingPill key={i} b={b} />)}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Catch-all (no explicit bindings)</p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Detail sheet */}
      <Sheet open={!!selected} onOpenChange={open => { if (!open) setSelected(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          {selected && (
            <>
              <SheetHeader className="pb-4">
                <SheetTitle className="flex items-center gap-3 pr-8">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                    <Bot className="h-4 w-4 text-muted-foreground" />
                  </div>
                  {selected.name}
                  {selected.isDefault && (
                    <span className="text-xs font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded">default</span>
                  )}
                </SheetTitle>
              </SheetHeader>

              <div className="px-6 pb-6 space-y-5">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Agent ID</p>
                  <p className="text-sm font-mono">{selected.id}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Model</p>
                  <p className="text-sm font-mono">{selected.model}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Workspace</p>
                  <p className="text-xs font-mono bg-muted px-3 py-2 rounded break-all">{shortPath(selected.workspace)}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Agent Dir</p>
                  <p className="text-xs font-mono bg-muted px-3 py-2 rounded break-all">{shortPath(selected.agentDir)}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    Sessions ({selected.sessionCount})
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selected.sessionCount > 0
                      ? `${selected.sessionCount} session file${selected.sessionCount !== 1 ? "s" : ""} on disk`
                      : "No sessions yet"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Bindings ({selected.bindings.length})
                  </p>
                  {selected.bindings.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">Catch-all — receives unmatched inbound messages</p>
                  ) : (
                    <div className="space-y-2">
                      {selected.bindings.map((b, i) => (
                        <div key={i} className="text-xs bg-muted rounded px-3 py-2 space-y-0.5">
                          <div className="font-medium flex items-center gap-1.5">
                            <Radio className="h-3 w-3" />{b.channel}
                            {b.accountId && <span className="text-muted-foreground">· {b.accountId}</span>}
                          </div>
                          {b.peer && (
                            <div className="text-muted-foreground pl-4.5">
                              {b.peer.kind}: <span className="font-mono">{b.peer.id}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </Layout>
  );
}
