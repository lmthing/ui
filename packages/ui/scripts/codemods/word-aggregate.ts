import ts from "typescript";
import { applyEdits, objectNamed, parseSource, type Edit } from "./source";
import { dependencies, usedDependencies, wordsBinding } from "./word-fragments";

export function dictionaryType(object: ts.ObjectLiteralExpression) {
  let constant = false;
  let type: string | undefined;
  let node = object.parent;
  while (ts.isAsExpression(node) || ts.isSatisfiesExpression(node)) {
    if (ts.isAsExpression(node)) constant ||= node.type.getText() === "const";
    else type = node.type.getText();
    node = node.parent;
  }
  if (ts.isVariableDeclaration(node)) type ??= node.type?.getText();
  return { constant, type };
}

export function dropMovedSupport(file: string, source: string, moved: readonly ts.Statement[]) {
  const ast = parseSource(file, source);
  const object = objectNamed(ast, "en")!;
  const candidates = dependencies(ast, object).filter(({ node }) =>
    moved.some((previous) => previous.getText() === node.getText()),
  );
  const statements = candidates.map(({ node }) => node);
  const retained = usedDependencies(
    ast.statements.filter((node) => !statements.includes(node)),
    candidates,
  );
  return applyEdits(
    source,
    statements
      .filter(
        (node) =>
          !retained.includes(node) &&
          !(
            ts.canHaveModifiers(node) &&
            ts.getModifiers(node)?.some((flag) => flag.kind === ts.SyntaxKind.ExportKeyword)
          ),
      )
      .map((node) => ({ start: node.getFullStart(), end: node.getEnd(), text: "" })),
  );
}

function fragmentImports(ast: ts.SourceFile) {
  const imports = new Map<string, string>();
  for (const node of ast.statements) {
    if (!ts.isImportDeclaration(node) || !ts.isStringLiteral(node.moduleSpecifier)) continue;
    const owner = /^\.\/en\/([A-Za-z]\w*)$/.exec(node.moduleSpecifier.text)?.[1];
    const bindings = node.importClause?.namedBindings;
    if (!owner || !bindings || !ts.isNamedImports(bindings)) continue;
    const member = bindings.elements.find(
      ({ name, propertyName }) => (propertyName ?? name).text === "words",
    );
    if (member) imports.set(owner, member.name.text);
  }
  return imports;
}

export function aggregateEdits(
  ast: ts.SourceFile,
  object: ts.ObjectLiteralExpression,
  groups: ReadonlyMap<string, readonly ts.ObjectLiteralElementLike[]>,
  fragments: Iterable<string>,
) {
  const source = ast.text;
  const imports = fragmentImports(ast);
  const additions: string[] = [];
  const restored: string[] = [];
  const edits: Edit[] = [];
  const before = object.properties
    .filter(ts.isSpreadAssignment)
    .map(({ expression }) => expression.getText());
  for (const owner of new Set([...groups.keys(), ...fragments])) {
    const binding = imports.get(owner) ?? wordsBinding(owner);
    const spread = before.includes(binding);
    const props = groups.get(owner) ?? [];
    if (!imports.has(owner)) additions.push(`import { words as ${binding} } from "./en/${owner}";`);
    if (!spread && !props.length) restored.push(`  ...${binding},`);
    for (const [index, node] of props.entries()) {
      if (index === 0 && !spread)
        edits.push({ start: node.getFullStart(), end: node.getEnd(), text: `\n  ...${binding}` });
      else
        edits.push({
          start: node.getFullStart(),
          end: node.getEnd() + (/^[ \t]*,/.exec(source.slice(node.getEnd()))?.[0].length ?? 0),
          text: "",
        });
    }
  }
  if (restored.length) {
    const start = object.getStart() + 1;
    edits.push({ start, end: start, text: `\n${restored.join("\n")}\n` });
  }
  if (additions.length) edits.push({ start: 0, end: 0, text: `${additions.join("\n")}\n` });
  return edits;
}
