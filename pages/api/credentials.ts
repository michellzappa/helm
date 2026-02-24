import { readFile, readdir } from "fs/promises";
import { join } from "path";
import type { NextApiRequest, NextApiResponse } from "next";
import type { Credential } from "@/lib/types";

const HOME = process.env.HOME || "/Users/botbot";
const CREDS_DIR = join(HOME, ".openclaw/credentials");

// Friendly mapping: filename → { name, category, note? }
const KNOWN: Record<string, { name: string; category: string; note?: string }> = {
  "cms_supabase.env":            { name: "CMS (Supabase)",           category: "Databases" },
  "crm_supabase.env":            { name: "CRM (Supabase)",           category: "Databases" },
  "plausible.env":               { name: "Plausible Analytics",      category: "Analytics" },
  "gumroad.env":                 { name: "Gumroad",                  category: "Commerce" },
  "gmail_client_secret.json":    { name: "Gmail OAuth App",          category: "Google", note: "client credentials" },
  "gmail_token_agent.json":      { name: "Gmail (agent account)",    category: "Google" },
  "gmail_token_mz.json":         { name: "Gmail (mz personal)",      category: "Google", note: "needs re-auth: wrong scope" },
  "google_calendar_casa.json":   { name: "Google Calendar (casa)",   category: "Google" },
  "google_calendar_work.json":   { name: "Google Calendar (work)",   category: "Google" },
  "gsc_token_mz.json":           { name: "Google Search Console",    category: "Google" },
  "granola_mcp_auth_state.json": { name: "Granola MCP auth state",   category: "AI Tools" },
  "granola_mcp_client.json":     { name: "Granola MCP client",       category: "AI Tools" },
  "granola_mcp_token.json":      { name: "Granola MCP token",        category: "AI Tools" },
  "helm-key.json":               { name: "Helm Key",                 category: "System" },
  "telegram-pairing.json":       { name: "Telegram pairing",         category: "Channels" },
  "telegram-allowFrom.json":     { name: "Telegram allowFrom",       category: "Channels" },
  "whatsapp-pairing.json":       { name: "WhatsApp pairing",         category: "Channels" },
  "whatsapp-allowFrom.json":     { name: "WhatsApp allowFrom",       category: "Channels" },
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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Credential[] | { error: string }>
) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const results: Credential[] = [];

    for (const [file, meta] of Object.entries(KNOWN)) {
      const filePath = join(CREDS_DIR, file);
      const ext = file.endsWith(".env") ? ".env" : ".json";
      const { status, keys } = await fileStatus(filePath, ext);
      results.push({
        id: file,
        name: meta.name,
        category: meta.category,
        file,
        status,
        keys,
        note: meta.note,
      });
    }

    // Sort: category asc, name asc
    results.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
    res.status(200).json(results);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}
