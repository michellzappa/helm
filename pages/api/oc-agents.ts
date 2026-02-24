import { readFile, readdir } from "fs/promises";
import { join } from "path";
import type { NextApiRequest, NextApiResponse } from "next";

const HOME = process.env.HOME || "/Users/botbot";

export interface OcBinding {
  channel: string;
  accountId?: string;
  peer?: { kind: string; id: string };
}

export interface OcAgent {
  id: string;
  name: string;
  workspace: string;
  agentDir: string;
  model: string;
  isDefault: boolean;
  sessionCount: number;
  bindings: OcBinding[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<OcAgent[] | { error: string }>
) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const raw = await readFile(join(HOME, ".openclaw/openclaw.json"), "utf-8");
    const config = JSON.parse(raw);

    const defaults = config.agents?.defaults || {};
    const list: any[] = config.agents?.list || [{ id: "main" }];
    const allBindings: any[] = config.bindings || [];

    const defaultWorkspace = defaults.workspace || join(HOME, ".openclaw/workspace");
    const defaultModel = defaults.model?.primary || "unknown";

    const agents: OcAgent[] = await Promise.all(
      list.map(async (a: any) => {
        const id = a.id;
        const workspace = a.workspace || (id === "main" ? defaultWorkspace : join(HOME, `.openclaw/workspace-${id}`));
        const agentDir = a.agentDir || join(HOME, `.openclaw/agents/${id}/agent`);
        const model = a.model || defaultModel;

        // Count sessions for this agent
        let sessionCount = 0;
        try {
          const sessionsDir = join(HOME, `.openclaw/agents/${id}/sessions`);
          const files = await readdir(sessionsDir);
          sessionCount = files.filter(f => f.endsWith(".json")).length;
        } catch {}

        // Collect bindings for this agent
        const bindings: OcBinding[] = allBindings
          .filter((b: any) => b.agentId === id)
          .map((b: any) => ({
            channel: b.match?.channel || "any",
            accountId: b.match?.accountId,
            peer: b.match?.peer,
          }));

        // If main agent and no explicit bindings, it's the catch-all
        const isDefault = a.default === true || (id === "main" && allBindings.every(b => b.agentId !== "main"));

        return {
          id,
          name: a.name || a.id,
          workspace,
          agentDir,
          model,
          isDefault,
          sessionCount,
          bindings,
        };
      })
    );

    res.status(200).json(agents);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}
