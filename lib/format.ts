import type { DateFormat, TimeFormat } from "@/lib/settings-context";

function toDate(input: Date | string): Date {
  return input instanceof Date ? input : new Date(input);
}

export function fmtDate(date: Date | string, format: DateFormat): string {
  const d = toDate(date);
  if (Number.isNaN(d.getTime())) return "—";

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");

  if (format === "DD/MM") return `${day}/${month}`;
  return `${month}/${day}`;
}

export function fmtTime(date: Date | string, format: TimeFormat): string {
  const d = toDate(date);
  if (Number.isNaN(d.getTime())) return "—";

  if (format === "24h") {
    return d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  return d.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function fmtAge(ms: number): string {
  if (!ms) return "—";

  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return `${Math.max(0, s)}s ago`;

  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;

  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;

  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
