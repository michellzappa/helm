import os from "os";
import { unlink, readdir } from "fs/promises";
import { join } from "path";
import type { NextApiRequest, NextApiResponse } from "next";

const HOME = os.homedir();
const QUEUE_DIR = join(HOME, ".openclaw/delivery-queue");

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") return res.status(405).json({ error: "Method not allowed" });

  const { id } = req.query;

  try {
    if (id === "__all__") {
      // Delete all .json files in queue dir
      const files = (await readdir(QUEUE_DIR)).filter(f => f.endsWith(".json"));
      await Promise.all(files.map(f => unlink(join(QUEUE_DIR, f))));
      return res.status(200).json({ deleted: files.length });
    }

    if (typeof id === "string" && /^[a-f0-9-]{36}$/.test(id)) {
      await unlink(join(QUEUE_DIR, `${id}.json`));
      return res.status(200).json({ deleted: 1 });
    }

    return res.status(400).json({ error: "Invalid id" });
  } catch (err: unknown) {
    const e = err as NodeJS.ErrnoException;
    if (e.code === "ENOENT") return res.status(404).json({ error: "Not found" });
    return res.status(500).json({ error: (err as Error).message });
  }
}
