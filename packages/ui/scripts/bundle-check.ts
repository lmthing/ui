import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, URL } from "node:url";
import { build, type Plugin } from "esbuild";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const forbidden = /^(react(?:-native|-dom)?(?:\/|$)|tamagui(?:\/|$)|@tamagui\/)/;

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
  const program = ts.createProgram([resolve(root, "src/entry/catalog.ts")], options, host);
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

export async function bundleCheck() {
  await mkdir(resolve(root, "dist"), { recursive: true });
  const result = await build({
    entryPoints: [resolve(root, "src/entry/catalog.ts")],
    outfile: resolve(root, "dist/catalog.js"),
    bundle: true,
    format: "esm",
    platform: "node",
    target: "es2022",
    packages: "bundle",
    external: ["zod"],
    plugins: [stubs],
    metafile: true,
    minify: true,
    treeShaking: true,
  });
  const source = await readFile(resolve(root, "dist/catalog.js"), "utf8");
  if (
    /\b(?:react|react-native|tamagui)\b/i.test(source) ||
    Object.keys(result.metafile.inputs).some((file) => /node_modules\/.*(?:react|tamagui)/.test(file))
  ) {
    throw new Error("React or Tamagui leaked into the catalog bundle");
  }
  emitTypes();
  await writeFile(resolve(root, "dist/catalog.d.ts"), 'export * from "./types/entry/catalog";\n');
  const catalog = await import(new URL("../dist/catalog.js", import.meta.url).href);
  const registry = catalog.createRegistry({ includeDrafts: true });
  for (const id of registry.ids) {
    const def = registry.get(id);
    for (const example of def.examples) def.props.parse(example);
    def.props.parse(def.fallback({ cast: { things: [], items: [] } }));
  }
  console.log(
    `Catalog bundle passed: ${Buffer.byteLength(source)} bytes, ${registry.ids.length} component(s), no React/Tamagui.`,
  );
}

await bundleCheck();
