import { readFile } from "node:fs/promises";
import ts from "typescript";

export async function readOptional(file: string) {
  return readFile(file, "utf8").catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") throw error;
    return undefined;
  });
}

export const parseSource = (file: string, source: string) =>
  ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);

export function initializerNamed(ast: ts.SourceFile, name: string) {
  return ast.statements
    .filter(ts.isVariableStatement)
    .flatMap(({ declarationList }) => [...declarationList.declarations])
    .find((node) => ts.isIdentifier(node.name) && node.name.text === name)?.initializer;
}

export function unwrapExpression(value?: ts.Expression) {
  while (value && (ts.isAsExpression(value) || ts.isSatisfiesExpression(value))) value = value.expression;
  return value;
}

export function objectNamed(ast: ts.SourceFile, name: string) {
  const value = unwrapExpression(initializerNamed(ast, name));
  return value && ts.isObjectLiteralExpression(value) ? value : undefined;
}

export function propertyName(node: ts.ObjectLiteralElementLike) {
  const name = node.name;
  return name && (ts.isIdentifier(name) || ts.isStringLiteral(name)) ? name.text : undefined;
}

export type Edit = { start: number; end: number; text: string };

export function applyEdits(source: string, edits: readonly Edit[]) {
  for (const { start, end, text } of [...edits].sort((a, b) => b.start - a.start))
    source = source.slice(0, start) + text + source.slice(end);
  return source;
}

export function removeProperty(source: string, node: ts.ObjectLiteralElementLike): Edit {
  const start = node.getStart();
  const end = node.getEnd() + (/^[ \t]*,/.exec(source.slice(node.getEnd()))?.[0].length ?? 0);
  const line = source.lastIndexOf("\n", start - 1) + 1;
  const newline = /^[ \t]*\r?\n/.exec(source.slice(end));
  if (newline && /^[ \t]*$/.test(source.slice(line, start)))
    return { start: line, end: end + newline[0].length, text: "" };
  if (newline) {
    const gap = /[ \t]+$/.exec(source.slice(line, start))?.[0].length ?? 0;
    return { start: start - gap, end, text: "" };
  }
  return { start, end, text: "" };
}
