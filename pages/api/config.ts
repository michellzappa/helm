/**
 * System-level Helm config — stored in helm.config.json at the project root.
 * themeColor lives here so it's consistent across all browsers/devices.
 * Other UX settings (refresh interval, sidebar counts) stay in localStorage.
 */
import fs from "fs";
import path from "path";
import type { NextApiRequest, NextApiResponse } from "next";
import { THEME_COLORS, DEFAULT_THEME_COLOR } from "@/lib/theme-colors";

const CONFIG_PATH = path.join(process.cwd(), "helm.config.json");

export interface HelmConfig {
  themeColor: string;
  colorMode: "light" | "dark" | "system";
}

function readConfig(): HelmConfig {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  } catch {
    return { themeColor: DEFAULT_THEME_COLOR, colorMode: "dark" as const };
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
    if (body.themeColor !== undefined && !THEME_COLORS.find(c => c.id === body.themeColor)) {
      return res.status(400).json({ error: "Invalid themeColor" });
    }
    if (body.colorMode !== undefined && !["light", "dark", "system"].includes(body.colorMode)) {
      return res.status(400).json({ error: "Invalid colorMode" });
    }
    const updated: HelmConfig = {
      ...current,
      ...(body.themeColor ? { themeColor: body.themeColor } : {}),
      ...(body.colorMode ? { colorMode: body.colorMode } : {}),
    };
    writeConfig(updated);
    return res.json(updated);
  }

  res.setHeader("Allow", "GET, PATCH");
  res.status(405).end();
}
