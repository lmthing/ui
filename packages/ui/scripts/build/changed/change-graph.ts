import { existsSync, readFileSync } from "node:fs";
import { dirname, extname, join, normalize } from "node:path/posix";
import ts from "typescript";
import { importNames, namespaceUses } from "./namespace-uses";

type Edge = { file: string; names?: string[] };
type Module = {
  imports: Edge[];
  named: Map<string, Edge>;
  stars: Edge[];
  locals: Set<string>;
  barrel: boolean;
  source: string;
};

const extensions = [".web.js", ".web.ts", ".web.tsx", ".mjs", ".js", ".ts", ".tsx", ".json"];
const bridges: Record<string, string> = {
  "@lmthing/ui/catalog": "src/catalog",
  "@lmthing/ui/kit": "src/kit",
  "src/entry/catalog.ts": "src/catalog",
  "src/entry/kit.ts": "src/kit",
};

function exportedNames(node: ts.Statement): string[] {
  if (ts.isExportAssignment(node)) return ["default"];
  if (!ts.canHaveModifiers(node)) return [];
  const modifiers = ts.getModifiers(node);
  if (!modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) return [];
  if (modifiers.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword)) return ["default"];
  const keys = (name: ts.BindingName): string[] =>
    ts.isIdentifier(name)
      ? [name.text]
      : name.elements.flatMap((element) => ("name" in element ? keys(element.name) : []));
  if (ts.isVariableStatement(node))
    return node.declarationList.declarations.flatMap(({ name }) => keys(name));
  if (
    ts.isFunctionDeclaration(node) ||
    ts.isClassDeclaration(node) ||
    ts.isTypeAliasDeclaration(node) ||
    ts.isInterfaceDeclaration(node) ||
    ts.isEnumDeclaration(node) ||
    ts.isModuleDeclaration(node)
  ) {
    return node.name ? [node.name.text] : [];
  }
  return [];
}

function collectExports(mod: Module, clause: ts.ExportDeclaration["exportClause"], file?: string) {
  if (!clause) {
    if (file) mod.stars.push({ file });
  } else if (ts.isNamespaceExport(clause)) {
    if (file) mod.named.set(clause.name.text, { file });
  } else {
    for (const { name, propertyName, isTypeOnly } of clause.elements) {
      if (isTypeOnly) continue;
      if (file) mod.named.set(name.text, { file, names: [(propertyName ?? name).text] });
      else mod.locals.add(name.text);
    }
  }
}

function parse(file: string, source: string, resolve: (specifier: string) => string | undefined): Module {
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest);
  const namespaces = namespaceUses(ast);
  const mod: Module = {
    imports: [],
    named: new Map(),
    stars: [],
    locals: new Set(),
    source,
    barrel: ast.statements.every((node) => ts.isExportDeclaration(node) || ts.isEmptyStatement(node)),
  };
  for (const node of ast.statements) {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      const specifier = node.moduleSpecifier;
      const file = specifier && ts.isStringLiteral(specifier) ? resolve(specifier.text) : undefined;
      if (ts.isExportDeclaration(node)) {
        if (!node.isTypeOnly) collectExports(mod, node.exportClause, file);
      } else if (file) {
        const names = importNames(node.importClause, namespaces);
        if (names !== null) mod.imports.push({ file, ...(names ? { names } : {}) });
      }
    } else {
      for (const name of exportedNames(node)) mod.locals.add(name);
    }
  }
  if (/\b(?:import|require)\s*\(/.test(source)) {
    const visit = (node: ts.Node) => {
      if (
        ts.isCallExpression(node) &&
        (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
          (ts.isIdentifier(node.expression) && node.expression.text === "require"))
      ) {
        const argument = node.arguments[0];
        const file = argument && ts.isStringLiteralLike(argument) ? resolve(argument.text) : undefined;
        if (file) mod.imports.push({ file });
      }
      ts.forEachChild(node, visit);
    };
    visit(ast);
  }
  return mod;
}

function resolveLocal(
  root: string,
  known: Set<string>,
  resolved: Map<string, string | undefined>,
  specifier: string,
  importer: string,
) {
  const local = specifier.startsWith(".") ? normalize(join(dirname(importer), specifier)) : specifier;
  const target = bridges[local] ?? local;
  if (local === target && !specifier.startsWith(".")) return;
  if (resolved.has(target)) return resolved.get(target);
  const ext = extname(target);
  const stem = ext === ".js" || ext === ".mjs" ? target.slice(0, -ext.length) : target;
  const candidates = [
    ...(ext ? [target] : []),
    ...extensions.map((suffix) => `${stem}${suffix}`),
    ...extensions.map((suffix) => `${target}/index${suffix}`),
  ];
  const file = candidates.find((file) => known.has(file) || existsSync(join(root, file)));
  resolved.set(target, file);
  return file;
}

function dependencyPaths(file: string, load: (file: string) => Module | undefined, known: Set<string>) {
  const reached = new Set<string>(),
    visited = new Set<string>();
  function exportOf(file: string, name: string, seen: Set<string>): Edge[] | undefined {
    if (seen.has(file)) return;
    const mod = load(file);
    if (!mod) return known.has(file) ? [{ file }] : undefined;
    if (mod.locals.has(name)) return [{ file }];
    const named = mod.named.get(name);
    if (named) return [{ file }, named];
    if (name === "default") return;
    seen.add(file);
    for (const star of mod.stars) {
      const chain = exportOf(star.file, name, seen);
      if (chain) return [{ file }, ...chain];
    }
  }
  function visit({ file, names }: Edge) {
    reached.add(file);
    const mod = load(file);
    if (!mod) return;
    if (mod.barrel && names?.length) {
      for (const name of names) {
        const key = `${file}:${name}`;
        if (visited.has(key)) continue;
        visited.add(key);
        const chain = exportOf(file, name, new Set());
        if (chain && chain.length > 1) {
          for (const edge of chain.slice(1, -1)) {
            reached.add(edge.file);
            if (!load(edge.file)?.barrel) visit(edge);
          }
          visit(chain.at(-1)!);
        }
      }
      return;
    }
    if (visited.has(file)) return;
    visited.add(file);
    for (const edge of [...mod.imports, ...mod.named.values(), ...mod.stars]) visit(edge);
  }
  visit({ file });
  return reached;
}

/** Follow the names consumed through re-export-only doors, not every registry member. */
export function changeGraph(root: string, changed: readonly string[]) {
  const known = new Set(changed);
  const resolved = new Map<string, string | undefined>();
  const modules = new Map<string, Module | undefined>();
  function load(file: string) {
    if (modules.has(file)) return modules.get(file);
    const mod =
      /^src\/entry\//.test(file) ||
      file === "test/render.tsx" ||
      !/\.[cm]?[jt]sx?$/.test(file) ||
      !existsSync(join(root, file))
        ? undefined
        : parse(file, readFileSync(join(root, file), "utf8"), (specifier) =>
            resolveLocal(root, known, resolved, specifier, file),
          );
    modules.set(file, mod);
    return mod;
  }
  return {
    dependencies: (file: string) => dependencyPaths(file, load, known),
    source: (file: string) => load(file)?.source ?? "",
  };
}
