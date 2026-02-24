import os from "os";
import { readFile } from "fs/promises";
import { join } from "path";
import type { NextApiRequest, NextApiResponse } from "next";
import type { Channel } from "@/lib/types";

const HOME = os.homedir();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Channel[] | { error: string }>
) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const raw = await readFile(join(HOME, ".openclaw/openclaw.json"), "utf-8");
    const config = JSON.parse(raw);
    const ch = config.channels || {};
    const channels: Channel[] = [];

    if (ch.telegram) {
      const t = ch.telegram;
      channels.push({
        id: "telegram", name: "Telegram", enabled: t.enabled ?? true,
        dmPolicy: t.dmPolicy ?? "pairing", groupPolicy: t.groupPolicy ?? "allowlist",
        groups: Object.entries(t.groups || {}).map(([id, cfg]: [string, any]) => ({
          id, requireMention: cfg.requireMention ?? false, enabled: cfg.enabled ?? true,
        })),
        allowFrom: t.groupAllowFrom || [], streaming: t.streaming ?? false,
      });
    }

    if (ch.whatsapp) {
      const w = ch.whatsapp;
      channels.push({
        id: "whatsapp", name: "WhatsApp", enabled: true,
        dmPolicy: w.dmPolicy ?? "allowlist", groupPolicy: w.groupPolicy ?? "allowlist",
        groups: Object.entries(w.groups || {}).map(([id, cfg]: [string, any]) => ({
          id, requireMention: cfg.requireMention ?? false,
        })),
        allowFrom: w.allowFrom || [],
        extra: { mediaMaxMb: w.mediaMaxMb, debounceMs: w.debounceMs },
      });
    }

    res.status(200).json(channels);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}
