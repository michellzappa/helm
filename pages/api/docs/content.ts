import { createHandler } from "@/lib/api/handler";
import { readFile } from "fs/promises";
import { resolve, normalize } from "path";
import os from "os";

const WORKSPACE = resolve(os.homedir(), ".openclaw/workspace");

interface DocContentResponse {
  content: string;
  path: string;
}

export default createHandler<DocContentResponse>({
  cacheTtlMs: 60_000,
  async handler(req) {
    const { path: docPath } = req.query as { path: string };

    if (!docPath) {
      throw new Error("Missing path parameter");
    }

    // Security: ensure the path is within the workspace
    const resolved = normalize(docPath);
    if (!resolved.startsWith(WORKSPACE)) {
      throw new Error("Access denied: path outside workspace");
    }

    const content = await readFile(resolved, "utf-8");

    return {
      content,
      path: resolved,
    };
  },
});
