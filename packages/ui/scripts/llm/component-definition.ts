import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, URL } from "node:url";
import ts from "typescript";

const root = fileURLToPath(new URL("../../src/", import.meta.url));
const paths = new Map<string, string | undefined>();
const definitions = new Map<string, string>();
const exports = ["props", "meta"];

export function componentPath(id: string): string | undefined {
  if (!/^[A-Z][A-Za-z0-9]*$/.test(id)) return;
  if (!paths.has(id)) {
    const name = `${id}.tsx`;
    const candidates = [
      `components/${name}`,
      `surfaces/${name}`,
      ...readdirSync(join(root, "packs")).map((pack) => `packs/${pack}/components/${name}`),
    ];
    paths.set(
      id,
      candidates.find((path) => existsSync(join(root, path))),
    );
  }
  return paths.get(id);
}

function declarations(ast: ts.SourceFile) {
  const nodes = new Map<string, ts.Node>();
  for (const statement of ast.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name) nodes.set(statement.name.text, statement);
    if (ts.isVariableStatement(statement))
      for (const { name, initializer } of statement.declarationList.declarations)
        if (ts.isIdentifier(name) && initializer) nodes.set(name.text, initializer);
  }
  return nodes;
}

function withoutStatus(node: ts.Node): ts.Node[] {
  if (ts.isSatisfiesExpression(node) || ts.isAsExpression(node)) return withoutStatus(node.expression);
  return ts.isObjectLiteralExpression(node)
    ? node.properties.filter(({ name }) => !name || name.getText().replace(/^["']|["']$/g, "") !== "status")
    : [node];
}

/** Include local validation and metadata code, even when it cannot be represented as JSON Schema. */
export function definitionSource(source: string): string {
  const ast = ts.createSourceFile("component.tsx", source, ts.ScriptTarget.Latest, true);
  const nodes = declarations(ast);
  if (!exports.every((name) => nodes.has(name))) return "";
  const seen = new Map<string, string>();
  const printer = ts.createPrinter({ removeComments: true });
  function visit(name: string) {
    const node = nodes.get(name);
    if (!node || seen.has(name)) return;
    const parts = name === "meta" ? withoutStatus(node) : [node];
    seen.set(name, parts.map((part) => printer.printNode(ts.EmitHint.Unspecified, part, ast)).join("\n"));
    function references(child: ts.Node) {
      if (
        ts.isIdentifier(child) &&
        !(ts.isPropertyAccessExpression(child.parent) && child === child.parent.name) &&
        !(ts.isPropertyAssignment(child.parent) && child === child.parent.name)
      )
        visit(child.text);
      if (!ts.isTypeNode(child)) ts.forEachChild(child, references);
    }
    parts.forEach(references);
  }
  exports.forEach(visit);
  return JSON.stringify([...seen.entries()].sort());
}

export function currentDefinitionSource(id: string): string | undefined {
  if (!definitions.has(id)) {
    const path = componentPath(id);
    if (path) definitions.set(id, definitionSource(readFileSync(join(root, path), "utf8")));
  }
  return definitions.get(id);
}
