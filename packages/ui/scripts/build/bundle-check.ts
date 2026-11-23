import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, URL } from "node:url";
import { build, type Plugin } from "esbuild";
import ts from "typescript";
import { gzipSync } from "node:zlib";
import type { Definition } from "../../src/catalog";
import { assertRuntimeBundle, runtimeBundle } from "./runtime-bundle";

const root = fileURLToPath(new URL("../../", import.meta.url));
const forbidden = /^(react(?:-native(?:-web)?|-dom)?(?:\/|$)|tamagui(?:\/|$)|@tamagui\/)/;

export function hasCatalogLeak(source: string, inputs: readonly string[] = []): boolean {
  const ast = ts.createSourceFile("catalog.js", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  function visit(node: ts.Node): boolean {
    let specifier: ts.Node | undefined;
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) specifier = node.moduleSpecifier;
    if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && /^(?:require|__require)$/.test(node.expression.text)))
    )
      specifier = node.arguments[0];
    if (specifier && ts.isStringLiteralLike(specifier) && forbidden.test(specifier.text)) return true;
    return ts.forEachChild(node, visit) ?? false;
  }
  return (
    visit(ast) ||
    inputs.some((file) =>
      `/${file.replace(/\\/g, "/")}`
        .split("/node_modules/")
        .slice(1)
        .some((specifier) => forbidden.test(specifier)),
    )
  );
}

function imports(source: string, file: string) {
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  return ast.statements.filter(ts.isImportDeclaration);
}

const stubs: Plugin = {
  name: "data-only",
  setup(builder) {
    builder.onResolve({ filter: /.*/ }, async (args) => {
      if (!args.importer) return;
      const path = resolve(dirname(args.importer), args.path);
      if (!forbidden.test(args.path) && !path.startsWith(resolve(root, "src/kit"))) return;
      if (args.importer.includes("/src/catalog/")) throw new Error(`Forbidden catalog import: ${args.path}`);
      const source = await readFile(args.importer, "utf8");
      const node = imports(source, args.importer).find(
        (entry) => (entry.moduleSpecifier as ts.StringLiteral).text === args.path,
      );
      const bindings = node?.importClause?.namedBindings;
      const names =
        bindings && ts.isNamedImports(bindings)
          ? bindings.elements.map((entry) => entry.propertyName?.text ?? entry.name.text)
          : [];
      if (/react\/jsx/.test(args.path)) names.push("jsx", "jsxs", "jsxDEV", "Fragment");
      return { path: `stub:${names.join(",")}`, namespace: "view-stub" };
    });
    builder.onLoad({ filter: /.*/, namespace: "view-stub" }, (args) => ({
      contents: `export default undefined;\n${args.path
        .slice("stub:".length)
        .split(",")
        .filter(Boolean)
        .map((name) => `export const ${name} = undefined;`)
        .join("\n")}`,
      loader: "js",
    }));
    builder.onLoad({ filter: /\.[jt]sx?$/ }, async (args) => {
      if (!args.path.includes("/src/catalog/")) return;
      const contents = await readFile(args.path, "utf8");
      if (
        imports(contents, args.path).some((node) =>
          forbidden.test((node.moduleSpecifier as ts.StringLiteral).text),
        )
      ) {
        throw new Error(`Forbidden React or Tamagui import in ${args.path}`);
      }
      return { contents, loader: "ts" };
    });
  },
};

function emitTypes() {
  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    strict: true,
    jsx: ts.JsxEmit.Preserve,
    noUncheckedIndexedAccess: true,
    exactOptionalPropertyTypes: true,
    skipLibCheck: true,
    declaration: true,
    emitDeclarationOnly: true,
    outDir: resolve(root, "dist/types"),
    rootDir: resolve(root, "src"),
  };
  const host = ts.createCompilerHost(options);
  const getSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (file, ...args) => {
    const ast = getSourceFile(file, ...args);
    if (!ast || !file.endsWith(".tsx")) return ast;
    const statements = ast.statements.filter(
      (node) =>
        !(ts.isFunctionDeclaration(node) && node.name && /^[A-Z]/.test(node.name.text)) &&
        !(ts.isImportDeclaration(node) && (node.moduleSpecifier as ts.StringLiteral).text.includes("/kit")),
    );
    const source = ts.createPrinter().printFile(ts.factory.updateSourceFile(ast, statements));
    return ts.createSourceFile(file, source, options.target!, true, ts.ScriptKind.TS);
  };
  const program = ts.createProgram(
    ["catalog", "catalog-browser"].map((name) => resolve(root, `src/entry/${name}.ts`)),
    options,
    host,
  );
  const result = program.emit();
  const diagnostics = [...ts.getPreEmitDiagnostics(program), ...result.diagnostics];
  if (diagnostics.length)
    throw new Error(
      ts.formatDiagnosticsWithColorAndContext(diagnostics, {
        getCanonicalFileName: (file) => file,
        getCurrentDirectory: () => root,
        getNewLine: () => "\n",
      }),
    );
}

async function buildCatalog(name: string, readyPacks?: readonly string[]) {
  const browser = readyPacks !== undefined;
  const result = await build({
    entryPoints: [resolve(root, `src/entry/${name}.ts`)],
    outfile: resolve(root, `dist/${name}.js`),
    bundle: true,
    format: "esm",
    platform: browser ? "browser" : "node",
    target: "es2022",
    packages: "bundle",
    external: ["zod"],
    plugins: browser ? [runtimeBundle(root, true), stubs] : [stubs],
    ...(browser ? { define: { READY_PACKS: JSON.stringify(readyPacks) } } : {}),
    metafile: true,
    minify: true,
    treeShaking: true,
    logOverride: { "import-is-undefined": "silent" },
  });
  const source = await readFile(resolve(root, `dist/${name}.js`), "utf8");
  if (hasCatalogLeak(source, Object.keys(result.metafile.inputs))) {
    throw new Error(`React or Tamagui leaked into ${name}`);
  }
  if (browser) assertRuntimeBundle(result.metafile);
  return { bytes: Buffer.byteLength(source), gzip: gzipSync(source).byteLength };
}

function checkBrowserCatalog(
  catalog: typeof import("../../src/entry/catalog"),
  browser: typeof import("../../src/entry/catalog-browser"),
) {
  const input = { cast: { things: [], items: [] } };
  const fullDefs: Record<string, Definition> = catalog.components;
  const slimDefs: Record<string, Definition> = browser.components;
  assert.deepEqual(Object.keys(browser.components), Object.keys(catalog.components));
  assert.deepEqual(browser.packOf, catalog.packOf);
  for (const options of [{}, { packs: catalog.packIds }, { packs: catalog.packIds, includeDrafts: true }]) {
    assert.deepEqual(browser.createRegistry(options).ids, catalog.createRegistry(options).ids);
  }
  for (const id of catalog.packIds) assert.equal(browser.packReady(id), catalog.packReady(id), id);
  for (const [id, full] of Object.entries(fullDefs)) {
    const slim = slimDefs[id]!;
    assert.equal(slim.meta.purpose, "", id);
    assert.equal(slim.meta.pick, "", id);
    assert.equal(slim.meta.realPath, "", id);
    assert.equal(slim.meta.writeHints, undefined, id);
    assert.equal(slim.meta.previewDeviceData, undefined, id);
    assert.deepEqual(slim.examples, [], id);
    assert.deepEqual(slim.probes, [], id);
    const fallback = full.fallback(input);
    assert.deepEqual(slim.fallback(input), fallback, id);
    for (const value of [...full.examples, fallback])
      assert.deepEqual(slim.props.safeParse(value), full.props.safeParse(value), id);
  }
}

export async function bundleCheck(emitDeclarations = true) {
  await mkdir(resolve(root, "dist"), { recursive: true });
  const full = await buildCatalog("catalog");
  const catalog = await import(new URL("../../dist/catalog.js", import.meta.url).href);
  const slim = await buildCatalog("catalog-browser", catalog.packIds.filter(catalog.packReady));
  const browser = await import(new URL("../../dist/catalog-browser.js", import.meta.url).href);
  checkBrowserCatalog(catalog, browser);
  if (emitDeclarations) {
    emitTypes();
    for (const name of ["catalog", "catalog-browser"])
      await writeFile(resolve(root, `dist/${name}.d.ts`), `export * from "./types/entry/${name}";\n`);
  }
  const variantIssues = Object.values(catalog.components).flatMap(catalog.checkVariantDeclarations);
  if (variantIssues.length) throw new Error(variantIssues.join("\n"));
  const registry = catalog.createRegistry({ includeDrafts: true });
  for (const id of registry.ids) {
    const def = registry.get(id);
    for (const example of def.examples) def.props.parse(example);
    def.props.parse(def.fallback({ cast: { things: [], items: [] } }));
  }
  console.log(
    `Catalog bundles passed: full ${full.bytes} bytes (${full.gzip} gzip), browser ${slim.bytes} bytes ` +
      `(${slim.gzip} gzip), ${Object.keys(browser.components).length} matching definitions, no React/Tamagui.`,
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await bundleCheck();
