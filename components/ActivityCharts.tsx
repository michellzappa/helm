import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ArrowUpDown, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ActivityData, DayBucket, ErrorEntry } from "@/pages/api/activity";

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("en", {
    month: "short",
    day: "numeric",
  });
}

function CardSkeleton({ height = "h-20" }: { height?: string }) {
  return <div className={`${height} rounded-md bg-muted animate-pulse`} />;
}

// ── Activity Histogram (30 days, stacked user/system) ──────────────────────

function ActivityHistogram({ data }: { data: ActivityData | null }) {
  const [tip, setTip] = useState<DayBucket | null>(null);

  if (!data) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Activity</CardTitle>
        </CardHeader>
        <CardContent><CardSkeleton /></CardContent>
      </Card>
    );
  }

  const { daily } = data;
  const maxVal = Math.max(...daily.map(d => d.user + d.system), 1);

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-sm font-medium">Activity</CardTitle>
          <p className="text-[11px] text-muted-foreground mt-0.5">Last 30 days</p>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground shrink-0 pt-0.5">
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-sm"
              style={{ backgroundColor: "var(--theme-accent)", opacity: 0.85 }}
            />
            User
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-sm"
              style={{ backgroundColor: "var(--theme-accent)", opacity: 0.2 }}
            />
            System
          </span>
        </div>
      </CardHeader>

      <CardContent>
        {/* Hover tooltip row */}
        <p className="h-4 mb-2 text-[11px] text-muted-foreground">
          {tip ? (
            <>
              <span className="font-medium text-foreground">{fmtDate(tip.date)}</span>
              {" — "}
              {tip.user > 0 && (
                <span style={{ color: "var(--theme-accent)" }}>
                  {tip.user} message{tip.user !== 1 ? "s" : ""}
                </span>
              )}
              {tip.user > 0 && tip.system > 0 && ", "}
              {tip.system > 0 && (
                <span className="text-muted-foreground">{tip.system} system</span>
              )}
              {tip.user === 0 && tip.system === 0 && (
                <span className="text-muted-foreground">No activity</span>
              )}
            </>
          ) : "\u00A0"}
        </p>

        {/* Bars */}
        <div className="flex items-end gap-px h-16">
          {daily.map(day => {
            const total = day.user + day.system;
            const heightPct = total > 0 ? Math.max((total / maxVal) * 100, 4) : 0;

            return (
              <div
                key={day.date}
                className="flex-1 flex flex-col rounded-sm overflow-hidden cursor-default"
                style={{
                  height: total === 0 ? "3px" : `${heightPct}%`,
                  ...(total === 0 && {
                    backgroundColor: "var(--theme-accent)",
                    opacity: 0.08,
                  }),
                }}
                onMouseEnter={() => setTip(day)}
                onMouseLeave={() => setTip(null)}
              >
                {total > 0 && (
                  <>
                    {/* User segment — top, accent */}
                    <div
                      style={{
                        height: `${(day.user / total) * 100}%`,
                        backgroundColor: "var(--theme-accent)",
                        opacity: 0.85,
                        minHeight: day.user > 0 ? 1 : 0,
                      }}
                    />
                    {/* System segment — bottom, muted */}
                    <div
                      style={{
                        height: `${(day.system / total) * 100}%`,
                        backgroundColor: "var(--theme-accent)",
                        opacity: 0.2,
                        minHeight: day.system > 0 ? 1 : 0,
                      }}
                    />
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Date labels */}
        <div className="flex justify-between mt-1.5 text-[9px] text-muted-foreground/50 select-none">
          {[0, 14, 29].map(i => (
            <span key={i}>{fmtDate(daily[i]?.date ?? "")}</span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Active Hours (24-hour distribution) ────────────────────────────────────

function HourlyChart({ data }: { data: ActivityData | null }) {
  if (!data) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Active hours</CardTitle>
        </CardHeader>
        <CardContent><CardSkeleton height="h-16" /></CardContent>
      </Card>
    );
  }

  const maxH = Math.max(...data.hourly, 1);
  const peakHour = data.hourly.indexOf(Math.max(...data.hourly));
  const peakLabel = `${peakHour.toString().padStart(2, "0")}:00`;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Active hours</CardTitle>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {data.hourly.some(h => h > 0)
            ? `Peak at ${peakLabel}`
            : "No data yet"}
        </p>
      </CardHeader>

      <CardContent>
        <div className="flex items-end gap-px h-14">
          {data.hourly.map((count, h) => {
            const pct = (count / maxH) * 100;
            const opacity = count > 0 ? 0.25 + 0.75 * (count / maxH) : 0.07;
            return (
              <div
                key={h}
                title={`${h.toString().padStart(2, "0")}:00 — ${count} events`}
                className="flex-1 rounded-sm cursor-default"
                style={{
                  height: count > 0 ? `${Math.max(pct, 4)}%` : "2px",
                  backgroundColor: "var(--theme-accent)",
                  opacity,
                }}
              />
            );
          })}
        </div>
        <div className="flex justify-between mt-1.5 text-[9px] text-muted-foreground/50 select-none">
          {["00", "06", "12", "18", "23"].map(h => (
            <span key={h}>{h}</span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Channel Breakdown + Cron health ────────────────────────────────────────

function ChannelBreakdown({ data }: { data: ActivityData | null }) {
  if (!data) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Channels</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <CardSkeleton height="h-4" />
            <CardSkeleton height="h-4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const { channels, cron } = data;
  const maxCount = Math.max(...channels.map(c => c.count), 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Channels</CardTitle>
        <p className="text-[11px] text-muted-foreground mt-0.5">Last 30 days</p>
      </CardHeader>

      <CardContent className="space-y-3">
        {channels.length === 0 ? (
          <p className="text-xs text-muted-foreground">No channel activity logged.</p>
        ) : (
          channels.map(ch => (
            <div key={ch.name} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium">{ch.label}</span>
                <span className="text-muted-foreground tabular-nums">{ch.count}</span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(ch.count / maxCount) * 100}%`,
                    backgroundColor: "var(--theme-accent)",
                    opacity: 0.8,
                    transition: "width 0.4s ease",
                  }}
                />
              </div>
            </div>
          ))
        )}

        {/* Cron health */}
        <div className="pt-2 border-t border-border">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
            Cron runs
          </p>
          <div className="flex gap-4 text-xs">
            <span className="text-green-600 dark:text-green-400 tabular-nums">
              ✓ {cron.success} ok
            </span>
            <span
              className={`tabular-nums ${
                cron.fail > 0 ? "text-red-500" : "text-muted-foreground"
              }`}
            >
              ✗ {cron.fail} failed
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Error / Warning Log ────────────────────────────────────────────────────

const PAGE_SIZE = 20;

function fmtTime(tsMs: number) {
  return new Intl.DateTimeFormat("en", {
    timeZone: "Europe/Amsterdam",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(tsMs));
}

type LevelFilter = "all" | "error" | "warn";

function LevelPill({
  label,
  active,
  count,
  color,
  onClick,
}: {
  label: string;
  active: boolean;
  count?: number;
  color?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium transition-colors ${
        active
          ? "bg-foreground text-background"
          : "bg-muted text-muted-foreground hover:bg-muted/80"
      }`}
    >
      {label}
      {count !== undefined && (
        <span
          className={`tabular-nums text-[10px] ${
            active ? "opacity-70" : color ?? ""
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function ErrorLog({ data }: { data: ActivityData | null }) {
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage]     = useState(0);
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Reset to page 0 when filters change
  function setLevel(l: LevelFilter) { setLevelFilter(l); setPage(0); setExpandedKey(null); }
  function setQuery(q: string)       { setSearch(q);      setPage(0); setExpandedKey(null); }
  function toggleSort()              { setSortAsc(v => !v); setPage(0); }

  if (!data) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Log</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <CardSkeleton height="h-4" />
          <CardSkeleton height="h-4" />
          <CardSkeleton height="h-4" />
        </CardContent>
      </Card>
    );
  }

  const { errors: allErrors } = data;
  const totalErr  = allErrors.filter(e => e.level === "error").length;
  const totalWarn = allErrors.filter(e => e.level === "warn").length;

  // ── Filter + sort pipeline ──
  const filtered = allErrors
    .filter(e => levelFilter === "all" || e.level === levelFilter)
    .filter(e => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return e.subsystem.toLowerCase().includes(q) || e.message.toLowerCase().includes(q);
    })
    .slice() // avoid mutating
    .sort((a, b) => sortAsc ? a.tsMs - b.tsMs : b.tsMs - a.tsMs);

  const total  = filtered.length;
  const pages  = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safeP  = Math.min(page, pages - 1);
  const slice  = filtered.slice(safeP * PAGE_SIZE, (safeP + 1) * PAGE_SIZE);
  const from   = total === 0 ? 0 : safeP * PAGE_SIZE + 1;
  const to     = Math.min((safeP + 1) * PAGE_SIZE, total);
  const hasFilters = levelFilter !== "all" || search.trim() !== "";

  return (
    <Card>
      {/* ── Header ── */}
      <CardHeader className="pb-3 flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-sm font-medium">Log</CardTitle>
          <p className="text-[11px] text-muted-foreground mt-0.5">Last 30 days</p>
        </div>
        <div className="flex items-center gap-2 text-[11px] shrink-0 pt-0.5">
          {totalErr > 0 && (
            <span className="font-medium text-red-500 tabular-nums">
              {totalErr} error{totalErr !== 1 ? "s" : ""}
            </span>
          )}
          {totalWarn > 0 && (
            <span className="font-medium text-amber-500 dark:text-amber-400 tabular-nums">
              {totalWarn} warning{totalWarn !== 1 ? "s" : ""}
            </span>
          )}
          {allErrors.length === 0 && (
            <span className="text-green-600 dark:text-green-400">All clear</span>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* ── Controls bar ── */}
        <div className="px-4 pb-3 flex flex-wrap items-center gap-2">
          {/* Level filter pills */}
          <div className="flex items-center gap-1">
            <LevelPill label="All"  active={levelFilter === "all"}   count={allErrors.length} onClick={() => setLevel("all")} />
            <LevelPill label="ERR"  active={levelFilter === "error"} count={totalErr}  color="text-red-500"  onClick={() => setLevel("error")} />
            <LevelPill label="WARN" active={levelFilter === "warn"}  count={totalWarn} color="text-amber-500" onClick={() => setLevel("warn")} />
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[140px]">
            <svg
              className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={e => setQuery(e.target.value)}
              placeholder="Filter by subsystem or message…"
              className="w-full rounded border border-border bg-background pl-6 pr-6 py-0.5 text-[11px] placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
            />
            {search && (
              <button
                type="button"
                onClick={() => { setQuery(""); searchRef.current?.focus(); }}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Sort toggle */}
          <button
            type="button"
            onClick={toggleSort}
            title={sortAsc ? "Oldest first — click to reverse" : "Newest first — click to reverse"}
            className="flex items-center gap-1 rounded px-2 py-0.5 text-[11px] text-muted-foreground bg-muted hover:bg-muted/80 transition-colors whitespace-nowrap"
          >
            <ArrowUpDown className="h-3 w-3" />
            {sortAsc ? "Oldest" : "Newest"}
          </button>
        </div>

        {/* ── List ── */}
        {total === 0 ? (
          <p className="px-4 pb-4 text-xs text-muted-foreground">
            {hasFilters ? "No entries match the current filters." : "No warnings or errors logged."}
          </p>
        ) : (
          <div className="divide-y divide-border border-t border-border">
            {slice.map((entry) => {
              const key = `${entry.tsMs}|${entry.message.slice(0, 40)}`;
              const isExpanded = expandedKey === key;
              return (
                <button
                  key={key}
                  type="button"
                  className="w-full text-left px-4 py-2.5 hover:bg-muted/40 transition-colors"
                  onClick={() => setExpandedKey(isExpanded ? null : key)}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    {/* Level badge */}
                    <span className={`mt-0.5 shrink-0 inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
                      entry.level === "error"
                        ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                    }`}>
                      {entry.level === "error" ? "ERR" : "WARN"}
                    </span>

                    <div className="min-w-0 flex-1">
                      {/* Time + subsystem row */}
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                          {fmtTime(entry.tsMs)}
                        </span>
                        {entry.subsystem && (
                          <span className="text-[10px] font-mono text-muted-foreground/80 truncate">
                            {entry.subsystem}
                          </span>
                        )}
                      </div>
                      {/* Message */}
                      <p className={`text-xs text-foreground leading-relaxed ${isExpanded ? "whitespace-pre-wrap break-all" : "truncate"}`}>
                        {entry.message}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* ── Pagination ── */}
        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-border">
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {from}–{to} of {total}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={safeP === 0}
                onClick={() => setPage(safeP - 1)}
                className="flex items-center gap-0.5 rounded px-2 py-1 text-[11px] text-muted-foreground bg-muted hover:bg-muted/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-3 w-3" /> Prev
              </button>
              <span className="text-[11px] text-muted-foreground tabular-nums px-1">
                {safeP + 1} / {pages}
              </span>
              <button
                type="button"
                disabled={safeP >= pages - 1}
                onClick={() => setPage(safeP + 1)}
                className="flex items-center gap-0.5 rounded px-2 py-1 text-[11px] text-muted-foreground bg-muted hover:bg-muted/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main export ─────────────────────────────────────────────────────────────

export function ActivityCharts() {
  const [data, setData] = useState<ActivityData | null>(null);

  useEffect(() => {
    fetch("/api/activity")
      .then(r => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-4">
      <ActivityHistogram data={data} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <HourlyChart data={data} />
        <ChannelBreakdown data={data} />
      </div>
      <ErrorLog data={data} />
    </div>
  );
}
