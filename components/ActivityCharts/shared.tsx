// Shared utilities for ActivityCharts components

export function fmtDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("en", {
    month: "short",
    day: "numeric",
  });
}

export function CardSkeleton({ height = "h-20" }: { height?: string }) {
  return <div className={`${height} rounded-md bg-muted animate-pulse`} />;
}
