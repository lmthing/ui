import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, URL } from "node:url";
import ts from "typescript";
import { parsePrompt, promptLiteralStyle, replayLiteral } from "../build/entries";

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

function withResolvedPrompt(source: string, ast: ts.SourceFile, meta: ts.Node, markdown: string) {
  const text = parsePrompt("component.prompt.md", markdown);
  const style = promptLiteralStyle(markdown, text);
  for (const node of withoutStatus(meta).reverse()) {
    if (!ts.isPropertyAssignment(node) || !ts.isPropertyAccessExpression(node.initializer)) continue;
    const field = ts.isStringLiteral(node.name) || ts.isIdentifier(node.name) ? node.name.text : undefined;
    if (field !== "purpose" && field !== "pick" && field !== "writeHints") continue;
    const { expression, name } = node.initializer;
    if (!ts.isIdentifier(expression) || expression.text !== "prompt" || name.text !== field) continue;
    const literal = replayLiteral(field, text, style);
    if (literal === undefined) throw new Error(`component.prompt.md: missing ${field}`);
    source =
      source.slice(0, node.initializer.getStart(ast)) + literal + source.slice(node.initializer.getEnd());
  }
  return source;
}

/** Include local validation and metadata code, even when it cannot be represented as JSON Schema. */
export function definitionSource(source: string, markdown?: string): string {
  const ast = ts.createSourceFile("component.tsx", source, ts.ScriptTarget.Latest, true);
  const nodes = declarations(ast);
  if (!exports.every((name) => nodes.has(name))) return "";
  // Preserve the source representation existing evidence was keyed on, including inline literal syntax.
  if (markdown !== undefined)
    return definitionSource(withResolvedPrompt(source, ast, nodes.get("meta")!, markdown));
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
    if (path) {
      const source = readFileSync(join(root, path), "utf8");
      const prompt = join(root, path.replace(/\.tsx$/, ".prompt.md"));
      const markdown = source.includes("/entry/prompt-") ? readFileSync(prompt, "utf8") : undefined;
      definitions.set(id, definitionSource(source, markdown));
    }
  }
  return definitions.get(id);
}
