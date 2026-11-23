import { writeFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath, URL } from "node:url";
import { build, type BuildOptions } from "esbuild";
import ts from "typescript";
import { packRendererPath, scanEntries } from "./entries";
import { assertRuntimeBundle, runtimeBundle } from "./runtime-bundle";
import { checkRendererScope } from "./renderer-graph";
import { checkEntryTypes } from "./check-entry-types";

async function kitEntries(root: string) {
  const { packs } = await scanEntries(root);
  return {
    kit: "src/entry/kit.ts",
    "kit-runtime": "src/entry/kit-runtime.ts",
    "renderers/core": "src/entry/core-renderers.ts",
    ...Object.fromEntries(
      packs.map(({ id }, index) => [`renderers/${id}`, `src/entry/${packRendererPath(index, id)}`]),
    ),
  };
}

export async function buildKit(emitDeclarations = true) {
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const entries = await kitEntries(root);
  const config = {
    absWorkingDir: root,
    outdir: resolve(root, "dist"),
    bundle: true,
    format: "esm",
    platform: "neutral",
    target: "es2022",
    packages: "external",
    metafile: true,
    logOverride: { "import-is-undefined": "error" },
    plugins: [runtimeBundle(root)],
  } satisfies BuildOptions;
  const tamagui = { "kit-tamagui": "src/kit/tamagui/index.ts" };
  const [kit, design] = await Promise.all([
    build({ ...config, entryPoints: entries, chunkNames: "chunks/[name]-[hash]", splitting: true }),
    build({ ...config, entryPoints: tamagui }),
  ]);
  assertRuntimeBundle(kit.metafile);
  assertRuntimeBundle(design.metafile);
  checkRendererScope(kit.metafile, "dist/kit-runtime.js");
  for (const name of Object.keys(entries).filter((name) => name.startsWith("renderers/"))) {
    checkRendererScope(
      kit.metafile,
      `dist/${name}.js`,
      name === "renderers/core" ? undefined : name.split("/")[1],
    );
  }
  if (emitDeclarations) {
    await emitTypes(root, { ...entries, ...tamagui });
    checkEntryTypes(root);
  }
  console.log("Built kit, core and pack renderer entries with shared chunks and external peers.");
}

async function emitTypes(root: string, entries: Record<string, string>) {
  const outDir = resolve(root, "dist/kit-types");
  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.ReactJSX,
    strict: true,
    noUncheckedIndexedAccess: true,
    exactOptionalPropertyTypes: true,
    skipLibCheck: true,
    declaration: true,
    emitDeclarationOnly: true,
    rootDir: resolve(root, "src"),
    outDir,
  };
  const host = ts.createCompilerHost(options);
  const write = host.writeFile.bind(host);
  host.writeFile = (file, source, ...args) => {
    const path = relative(outDir, file);
    // Catalog symbols and other nominal types must have one declaration identity across both builds.
    if (path.startsWith(`catalog${sep}`)) {
      const target = relative(dirname(file), resolve(root, "dist/types", path)).replace(/\.d\.ts$/, "");
      source = `export * from "${target.split(sep).join("/")}";\n`;
    }
    write(file, source, ...args);
  };
  const program = ts.createProgram(
    Object.values(entries).map((entry) => resolve(root, entry)),
    options,
    host,
  );
  const result = program.emit();
  const errors = [...ts.getPreEmitDiagnostics(program), ...result.diagnostics];
  if (errors.length)
    throw new Error(
      errors.map((error) => ts.flattenDiagnosticMessageText(error.messageText, "\n")).join("\n"),
    );
  for (const [name, entry] of Object.entries(entries)) {
    const relative = name.includes("/") ? "../" : "./";
    const target = entry.replace(/^src\//, "").replace(/\.ts$/, "");
    await writeFile(resolve(root, `dist/${name}.d.ts`), `export * from "${relative}kit-types/${target}";\n`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await buildKit();
