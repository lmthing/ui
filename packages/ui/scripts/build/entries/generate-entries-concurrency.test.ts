import { afterEach, expect, it } from "vitest";
import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { generateEntries } from "./index";

let root: string | undefined;
afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
  root = undefined;
});

it("keeps a warm entry tree readable while two generators run in parallel", async () => {
  root = await mkdtemp(resolve(".entries-race-test-"));
  const pack = join(root, "src/packs/booking");
  await mkdir(pack, { recursive: true });
  await writeFile(join(pack, "pack.ts"), 'export const pack = { id: "booking" };\n');
  await writeFile(join(pack, "index.ts"), 'export { pack } from "./pack";\n');
  await generateEntries(root);

  const entry = join(root, "src/entry");
  const snapshot = async () => {
    const files = await readdir(entry, { recursive: true, withFileTypes: true });
    return Promise.all(
      files
        .filter((file) => file.isFile())
        .map(async ({ parentPath, name }) => {
          const path = join(parentPath, name);
          const [source, { ino, mtimeMs }] = await Promise.all([readFile(path, "utf8"), stat(path)]);
          return { path, source, ino, mtimeMs };
        }),
    ).then((files) => files.sort((a, b) => a.path.localeCompare(b.path)));
  };
  const before = await snapshot();
  expect(before.map(({ path }) => path)).toContain(join(entry, "packs/group-1/index.ts"));
  let finished = false;
  const writers = Promise.allSettled([generateEntries(root), generateEntries(root)]).then((results) => {
    finished = true;
    return results;
  });
  try {
    do {
      expect(await snapshot()).toEqual(before);
    } while (!finished);
  } finally {
    await writers;
  }
  expect(await writers).toEqual([{ status: "fulfilled" }, { status: "fulfilled" }]);
  expect(await snapshot()).toEqual(before);
});
