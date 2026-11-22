import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, URL } from "node:url";

export const workspace = fileURLToPath(new URL("../../../../", import.meta.url));
const dist = join(workspace, "packages/ui/dist");

export async function inFixture(check: (root: string) => Promise<void>) {
  await mkdir(dist, { recursive: true });
  const root = await mkdtemp(join(dist, "component-gen-"));
  try {
    await check(root);
  } finally {
    await rm(root, { recursive: true });
  }
}

export async function put(root: string, file: string, source: string) {
  const path = join(root, file);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, source);
}
