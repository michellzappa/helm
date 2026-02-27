/**
 * TRMNL e-ink display endpoint.
 * Returns an 800×480 1-bit black & white PNG — graph-focused mini dashboard.
 * Point TRMNL's "Private Screen" plugin at: http://helm:1111/api/trmnl
 */
import type { NextApiRequest, NextApiResponse } from "next";
import { createCanvas } from "canvas";

const BASE = "http://127.0.0.1:1111";
const W = 800;
const H = 480;
const PAD = 24;

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    return await res.json() as T;
  } catch { return null; }
}

function fmtBytes(b: number): string {
  return b >= 1e9 ? `${(b / 1e9).toFixed(1)}G` : b >= 1e6 ? `${(b / 1e6).toFixed(0)}M` : `${b}B`;
}

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#000";

  const [activityData, systemData, costData] = await Promise.all([
    fetchJson<{ daily: { date: string; user: number; system: number }[]; hourly: number[] }>("/api/activity"),
    fetchJson<{ cpu: { pct: number; loadAvg: number[] }; ram: { pct: number; usedBytes: number; totalBytes: number }; disk: { pct: number }; uptimeSeconds: number; hostname: string }>("/api/system"),
    fetchJson<{ summary: { today: number; week: number; month: number }; daily: { date: string; cost: number; byModel?: Record<string, number> }[]; byModel: { model: string; cost: number }[] }>("/api/cost-history"),
  ]);

  const tz = process.env.TZ || "UTC";
  const now = new Date();

  // ─── HEADER (minimal) ───
  ctx.font = "bold 20px sans-serif";
  ctx.fillText("Helm", PAD, 28);
  ctx.font = "12px sans-serif";
  const timeStr = now.toLocaleString("en-US", { timeZone: tz, weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
  ctx.fillText(timeStr, PAD + 60, 28);
  if (systemData?.hostname) {
    const hw = ctx.measureText(systemData.hostname).width;
    ctx.fillText(systemData.hostname, W - PAD - hw, 28);
  }
  ctx.fillRect(PAD, 38, W - PAD * 2, 1);

  // ─── ACTIVITY HISTOGRAM (full width, tall) ───
  let y = 56;
  ctx.font = "bold 13px sans-serif";
  ctx.fillText("ACTIVITY — 30 DAYS", PAD, y);

  if (activityData?.daily?.length) {
    const days = activityData.daily;
    const maxVal = Math.max(...days.map(d => d.user + d.system), 1);
    ctx.font = "11px sans-serif";
    const totalEvents = days.reduce((s, d) => s + d.user + d.system, 0);
    const tw = ctx.measureText(`${totalEvents.toLocaleString()}`).width;
    ctx.fillText(`${totalEvents.toLocaleString()}`, W - PAD - tw, y);
    y += 8;

    const chartW = W - PAD * 2;
    const chartH = 120;
    const gap = 1;
    const barW = Math.max(3, Math.floor((chartW - gap * days.length) / days.length));

    for (let i = 0; i < days.length; i++) {
      const total = days[i].user + days[i].system;
      const userH = Math.max(0, Math.round((days[i].user / maxVal) * chartH));
      const sysH = Math.max(0, Math.round((days[i].system / maxVal) * chartH));
      const x = PAD + i * (barW + gap);

      // System (gray, bottom)
      ctx.fillStyle = "#bbb";
      ctx.fillRect(x, y + chartH - sysH, barW, sysH);
      // User (black, stacked on top)
      ctx.fillStyle = "#000";
      ctx.fillRect(x, y + chartH - sysH - userH, barW, userH);
    }
    ctx.fillStyle = "#000";

    // X-axis labels
    ctx.font = "10px sans-serif";
    const first = days[0].date.slice(5);
    const last = days[days.length - 1].date.slice(5);
    ctx.fillText(first, PAD, y + chartH + 12);
    const lw = ctx.measureText(last).width;
    ctx.fillText(last, W - PAD - lw, y + chartH + 12);
    // Mid label
    const mid = days[Math.floor(days.length / 2)].date.slice(5);
    const mw = ctx.measureText(mid).width;
    ctx.fillText(mid, PAD + chartW / 2 - mw / 2, y + chartH + 12);

    y += chartH + 22;
  }

  // ─── 24H HEATMAP (full width) ───
  y += 8;
  ctx.font = "bold 13px sans-serif";
  ctx.fillText("TODAY — HOURLY", PAD, y);
  y += 8;

  if (activityData?.hourly?.length) {
    const hourly = activityData.hourly;
    const maxH = Math.max(...hourly, 1);
    const chartW = W - PAD * 2;
    const cellW = Math.floor(chartW / 24);
    const cellH = 28;

    for (let i = 0; i < 24; i++) {
      const intensity = hourly[i] / maxH;
      const gray = Math.round(255 * (1 - intensity));
      ctx.fillStyle = `rgb(${gray},${gray},${gray})`;
      ctx.fillRect(PAD + i * cellW, y, cellW - 1, cellH);
    }
    ctx.fillStyle = "#000";

    // Hour labels
    ctx.font = "9px sans-serif";
    for (let i = 0; i < 24; i += 3) {
      ctx.fillText(String(i).padStart(2, "0"), PAD + i * cellW + 2, y + cellH + 10);
    }
    y += cellH + 18;
  }

  // ─── SPEND SPARKLINE (full width, compact) ───
  y += 4;
  ctx.font = "bold 13px sans-serif";
  ctx.fillText("SPEND — 30 DAYS", PAD, y);

  if (costData?.summary) {
    ctx.font = "11px sans-serif";
    const spendStr = `$${costData.summary.today.toFixed(2)} today · $${costData.summary.week.toFixed(2)} 7d · $${costData.summary.month.toFixed(2)} 30d`;
    const sw = ctx.measureText(spendStr).width;
    ctx.fillText(spendStr, W - PAD - sw, y);
  }
  y += 8;

  if (costData?.daily?.length) {
    const days = costData.daily;
    const maxCost = Math.max(...days.map(d => d.cost), 0.001);
    const chartW = W - PAD * 2;
    const chartH = 50;
    const gap = 1;
    const barW = Math.max(3, Math.floor((chartW - gap * days.length) / days.length));

    // Get top models for stacking
    const topModels = (costData.byModel || []).slice(0, 4).map(m => m.model);

    for (let i = 0; i < days.length; i++) {
      const day = days[i];
      const x = PAD + i * (barW + gap);

      if (day.byModel && topModels.length > 0) {
        // Stacked bars per model
        let stackY = y + chartH;
        for (let mi = 0; mi < topModels.length; mi++) {
          const modelCost = day.byModel[topModels[mi]] || 0;
          const h = Math.max(0, Math.round((modelCost / maxCost) * chartH));
          if (h === 0) continue;
          // Alternate fills for e-ink: solid, lines, dots
          if (mi === 0) {
            ctx.fillStyle = "#000";
          } else if (mi === 1) {
            ctx.fillStyle = "#666";
          } else if (mi === 2) {
            ctx.fillStyle = "#aaa";
          } else {
            ctx.fillStyle = "#ddd";
          }
          ctx.fillRect(x, stackY - h, barW, h);
          stackY -= h;
        }
      } else {
        // Single color
        const h = Math.max(0, Math.round((day.cost / maxCost) * chartH));
        ctx.fillStyle = "#000";
        ctx.fillRect(x, y + chartH - h, barW, h);
      }
    }
    ctx.fillStyle = "#000";
    y += chartH + 4;
  }

  // ─── SYSTEM BAR (compact, bottom) ───
  y = H - 30;
  ctx.fillRect(PAD, y - 4, W - PAD * 2, 1);

  if (systemData) {
    ctx.font = "11px sans-serif";
    const items = [
      `CPU ${systemData.cpu.pct}%`,
      `RAM ${systemData.ram.pct}%`,
      `Disk ${systemData.disk.pct}%`,
    ];
    let sx = PAD;
    for (const item of items) {
      // Mini bar
      const pct = parseFloat(item.split(" ")[1]) / 100;
      const barW = 50;
      const barH = 8;
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 1;
      ctx.strokeRect(sx, y + 2, barW, barH);
      ctx.fillStyle = "#000";
      ctx.fillRect(sx, y + 2, Math.round(barW * pct), barH);
      ctx.fillText(item, sx + barW + 4, y + 10);
      sx += barW + ctx.measureText(item).width + 20;
    }
  }

  const buf = canvas.toBuffer("image/png");
  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", "public, max-age=300");
  res.setHeader("Content-Length", buf.length);
  res.status(200).end(buf);
}
