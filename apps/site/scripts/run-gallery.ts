import { spawnSync } from "node:child_process";

/** Runs the repo's static gallery export into `dir`. It shoots only changed components unless `all`. */
export function runGallery(dir: string, all: boolean): void {
  const args = ["--filter", "@lmthing/ui", "gallery:static", "--out", dir, ...(all ? ["--all"] : [])];
  const result = spawnSync("pnpm", args, { stdio: "inherit" });
  if (result.status !== 0) throw new Error(`gallery:static failed (exit ${result.status})`);
}
