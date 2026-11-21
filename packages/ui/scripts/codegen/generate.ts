import { appendFile, lstat, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { format } from "prettier";
import { packIds, type PackId } from "../../src/catalog";
import { draftComponent } from "./draft";

async function exists(path: string) {
  return lstat(path).then(
    () => true,
    (error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
      return false;
    },
  );
}

async function createFile(path: string, source: string) {
  await mkdir(dirname(path), { recursive: true });
  try {
    await writeFile(path, source, { flag: "wx" });
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    return false;
  }
}

async function exportFrom(path: string, statement: string, hasExport: RegExp) {
  if (await createFile(path, `${statement}\n`)) return;
  const source = await readFile(path, "utf8");
  if (!hasExport.test(source)) await appendFile(path, `${source.endsWith("\n") ? "" : "\n"}${statement}\n`);
}

async function wirePack(uiRoot: string, pack: string, name: string) {
  const root = join(uiRoot, "src/packs", pack);
  await exportFrom(
    join(root, "components/index.ts"),
    `export * as ${name} from "./${name}";`,
    new RegExp(`^export\\s+\\*\\s+as\\s+${name}\\s+from\\s`, "m"),
  );
  const door = join(root, "index.ts");
  if (await createFile(door, 'export * from "./components";\n')) return;
  await exportFrom(
    door,
    `export { ${name} } from "./components";`,
    new RegExp(`^export\\s+(?:\\*\\s+from\\s+["']\\./components["']|\\{[^}]*\\b${name}\\b[^}]*\\})`, "m"),
  );
}

export async function generateComponent(workspace: string, scope: string, name: string) {
  if (!/^[A-Z][A-Za-z0-9]*$/.test(name) || (scope !== "core" && !packIds.includes(scope as PackId)))
    throw new Error("Usage: pnpm gen:component <pack|core> <PascalCaseName>");
  const core = scope === "core";
  const root = join(workspace, "packages/ui");
  const folder = core ? "src/components" : `src/packs/${scope}/components`;
  const target = `${folder}/${name}.tsx`;
  if (await exists(join(root, target))) return { written: [], skipped: [target] };
  const file = join(workspace, "docs/catalog", core ? "core.md" : `packs/${scope}.md`);
  const doc = await readFile(file, "utf8");
  const draft = draftComponent(doc, scope, name);
  const entries = await Promise.all(
    Object.entries(draft.files).map(
      async ([path, source]) => [path, await format(source, { filepath: path })] as const,
    ),
  );
  if (!core) await wirePack(root, scope, name);
  const written: string[] = [];
  const skipped: string[] = [];
  for (const [path, source] of entries) {
    const created = await createFile(join(root, path), source);
    (created ? written : skipped).push(path);
  }
  return { written, skipped };
}
