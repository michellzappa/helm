import os from "os";
import { readFile, readdir } from "fs/promises";
import { join } from "path";
import type { Credential } from "@/lib/types";
import { createHandler } from "@/lib/api/handler";

const HOME = os.homedir();
const CREDS_DIR = join(HOME, ".openclaw/credentials");

// Friendly names for common OpenClaw credential files.
// Files not listed here are shown using their filename as the label.
// Add your own entries in a local fork or via a credentials.json config.
const KNOWN: Record<string, { name: string; category: string; note?: string }> = {
  // Channels (created by OpenClaw channel setup)
  "telegram-pairing.json":       { name: "Telegram pairing",        category: "Channels" },
  "telegram-allowFrom.json":     { name: "Telegram allowFrom",       category: "Channels" },
  "whatsapp-pairing.json":       { name: "WhatsApp pairing",         category: "Channels" },
  "whatsapp-allowFrom.json":     { name: "WhatsApp allowFrom",       category: "Channels" },
  "discord-pairing.json":        { name: "Discord pairing",          category: "Channels" },
  "slack-pairing.json":          { name: "Slack pairing",            category: "Channels" },
  "signal-pairing.json":         { name: "Signal pairing",           category: "Channels" },
  // System
  "helm-key.json":               { name: "Helm API key",             category: "System" },
};

async function fileStatus(path: string, ext: string): Promise<{ status: "ok" | "empty" | "missing"; keys?: number }> {
  try {
    const content = await readFile(path, "utf-8");
    if (!content.trim()) return { status: "empty" };
    if (ext === ".env") {
      const keys = content.split("\n").filter(l => l.includes("=") && !l.startsWith("#")).length;
      return { status: keys > 0 ? "ok" : "empty", keys };
    }
    if (ext === ".json") {
      const obj = JSON.parse(content);
      const keys = Object.keys(obj).length;
      return { status: keys > 0 ? "ok" : "empty", keys };
    }
    return { status: "ok" };
  } catch {
    return { status: "missing" };
  }
}

export default createHandler<Credential[]>({
  cacheKey: "api-credentials",
  cacheTtlMs: 30_000,
  handler: async () => {
    const files = await readdir(CREDS_DIR).catch(() => [] as string[]);

    const results: Credential[] = await Promise.all(
      files
        .filter(f => f.endsWith(".json") || f.endsWith(".env"))
        .map(async file => {
          const meta = KNOWN[file];
          const ext = file.endsWith(".env") ? ".env" : ".json";
          const { status, keys } = await fileStatus(join(CREDS_DIR, file), ext);
          const name = meta?.name ?? file
            .replace(/[-_]/g, " ")
            .replace(/\.(json|env)$/, "")
            .replace(/\b\w/g, c => c.toUpperCase());
          return {
            id: file,
            name,
            category: meta?.category ?? "Credentials",
            file,
            status,
            keys,
            note: meta?.note,
          };
        })
    );

    results.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
    return results;
  },
});
