import { useEffect, useRef, useState } from "react";
import { useAutoRefresh } from "@/lib/settings-context";
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

function ChannelBreakdown({
  data,
  onCronFailClick,
}: {
  data: ActivityData | null;
  onCronFailClick?: () => void;
}) {
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
            <span className="tabular-nums" style={{ color: "var(--theme-accent)" }}>
              ✓ {cron.success} ok
            </span>
            {cron.fail > 0 && onCronFailClick ? (
              <button
                type="button"
                onClick={onCronFailClick}
                title="Show cron errors in log"
                className="tabular-nums font-medium underline underline-offset-2 decoration-dotted transition-opacity hover:opacity-70"
                style={{ color: "var(--theme-accent)" }}
              >
                ✗ {cron.fail} failed
              </button>
            ) : (
              <span className={`tabular-nums ${cron.fail > 0 ? "" : "text-muted-foreground"}`}
                style={cron.fail > 0 ? { color: "var(--theme-accent)" } : undefined}>
                ✗ {cron.fail} failed
              </span>
            )}
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

function fmtRelative(tsMs: number): string {
  const s = Math.floor((Date.now() - tsMs) / 1000);
  if (s < 60)   return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60)   return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)   return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30)   return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

type LevelFilter = "all" | "error" | "warn";

function LevelPill({
  label,
  active,
  count,
  accentActive,
  countStyle,
  onClick,
}: {
  label: string;
  active: boolean;
  count?: number;
  accentActive?: boolean;   // use --theme-accent instead of foreground when active
  countStyle?: React.CSSProperties;
  onClick: () => void;
}) {
  const activeStyle: React.CSSProperties = accentActive && active
    ? { backgroundColor: "var(--theme-accent)", color: "#fff" }
    : {};
  return (
    <button
      type="button"
      onClick={onClick}
      style={activeStyle}
      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium transition-colors ${
        active && !accentActive
          ? "bg-foreground text-background"
          : !active
          ? "bg-muted text-muted-foreground hover:bg-muted/80"
          : ""
      }`}
    >
      {label}
      {count !== undefined && (
        <span
          className={`tabular-nums text-[10px] ${active ? "opacity-70" : ""}`}
          style={!active ? countStyle : undefined}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function ErrorLog({
  data,
  cronJumpSeq = 0,
  containerRef,
}: {
  data: ActivityData | null;
  cronJumpSeq?: number;
  containerRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage]     = useState(0);
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Cron jump: when cronJumpSeq increments, filter to cron errors
  useEffect(() => {
    if (cronJumpSeq > 0) {
      setLevelFilter("error");
      setSearch("cron");
      setPage(0);
      setExpandedKey(null);
    }
  }, [cronJumpSeq]);

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
    .slice()
    .sort((a, b) => sortAsc ? a.tsMs - b.tsMs : b.tsMs - a.tsMs);

  const total  = filtered.length;
  const pages  = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safeP  = Math.min(page, pages - 1);
  const slice  = filtered.slice(safeP * PAGE_SIZE, (safeP + 1) * PAGE_SIZE);
  const from   = total === 0 ? 0 : safeP * PAGE_SIZE + 1;
  const to     = Math.min((safeP + 1) * PAGE_SIZE, total);
  const hasFilters = levelFilter !== "all" || search.trim() !== "";

  return (
    <div ref={containerRef}>
      <Card>
        {/* ── Header ── */}
        <CardHeader className="pb-3 flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-sm font-medium">Log</CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">Last 30 days</p>
          </div>
          <div className="flex items-center gap-2 text-[11px] shrink-0 pt-0.5">
            {totalErr > 0 && (
              <span className="font-medium tabular-nums" style={{ color: "var(--theme-accent)" }}>
                {totalErr} error{totalErr !== 1 ? "s" : ""}
              </span>
            )}
            {totalWarn > 0 && (
              <span className="font-medium text-muted-foreground tabular-nums">
                {totalWarn} warning{totalWarn !== 1 ? "s" : ""}
              </span>
            )}
            {/* Quick hide-warnings shortcut */}
            {levelFilter === "all" && totalWarn > 0 && (
              <button
                type="button"
                onClick={() => setLevel("error")}
                className="text-[10px] text-muted-foreground/60 underline underline-offset-2 decoration-dotted hover:text-muted-foreground transition-colors"
              >
                hide warnings
              </button>
            )}
            {levelFilter === "error" && (
              <button
                type="button"
                onClick={() => setLevel("all")}
                className="text-[10px] text-muted-foreground/60 underline underline-offset-2 decoration-dotted hover:text-muted-foreground transition-colors"
              >
                show all
              </button>
            )}
            {allErrors.length === 0 && (
              <span style={{ color: "var(--theme-accent)" }}>All clear</span>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* ── Controls bar ── */}
          <div className="px-4 pb-3 flex flex-wrap items-center gap-2">
            {/* Level filter pills */}
            <div className="flex items-center gap-1">
              <LevelPill
                label="All"
                active={levelFilter === "all"}
                count={allErrors.length}
                onClick={() => setLevel("all")}
              />
              <LevelPill
                label="Errors"
                active={levelFilter === "error"}
                accentActive
                count={totalErr}
                countStyle={{ color: "var(--theme-accent)" }}
                onClick={() => setLevel("error")}
              />
              <LevelPill
                label="Warnings"
                active={levelFilter === "warn"}
                count={totalWarn}
                countStyle={{ color: "var(--theme-accent)", opacity: 0.7 }}
                onClick={() => setLevel("warn")}
              />
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
                const isErr = entry.level === "error";
                return (
                  <button
                    key={key}
                    type="button"
                    className="w-full text-left px-4 py-2.5 hover:bg-muted/40 transition-colors"
                    onClick={() => setExpandedKey(isExpanded ? null : key)}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      {/* Level badge — both levels use accent with opacity tiers */}
                      <span
                        className="mt-0.5 shrink-0 inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
                        style={isErr ? {
                          backgroundColor: "color-mix(in srgb, var(--theme-accent) 15%, transparent)",
                          color: "var(--theme-accent)",
                        } : {
                          backgroundColor: "color-mix(in srgb, var(--theme-accent) 10%, transparent)",
                          color: "var(--theme-accent)",
                          opacity: 0.7,
                        }}
                      >
                        {isErr ? "ERR" : "WARN"}
                      </span>

                      <div className="min-w-0 flex-1">
                        {/* Time + relative + subsystem row */}
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                            {fmtTime(entry.tsMs)}
                          </span>
                          <span className="text-[10px] text-muted-foreground/50 tabular-nums shrink-0">
                            {fmtRelative(entry.tsMs)}
                          </span>
                          {entry.subsystem && (
                            <span className="text-[10px] font-mono text-muted-foreground/80 truncate">
                              {entry.subsystem}
                            </span>
                          )}
                        </div>
                        {/* Message */}
                        <p className={`text-xs leading-relaxed ${isErr ? "text-foreground" : "text-muted-foreground"} ${isExpanded ? "whitespace-pre-wrap break-all" : "truncate"}`}>
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
    </div>
  );
}

// ── Main export ─────────────────────────────────────────────────────────────

export function ActivityCharts() {
  const [data, setData] = useState<ActivityData | null>(null);
  const [cronJumpSeq, setCronJumpSeq] = useState(0);
  const logRef = useRef<HTMLDivElement>(null);

  useAutoRefresh(() => {
    fetch("/api/activity")
      .then(r => r.json())
      .then(setData)
      .catch(() => {});
  });

  function handleCronFailClick() {
    setCronJumpSeq(s => s + 1);
    // Small delay lets React re-render before scrolling
    setTimeout(() => logRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  }

  return (
    <div className="space-y-4">
      <ActivityHistogram data={data} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <HourlyChart data={data} />
        <ChannelBreakdown data={data} onCronFailClick={handleCronFailClick} />
      </div>
      <ErrorLog data={data} cronJumpSeq={cronJumpSeq} containerRef={logRef} />
    </div>
  );
}
