import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { URL } from "node:url";
import ts from "typescript";
import { afterEach, expect, it } from "vitest";
import { generateDoors } from "./generate-doors";
import { generateEntries, scanEntries } from "./index";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function fixture() {
  const root = await mkdtemp(resolve(".doors-test-"));
  roots.push(root);
  const src = join(root, "src");
  function put(path: string, source: string) {
    const file = join(src, path);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, source);
  }
  return { root, src, put };
}

function draft(name: string) {
  return `
    export const meta = { id: "${name}", status: "draft" };
    export const props = {};
    export const fallback = () => ({});
    export const examples = [];
    export const probes = [];
  `;
}

function syntheticExports(names: string[]) {
  return names
    .map((name) =>
      name.endsWith(":type") ? `export type ${name.slice(0, -5)} = string;` : `export const ${name} = 1;`,
    )
    .join("\n");
}

async function installLegacyInputs({ put }: Awaited<ReturnType<typeof fixture>>) {
  // These are the pre-migration leaf surfaces, not a snapshot of the live tree.
  const inputs = await readFile(new URL("./legacy-door-inputs.txt", import.meta.url), "utf8");
  for (const line of inputs.trimEnd().split("\n")) {
    const [folder, ...modules] = line.split(" ");
    if (folder!.endsWith("/components")) put(`${dirname(folder!)}/index.ts`, "export {};");
    for (const module of modules) {
      const [file, exports] = module.split("=");
      const path = `${folder}/${file}`;
      if (exports === undefined) {
        put(path, draft(basename(file!, ".tsx")));
        continue;
      }
      const names = exports.split(",");
      if (file!.endsWith("/index.ts")) {
        put(`${dirname(path)}/fixture.ts`, syntheticExports(names));
        const specifiers = names.map((name) => name.replace(/^(.+):type$/, "type $1"));
        put(path, `export { ${specifiers.join(", ")} } from "./fixture";`);
      } else {
        put(path, syntheticExports(names));
      }
    }
  }
}

function exportedSurface(src: string, doors: string[]) {
  const program = ts.createProgram(
    doors.map((door) => join(src, door)),
    {
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.ReactJSX,
      noLib: true,
      types: [],
    },
  );
  const checker = program.getTypeChecker();
  return doors.map((door) => {
    const source = program.getSourceFile(join(src, door))!;
    const symbol = checker.getSymbolAtLocation(source)!;
    const names = checker.getExportsOfModule(symbol).map((member) => {
      const target = member.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(member) : member;
      const typeOnly =
        !(target.flags & ts.SymbolFlags.Value) ||
        member.declarations?.some(
          (node) => ts.isExportSpecifier(node) && (node.isTypeOnly || node.parent.parent.isTypeOnly),
        );
      return `${member.name}${typeOnly ? ":type" : ""}`;
    });
    return `${door} ${names.sort().join(" ")}`;
  });
}

it("matches the handwritten doors' exact value and type exports on the frozen baseline", async () => {
  const tree = await fixture();
  await installLegacyInputs(tree);
  // Compare the re-exports without formatting unrelated catalog and renderer entries.
  const doors = await generateDoors(tree.root, await scanEntries(tree.root));
  for (const [path, lines] of Object.entries(doors)) tree.put(path, lines.join("\n"));
  const expected = await readFile(new URL("./legacy-door-exports.txt", import.meta.url), "utf8");
  expect(exportedSurface(tree.src, Object.keys(doors).sort())).toEqual(expected.trimEnd().split("\n"));
});

it("discovers added and removed sources in sorted order without changing other doors", async () => {
  const { root, src, put } = await fixture();
  const pack = "packs/booking";
  const copy = `${pack}/copy`;
  const components = `${pack}/components`;
  const packDoor = 'export const example = "logic";\n';
  put(`${pack}/index.ts`, packDoor);
  put(`${copy}/Zebra.ts`, "export const zebra = 1;");
  put(`${copy}/ignored.test.ts`, "export const ignored = 1;");
  put(`${copy}/helper/index.ts`, "export const helper = 1;");
  put(`${components}/Zebra.tsx`, draft("Zebra"));
  await generateEntries(root);

  const body = async (folder: string) =>
    (await readFile(join(src, folder, "index.ts"), "utf8"))
      .trim()
      .split("\n")
      .filter((line) => line.startsWith("export "));
  expect(await body(copy)).toEqual(['export * from "./Zebra";', 'export * from "./helper";']);
  expect(await body(components)).toEqual(['export * as Zebra from "./Zebra";']);

  put(`${copy}/Alpha.ts`, "export type Alpha = string;");
  put(`${components}/Alpha.tsx`, draft("Alpha"));
  await generateEntries(root);
  expect(await body(copy)).toEqual([
    'export * from "./Alpha";',
    'export * from "./Zebra";',
    'export * from "./helper";',
  ]);
  expect(await body(components)).toEqual([
    'export * as Alpha from "./Alpha";',
    'export * as Zebra from "./Zebra";',
  ]);

  await rm(join(src, copy, "Zebra.ts"));
  await rm(join(src, components, "Zebra.tsx"));
  await generateEntries(root);
  expect(await body(copy)).toEqual(['export * from "./Alpha";', 'export * from "./helper";']);
  expect(await body(components)).toEqual(['export * as Alpha from "./Alpha";']);
  expect(await readFile(join(src, pack, "index.ts"), "utf8")).toBe(packDoor);
});
