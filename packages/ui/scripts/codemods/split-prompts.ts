import { basename, dirname, join, relative } from "node:path";
import ts from "typescript";
import { parsePrompt, promptModule, renderPrompt, type PromptText } from "../build/entries";
import { applyEdits, objectNamed, parseSource, propertyName, readOptional, removeProperty } from "./source";

const fields = new Set(["purpose", "pick", "writeHints"]);

function stringValue(node: ts.Node) {
  if (ts.isStringLiteralLike(node)) return node.text;
  throw new Error(`${node.getSourceFile().fileName}: expected literal prompt text at ${node.getText()}`);
}

function inlineText(nodes: readonly ts.ObjectLiteralElementLike[]): Partial<PromptText> {
  return Object.fromEntries(
    nodes.map((node) => {
      const name = propertyName(node)!;
      if (!ts.isPropertyAssignment(node)) throw new Error(`Expected inline assignment: ${node.getText()}`);
      const value = node.initializer;
      return [
        name,
        name === "writeHints" && ts.isArrayLiteralExpression(value)
          ? value.elements.map(stringValue)
          : stringValue(value),
      ];
    }),
  );
}

export async function splitPrompt(root: string, file: string, source: string) {
  const ast = parseSource(file, source);
  const meta = objectNamed(ast, "meta");
  if (!meta) return [];
  const inline = meta.properties.filter((node) => fields.has(propertyName(node) ?? ""));
  if (!inline.length) return [];

  const path = file.replace(/\.tsx$/, ".prompt.md");
  const previous = await readOptional(path);
  const text = { ...(previous === undefined ? {} : parsePrompt(path, previous)), ...inlineText(inline) };
  if (text.purpose === undefined || text.pick === undefined)
    throw new Error(`${file}: cannot split without purpose and pick`);

  const name = basename(file, ".tsx");
  const module = relative(dirname(file), join(root, "src/entry", promptModule(name)));
  const usingPrompt = ast.statements.some(
    (node) =>
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      node.moduleSpecifier.text === module,
  );
  const spreads = meta.properties.filter(
    (node) => ts.isSpreadAssignment(node) && node.expression.getText() === "prompt",
  );
  const first = spreads[0] ?? inline[0]!;
  const insert = ast.statements.find((node) => !ts.isImportDeclaration(node))?.getFullStart() ?? 0;
  const component = applyEdits(source, [
    ...[...inline, ...spreads].filter((node) => node !== first).map((node) => removeProperty(source, node)),
    { start: first.getStart(), end: first.getEnd(), text: "...prompt" },
    ...(usingPrompt
      ? []
      : [
          {
            start: insert,
            end: insert,
            text: `${insert ? "\n" : ""}import { prompt } from "${module}";${insert ? "" : "\n"}`,
          },
        ]),
  ]);
  return [
    [
      path,
      renderPrompt(path, {
        purpose: text.purpose,
        pick: text.pick,
        ...(text.writeHints === undefined ? {} : { writeHints: text.writeHints }),
      }),
    ],
    [file, component],
  ] as const;
}
