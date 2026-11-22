import { globSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import ts from "typescript";
import { applyEdits, objectNamed, parseSource, propertyName } from "./source";
import { identifiers } from "./word-owners";

export const wordsBinding = (owner: string) => `${owner}Words`;

export async function wordFragments(file: string) {
  const files = globSync("en/*.ts", { cwd: dirname(file) });
  return new Map(
    await Promise.all(
      files.sort().map(async (path) => {
        const target = join(dirname(file), path);
        const ast = parseSource(target, await readFile(target, "utf8"));
        const object = objectNamed(ast, "words");
        if (!object) throw new Error(`${target}: expected a words object`);
        return [basename(path, ".ts"), { target, ast, object }] as const;
      }),
    ),
  );
}

function dependencyNames(node: ts.Statement): string[] {
  if (ts.isImportDeclaration(node)) {
    const { name, namedBindings } = node.importClause ?? {};
    const local =
      namedBindings &&
      (ts.isNamedImports(namedBindings)
        ? namedBindings.elements.map((entry) => entry.name)
        : [namedBindings.name]);
    return [...(name ? [name.text] : []), ...(local?.map((entry) => entry.text) ?? [])];
  }
  if (ts.isVariableStatement(node))
    return node.declarationList.declarations.flatMap(({ name }) =>
      ts.isIdentifier(name) ? [name.text] : [],
    );
  if (ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isFunctionDeclaration(node))
    return node.name ? [node.name.text] : [];
  return [];
}

export function dependencies(ast: ts.SourceFile, object: ts.ObjectLiteralExpression) {
  return ast.statements
    .filter(
      (node) =>
        node.getEnd() < object.getStart() &&
        (!ts.isImportDeclaration(node) ||
          !ts.isStringLiteral(node.moduleSpecifier) ||
          !node.moduleSpecifier.text.startsWith("./en/")),
    )
    .map((node) => ({ node, names: dependencyNames(node) }))
    .filter(({ names }) => names.length);
}

function dependencySource(node: ts.Statement) {
  const source = node.getFullText().trim();
  if (
    !ts.isImportDeclaration(node) ||
    !ts.isStringLiteral(node.moduleSpecifier) ||
    !node.moduleSpecifier.text.startsWith(".")
  )
    return source;
  const path = node.moduleSpecifier.text;
  const rebased = path.startsWith("./") ? `../${path.slice(2)}` : `../${path}`;
  const quote = node.moduleSpecifier.getText()[0]!;
  return source.replace(`${quote}${path}${quote}`, JSON.stringify(rebased));
}

export function usedDependencies(nodes: readonly ts.Node[], available: ReturnType<typeof dependencies>) {
  const used = new Set(nodes.flatMap((node) => [...identifiers(node)]));
  const selected = new Set<ts.Statement>();
  let size: number;
  do {
    size = selected.size;
    for (const { node, names } of available) {
      if (!selected.has(node) && names.some((name) => used.has(name))) {
        selected.add(node);
        for (const name of identifiers(node)) used.add(name);
      }
    }
  } while (size !== selected.size);
  return available.filter(({ node }) => selected.has(node)).map(({ node }) => node);
}

function withoutBindings(node: ts.Statement, names: readonly string[]) {
  if (dependencyNames(node).every((name) => names.includes(name))) return "";
  if (!ts.isImportDeclaration(node) || !node.importClause)
    throw new Error(`${node.getSourceFile().fileName}: merge the overlapping declaration ${node.getText()}`);
  const clause = node.importClause;
  const { factory } = ts;
  const name = clause.name && !names.includes(clause.name.text) ? clause.name : undefined;
  let bindings = clause.namedBindings;
  if (bindings && ts.isNamedImports(bindings)) {
    const elements = bindings.elements.filter(({ name }) => !names.includes(name.text));
    bindings = elements.length ? factory.updateNamedImports(bindings, elements) : undefined;
  } else if (bindings && names.includes(bindings.name.text)) bindings = undefined;
  const remaining = factory.updateImportClause(clause, clause.isTypeOnly, name, bindings);
  const declaration = factory.updateImportDeclaration(
    node,
    node.modifiers,
    remaining,
    node.moduleSpecifier,
    node.attributes,
  );
  return ts.createPrinter().printNode(ts.EmitHint.Unspecified, declaration, node.getSourceFile());
}

function mergeDeclarations(prefix: string, group: readonly ts.Statement[], imports = false) {
  if (!group.length) return prefix;
  const incoming = group.map(dependencySource).join("\n");
  const names = group.flatMap(dependencyNames);
  const current = parseSource(group[0]!.getSourceFile().fileName, prefix);
  const conflicts = current.statements.filter((node) =>
    dependencyNames(node).some((name) => names.includes(name)),
  );
  if (!conflicts.length)
    return (imports ? [incoming, prefix] : [prefix, incoming]).filter(Boolean).join("\n");
  return applyEdits(
    prefix,
    conflicts.map((node, index) => ({
      start: node.getStart(),
      end: node.getEnd(),
      text: [withoutBindings(node, names), index === 0 ? incoming : ""].filter(Boolean).join("\n"),
    })),
  );
}

function mergeSupport(prefix: string, support: readonly ts.Statement[]) {
  // Keep the original initialization order, including new helpers used by a replaced declaration.
  const withImports = mergeDeclarations(prefix, support.filter(ts.isImportDeclaration), true);
  return mergeDeclarations(
    withImports,
    support.filter((node) => !ts.isImportDeclaration(node)),
  );
}

export function fragmentSource(
  previous: ReturnType<typeof objectNamed>,
  props: readonly ts.ObjectLiteralElementLike[],
  support: readonly ts.Statement[],
  type: string | undefined,
  constant: boolean,
) {
  const values = new Map(previous?.properties.map((node) => [propertyName(node) ?? node.getText(), node]));
  for (const node of props) values.set(propertyName(node)!, node);
  let statement: ts.Node | undefined = previous;
  while (statement && !ts.isVariableStatement(statement)) statement = statement.parent;
  const prefix = mergeSupport(
    statement?.getSourceFile().text.slice(0, statement.getStart()).trim() ?? "",
    support,
  );
  const members = [...values.values()].map((node) => node.getFullText().trim());
  const check = type
    ? ` satisfies Pick<${type}, ${[...values.keys()].map((key) => JSON.stringify(key)).join(" | ")}>`
    : "";
  const typeImport =
    type && !prefix.includes(`import type { ${type} }`) ? [`import type { ${type} } from "..";`] : [];
  return [
    ...typeImport,
    prefix,
    `export const words = {\n${members.join(",\n")},\n}${constant ? " as const" : ""}${check};`,
  ]
    .filter(Boolean)
    .join("\n\n");
}
