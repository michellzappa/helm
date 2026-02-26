import { PageInfo } from "@/components/PageInfo";
import Layout from "@/components/Layout";
import { TableFilter } from "@/components/TableFilter";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertCircle, MessageSquare, Send, Radio, Paperclip, Trash2, X } from "lucide-react";
import { useState, useEffect } from "react";
import type { QueueItem } from "@/lib/types";

function ChannelIcon({ channel }: { channel: string }) {
  const cls = "h-4 w-4 text-muted-foreground shrink-0 mt-0.5";
  if (channel === "telegram") return <Send className={cls} />;
  if (channel === "whatsapp") return <MessageSquare className={cls} />;
  return <Radio className={cls} />;
}

function timeAgo(ms: number) {
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return "just now";
}

function QueueSkeleton() {
  return (
    <div className="rounded-lg border overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="px-4 py-4 flex items-start gap-4">
          <Skeleton className="h-6 w-6 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-72" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="h-6 w-6 rounded" />
        </div>
      ))}
    </div>
  );
}

async function deleteItem(id: string) {
  const r = await fetch(`/api/delivery-queue-delete?id=${id}`, { method: "DELETE" });
  if (!r.ok) throw new Error((await r.json()).error || "Delete failed");
}
async function purgeAll() {
  const r = await fetch(`/api/delivery-queue-delete?id=__all__`, { method: "DELETE" });
  if (!r.ok) throw new Error((await r.json()).error || "Purge failed");
}

export default function DeliveryQueuePage() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Set<string>>(new Set());
  const [purging, setPurging] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");

  useEffect(() => {
    fetch("/api/delivery-queue")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setItems(d); else setError(d.error); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const handleDelete = async (id: string) => {
    setDeleting(prev => new Set(prev).add(id));
    try {
      await deleteItem(id);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDeleting(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  };

  const handlePurgeAll = async () => {
    if (!confirm(`Delete all ${items.length} stuck messages? This cannot be undone.`)) return;
    setPurging(true);
    try {
      await purgeAll();
      setItems([]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPurging(false);
    }
  };

  const q = filterQuery.trim().toLowerCase();
  const filteredItems = items.filter((item) => {
    if (!q) return true;
    return [
      item.id,
      item.channel,
      item.to,
      item.text ?? "",
      item.lastError ?? "",
    ].some((value) => value.toLowerCase().includes(q));
  });

  return (
    <Layout>
      <div className="space-y-6 sm:space-y-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">Messages</h1>
              <PageInfo page="messages" />
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              {loading
                ? <Skeleton className="inline-block h-4 w-32" />
                : items.length === 0 ? "All clear" : `${items.length} stuck message${items.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          {!loading && items.length > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-3 py-1.5 rounded-full">
                <AlertCircle className="h-3.5 w-3.5" />
                {items.length} stuck
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handlePurgeAll}
                    disabled={purging}
                    className="flex items-center gap-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 px-3 py-1.5 rounded-full transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {purging ? "Purging…" : "Purge All"}
                  </button>
                </TooltipTrigger>
                <TooltipContent>Delete all stuck messages permanently</TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900 border border-red-200 text-red-700 dark:text-red-200 px-4 py-3 rounded flex items-center justify-between">
            <span>Error: {error}</span>
            <button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
          </div>
        )}

        {loading ? <QueueSkeleton /> : items.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Delivery queue is empty</p>
          </div>
        ) : (
          <div className="space-y-3">
            <TableFilter
              placeholder="Filter delivery queue..."
              value={filterQuery}
              onChange={setFilterQuery}
            />
            {filteredItems.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground rounded-lg border">
                <p className="text-sm">No queued messages match this filter.</p>
              </div>
            ) : (
              <div className="rounded-lg border overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
                {filteredItems.map(item => (
                  <div key={item.id} className="px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-start gap-4">
                    <ChannelIcon channel={item.channel} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium capitalize">{item.channel}</span>
                        <span className="font-mono text-xs text-muted-foreground truncate max-w-[200px]">{item.to}</span>
                        {item.hasMedia && (
                          <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                            <Paperclip className="h-3 w-3" /> media
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto">
                          {timeAgo(item.enqueuedAt)} · {item.retryCount} retr{item.retryCount === 1 ? "y" : "ies"}
                        </span>
                      </div>
                      {item.text && (
                        <p className="text-xs text-muted-foreground mt-1 truncate max-w-lg">{item.text}</p>
                      )}
                      {item.lastError && (
                        <div className="mt-2 flex items-start gap-1.5 text-xs text-red-600 dark:text-red-400">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          <span className="break-all">{item.lastError}</span>
                        </div>
                      )}
                    </div>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={deleting.has(item.id)}
                          className="shrink-0 p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-muted-foreground hover:text-red-600 dark:hover:text-red-400 disabled:opacity-40 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="left">Dismiss message</TooltipContent>
                    </Tooltip>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
