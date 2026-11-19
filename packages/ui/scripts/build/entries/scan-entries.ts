import { readdir, readFile } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import ts from "typescript";
import { packIds, type PackId } from "../../../src/catalog";

export const dataExports = ["meta", "props", "fallback", "examples", "probes"] as const;

async function filesIn(folder: string): Promise<string[]> {
  const entries = await readdir(folder, { withFileTypes: true }).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  const paths = await Promise.all(
    entries.map(async (entry) => {
      const path = join(folder, entry.name);
      return entry.isDirectory() ? filesIn(path) : [path];
    }),
  );
  return paths.flat().sort();
}

function exportedNames(file: string, source: string): string[] {
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  return ast.statements.flatMap((node) => {
    const exported =
      ts.canHaveModifiers(node) && ts.getModifiers(node)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    if (!exported) return [];
    if (ts.isFunctionDeclaration(node)) return node.name ? [node.name.text] : [];
    if (ts.isVariableStatement(node))
      return node.declarationList.declarations.map((d) => d.name.getText(ast));
    return [];
  });
}

async function definition(file: string, entryDir: string, pack: PackId | undefined) {
  const source = await readFile(file, "utf8");
  const name = basename(file, ".tsx");
  const names = exportedNames(file, source);
  const draft = /status:\s*["']draft["']/.test(source);
  const missing: string[] = dataExports.filter((key) => !names.includes(key));
  if (!draft && !names.includes(name)) missing.push(name);
  if (missing.length) throw new Error(`${file} is missing exports: ${missing.join(", ")}`);
  return { name, draft, path: `./${relative(entryDir, file).replace(/\.tsx$/, "")}`, pack };
}

async function packEntry(folder: string, id: PackId) {
  const files = await filesIn(folder);
  const meta = files.includes(join(folder, "pack.ts"));
  if (meta && !exportedNames("pack.ts", await readFile(join(folder, "pack.ts"), "utf8")).includes("pack"))
    throw new Error(`${folder}/pack.ts is missing export: pack`);
  const archetypes = await Promise.all(
    files
      .filter((file) => {
        const path = relative(folder, file);
        if (
          !path.startsWith("archetypes/") ||
          !path.endsWith(".ts") ||
          path.endsWith(".test.ts") ||
          basename(path) === "index.ts"
        )
          return false;
        if (!/^archetypes\/[a-z][a-z0-9]*(?:-[a-z0-9]+)*\.ts$/.test(path))
          throw new Error(`Invalid archetype path: ${file}`);
        return true;
      })
      .map(async (file) => {
        const names = exportedNames(file, await readFile(file, "utf8")).filter((name) => name !== "probes");
        if (names.length !== 1) throw new Error(`${file} must export one archetype plus optional probes`);
        return { name: names[0]!, file: basename(file, ".ts") };
      }),
  );
  const example = files.includes(join(folder, "example.jsonl"))
    ? await readFile(join(folder, "example.jsonl"), "utf8")
    : undefined;
  return { id, meta, archetypes, example };
}

export async function scanEntries(root: string) {
  const packDir = join(root, "src/packs");
  const folders = (
    await readdir(packDir, { withFileTypes: true }).catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return [];
      throw error;
    })
  )
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  for (const folder of folders)
    if (!packIds.includes(folder as PackId)) throw new Error(`Unknown pack folder: ${folder}`);
  const packs = await Promise.all(folders.map((id) => packEntry(join(packDir, id), id as PackId)));
  const files = (
    await Promise.all(["components", "packs", "surfaces"].map((folder) => filesIn(join(root, "src", folder))))
  ).flat();
  const defs = await Promise.all(
    files
      .filter((file) => /^[A-Z][A-Za-z0-9]*\.tsx$/.test(basename(file)))
      .map((file) => {
        const path = relative(join(root, "src"), file);
        const segments = path.split("/");
        const pack = segments[0] === "packs" ? (segments[1] as PackId) : undefined;
        if (pack && (segments.length !== 4 || segments[2] !== "components"))
          throw new Error(`Pack component must be in components/: ${file}`);
        return definition(file, join(root, "src/entry"), pack);
      }),
  );
  const seen = new Set<string>();
  for (const def of defs) {
    if (seen.has(def.name)) throw new Error(`Component id collision: ${def.name}`);
    seen.add(def.name);
  }
  for (const { id, meta, archetypes, example } of packs) {
    if (!meta && !archetypes.length && example === undefined && !defs.some((def) => def.pack === id))
      continue;
    const door = join(packDir, id, "index.ts");
    await readFile(door, "utf8").catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT")
        throw new Error(`Missing pack door: ${door}; export pack, components, archetypes and example.`);
      throw error;
    });
  }
  return { defs, packs };
}
