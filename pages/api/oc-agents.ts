import os from "os";
import { readFile, readdir } from "fs/promises";
import { join } from "path";
import type { NextApiRequest, NextApiResponse } from "next";
import { withDemo } from "../../lib/demo-guard";
import { ocAgents as _demoFixture } from "../../lib/demo-fixtures";
import { getOrFetch } from "../../lib/server-cache";

const HOME = os.homedir();
const TTL_MS = 120_000;

export interface OcBinding {
  channel: string;
  accountId?: string;
  peer?: { kind: string; id: string };
  sessionLifecycle?: { idleHours: number; maxAgeHours?: number };
  telegramTopicAwareSessionRouting?: boolean;
}

export interface OcAgent {
  id: string;
  name: string;
  workspace: string;
  agentDir: string;
  model: string;
  isDefault: boolean;
  sessionCount: number;
  skillCount?: number;
  bindings: OcBinding[];
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<OcAgent[] | { error: string }>
) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const agents = await getOrFetch<OcAgent[]>("api-oc-agents", TTL_MS, async () => {
      const raw = await readFile(join(HOME, ".openclaw/openclaw.json"), "utf-8");
      const config = JSON.parse(raw);

      const defaults = config.agents?.defaults || {};
      const list: any[] = config.agents?.list || [{ id: "main" }];
      const allBindings: any[] = config.bindings || [];

      const defaultWorkspace = defaults.workspace || join(HOME, ".openclaw/workspace");
      const defaultModel = defaults.model?.primary || "unknown";

      return Promise.all(
        list.map(async (a: any) => {
          const id = a.id;
          const workspace = a.workspace || (id === "main" ? defaultWorkspace : join(HOME, `.openclaw/workspace-${id}`));
          const agentDir = a.agentDir || join(HOME, `.openclaw/agents/${id}/agent`);
          const model = a.model || defaultModel;
          const skillCount = Array.isArray(a.skills) ? a.skills.length : 0;

          let sessionCount = 0;
          try {
            const sessionsDir = join(HOME, `.openclaw/agents/${id}/sessions`);
            const files = await readdir(sessionsDir);
            sessionCount = files.filter((f) => f.endsWith(".json")).length;
          } catch {}

          const bindings: OcBinding[] = allBindings
            .filter((b: any) => b.agentId === id)
            .map((b: any) => {
              const lifecycle = b.sessionLifecycle ?? b.match?.sessionLifecycle ?? b.match?.threadLifecycle;
              const idleHours =
                typeof lifecycle?.idleHours === "number" && Number.isFinite(lifecycle.idleHours)
                  ? lifecycle.idleHours
                  : 24;
              const maxAgeHours =
                typeof lifecycle?.maxAgeHours === "number" && Number.isFinite(lifecycle.maxAgeHours)
                  ? lifecycle.maxAgeHours
                  : undefined;

              const topicAwareCandidate =
                b.sessionRouting?.telegramTopicAware ??
                b.match?.sessionRouting?.telegramTopicAware ??
                b.telegramTopicAwareSessionRouting ??
                b.match?.topicAwareSessionRouting;
              const telegramTopicAwareSessionRouting =
                typeof topicAwareCandidate === "boolean" ? topicAwareCandidate : undefined;

              return {
                channel: b.match?.channel || "any",
                accountId: b.match?.accountId,
                peer: b.match?.peer,
                sessionLifecycle: { idleHours, maxAgeHours },
                telegramTopicAwareSessionRouting,
              };
            });

          const isDefault = a.default === true || (id === "main" && allBindings.every((b) => b.agentId !== "main"));

          return {
            id,
            name: a.name || a.id,
            workspace,
            agentDir,
            model,
            isDefault,
            sessionCount,
            skillCount,
            bindings,
          };
        })
      );
    });
    res.status(200).json(agents);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

export default withDemo(_demoFixture, handler);
