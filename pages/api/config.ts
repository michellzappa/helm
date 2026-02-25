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
}

function readConfig(): HelmConfig {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  } catch {
    return { themeColor: DEFAULT_THEME_COLOR };
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
    const { themeColor } = req.body as Partial<HelmConfig>;
    if (!themeColor || !THEME_COLORS.find(c => c.id === themeColor)) {
      return res.status(400).json({ error: "Invalid themeColor" });
    }
    const updated: HelmConfig = { ...readConfig(), themeColor };
    writeConfig(updated);
    return res.json(updated);
  }

  res.setHeader("Allow", "GET, PATCH");
  res.status(405).end();
}
