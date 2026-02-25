/**
 * System-level Helm config — stored in helm.config.json at the project root.
 * All settings live here so they're consistent across browsers/devices.
 */
import fs from "fs";
import path from "path";
import type { NextApiRequest, NextApiResponse } from "next";
import { THEME_COLORS } from "@/lib/theme-colors";
import type { AppSettings } from "@/lib/settings-context";

const CONFIG_PATH = path.join(process.cwd(), "helm.config.json");

type HelmConfig = Partial<AppSettings>;

const DEFAULTS: HelmConfig = {
  themeColor: "lobster",
  colorMode: "dark",
  sidebarPosition: "left",
  showSidebarCounts: true,
  hiddenSidebarItems: [],
  dashboardCards: { weather: true, system: true, tailscale: true, activity: true },
  currency: "EUR",
  dateFormat: "DD/MM",
  timeFormat: "24h",
  temperatureUnit: "C",
  refreshInterval: 30_000,
};

function readConfig(): HelmConfig {
  try {
    return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8")) };
  } catch {
    return { ...DEFAULTS };
  }
}

function writeConfig(cfg: HelmConfig): void {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2) + "\n", "utf8");
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    return res.json(readConfig());
  }

  if (req.method === "PATCH") {
    const body = req.body as Partial<HelmConfig>;
    const current = readConfig();

    // Validate specific fields
    if (body.themeColor !== undefined && !THEME_COLORS.find(c => c.id === body.themeColor)) {
      return res.status(400).json({ error: "Invalid themeColor" });
    }
    if (body.colorMode !== undefined && !["light", "dark", "system"].includes(body.colorMode)) {
      return res.status(400).json({ error: "Invalid colorMode" });
    }
    if (body.currency !== undefined && !["EUR", "USD", "GBP"].includes(body.currency)) {
      return res.status(400).json({ error: "Invalid currency" });
    }
    if (body.sidebarPosition !== undefined && !["left", "right"].includes(body.sidebarPosition)) {
      return res.status(400).json({ error: "Invalid sidebarPosition" });
    }

    const updated: HelmConfig = { ...current, ...body };
    writeConfig(updated);
    return res.json(updated);
  }

  res.setHeader("Allow", "GET, PATCH");
  res.status(405).end();
}
