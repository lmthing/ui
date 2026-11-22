import { basename, dirname, join, relative } from "node:path";
import ts from "typescript";
import {
  defaultLiteralStyle,
  parsePrompt,
  promptLiteralStyle,
  promptModule,
  renderPrompt,
  type PromptField,
  type PromptLiteralStyle,
  type PromptText,
} from "../build/entries";
import { applyEdits, objectNamed, parseSource, propertyName, readOptional, removeProperty } from "./source";

const fields: ReadonlySet<string> = new Set<PromptField>(["purpose", "pick", "writeHints"]);

function stringValue(node: ts.Node) {
  if (ts.isStringLiteralLike(node)) return node.text;
  throw new Error(`${node.getSourceFile().fileName}: expected literal prompt text at ${node.getText()}`);
}

function inlineText(nodes: readonly ts.PropertyAssignment[]): Partial<PromptText> {
  return Object.fromEntries(
    nodes.map((node) => {
      const name = propertyName(node)!;
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

function inlineStyle(nodes: readonly ts.PropertyAssignment[]) {
  const style: Partial<PromptLiteralStyle> = {};
  const quote = (node: ts.Node) => (node.getText()[0] === "'" ? "s" : "d");
  for (const node of nodes) {
    const field = propertyName(node) as PromptField;
    const value = node.initializer;
    if (field !== "writeHints") {
      style[field] = quote(value);
    } else if (ts.isArrayLiteralExpression(value)) {
      const layout = value.getText().includes("\n") ? "m" : "i";
      style.writeHints = `${layout}${value.elements.hasTrailingComma ? "c" : "n"}${value.elements.map(quote).join("")}`;
    }
  }
  return style;
}

function promptImport(ast: ts.SourceFile, root: string, file: string) {
  const name = basename(file, ".tsx");
  const module = relative(dirname(file), join(root, "src/entry", promptModule(name)));
  const present = ast.statements.some(
    (node) =>
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      node.moduleSpecifier.text === module,
  );
  if (present) return [];
  const insert = ast.statements.find((node) => !ts.isImportDeclaration(node))?.getFullStart() ?? 0;
  return [
    {
      start: insert,
      end: insert,
      text: `${insert ? "\n" : ""}import { prompt } from "${module}";${insert ? "" : "\n"}`,
    },
  ];
}

export async function splitPrompt(root: string, file: string, source: string) {
  const ast = parseSource(file, source);
  const meta = objectNamed(ast, "meta");
  if (!meta) return [];
  const literals = meta.properties.filter(
    (node): node is ts.PropertyAssignment =>
      ts.isPropertyAssignment(node) && fields.has(propertyName(node) ?? ""),
  );
  const references = new Set(
    literals.filter((node) => node.initializer.getText() === `prompt.${propertyName(node)}`),
  );
  const inline = literals.filter(
    ({ initializer }) => ts.isStringLiteralLike(initializer) || ts.isArrayLiteralExpression(initializer),
  );
  if (!inline.length) return [];

  const path = file.replace(/\.tsx$/, ".prompt.md");
  const previous = await readOptional(path);
  const prior = previous === undefined ? undefined : parsePrompt(path, previous);
  const text = { ...prior, ...inlineText(inline) };
  if (text.purpose === undefined || text.pick === undefined)
    throw new Error(`${file}: cannot split without purpose and pick`);

  const bound = new Set(Array.from(references, propertyName));
  const component = applyEdits(source, [
    ...inline.map((node) => {
      const field = propertyName(node)!;
      return bound.has(field)
        ? removeProperty(source, node)
        : { start: node.initializer.getStart(), end: node.initializer.getEnd(), text: `prompt.${field}` };
    }),
    ...promptImport(ast, root, file),
  ]);
  const resolved = {
    purpose: text.purpose,
    pick: text.pick,
    ...(text.writeHints === undefined ? {} : { writeHints: text.writeHints }),
  };
  const style = {
    ...defaultLiteralStyle(resolved),
    ...(prior && promptLiteralStyle(previous!, prior)),
    ...inlineStyle(inline),
  };
  return [
    [path, renderPrompt(path, resolved, style)],
    [file, component],
  ] as const;
}
