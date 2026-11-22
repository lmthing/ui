import { globSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import ts from "typescript";
import { parseSource } from "./source";

export function identifiers(node: ts.Node) {
  const names = new Set<string>();
  const visit = (child: ts.Node) => {
    if (ts.isIdentifier(child)) names.add(child.text);
    ts.forEachChild(child, visit);
  };
  visit(node);
  return names;
}

const normal = (name: string) => name.toLowerCase().replace(/-/g, "");

export async function wordOwners(scope: string, components: readonly string[]) {
  const ids = new Map(components.map((file) => [normal(basename(file, ".tsx")), basename(file, ".tsx")]));
  const copy = globSync("copy/**/*.{ts,tsx}", { cwd: scope });
  const sources = await Promise.all(
    [
      ...components,
      ...copy.filter((file) => !file.endsWith("/index.ts")).map((file) => join(scope, file)),
    ].map(async (file) => {
      const owner = ids.get(normal(basename(file).split(".")[0]!));
      return owner
        ? { owner, names: identifiers(parseSource(file, await readFile(file, "utf8"))) }
        : undefined;
    }),
  );
  return (key: string) => {
    const candidates = new Set(sources.flatMap((source) => (source?.names.has(key) ? [source.owner] : [])));
    const byName = [...ids]
      .filter(([name]) => normal(key).startsWith(name))
      .sort(([a], [b]) => b.length - a.length);
    return byName[0]?.[1] ?? (candidates.size === 1 ? [...candidates][0]! : "pack");
  };
}
