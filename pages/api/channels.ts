import os from "os";
import { readFile } from "fs/promises";
import { join } from "path";
import type { Channel } from "@/lib/types";
import { createHandler } from "@/lib/api/handler";

const HOME = os.homedir();

export default createHandler<Channel[]>({
  cacheKey: "api-channels",
  cacheTtlMs: 30_000,
  handler: async () => {
    const raw = await readFile(join(HOME, ".openclaw/openclaw.json"), "utf-8");
    const config = JSON.parse(raw);
    const ch = config.channels || {};
    const channels: Channel[] = [];

    if (ch.telegram) {
      const t = ch.telegram;
      const topicAwareCandidate =
        t.sessionRouting?.topicAware ??
        t.topicAwareSessionRouting ??
        t.topicAwareTopics ??
        t.topicAware;
      channels.push({
        id: "telegram", name: "Telegram", enabled: t.enabled ?? true,
        dmPolicy: t.dmPolicy ?? "pairing", groupPolicy: t.groupPolicy ?? "allowlist",
        groups: Object.entries(t.groups || {}).map(([id, cfg]: [string, any]) => ({
          id, requireMention: cfg.requireMention ?? false, enabled: cfg.enabled ?? true,
        })),
        allowFrom: t.groupAllowFrom || [], streaming: t.streaming ?? false,
        sessionRouting: {
          telegramTopicAware:
            typeof topicAwareCandidate === "boolean" ? topicAwareCandidate : undefined,
        },
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

    if (ch.discord) {
      const d = ch.discord;
      const lifecycle = d.threadLifecycle ?? d.sessionLifecycle ?? {};
      const idleHours =
        typeof lifecycle?.idleHours === "number" && Number.isFinite(lifecycle.idleHours)
          ? lifecycle.idleHours
          : 24;
      const maxAgeHours =
        typeof lifecycle?.maxAgeHours === "number" && Number.isFinite(lifecycle.maxAgeHours)
          ? lifecycle.maxAgeHours
          : undefined;
      channels.push({
        id: "discord", name: "Discord", enabled: d.enabled ?? true,
        dmPolicy: d.dmPolicy ?? "allowlist", groupPolicy: d.groupPolicy ?? "allowlist",
        groups: Object.entries(d.guilds || {}).map(([id, cfg]: [string, any]) => ({
          id, requireMention: cfg.requireMention ?? false,
        })),
        allowFrom: d.allowFrom || [],
        sessionRouting: {
          discordThreadLifecycle: { idleHours, maxAgeHours },
        },
        extra: { streaming: d.streaming ?? "off" },
      });
    }

    return channels;
  },
});
