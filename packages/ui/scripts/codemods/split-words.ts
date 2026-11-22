import { dirname, join } from "node:path";
import ts from "typescript";
import { applyEdits, objectNamed, parseSource, propertyName, type Edit } from "./source";
import {
  dependencies,
  fragmentSource,
  usedDependencies,
  wordFragments,
  wordsBinding,
} from "./word-fragments";
import { wordOwners } from "./word-owners";

function dictionaryType(object: ts.ObjectLiteralExpression) {
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

function dropUnusedSupport(file: string, source: string) {
  const ast = parseSource(file, source);
  const object = objectNamed(ast, "en")!;
  const available = dependencies(ast, object);
  const candidates = available.map(({ node }) => node);
  const retained = usedDependencies(
    ast.statements.filter((node) => !candidates.includes(node)),
    available,
  );
  return applyEdits(
    source,
    candidates
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

function aggregateEdits(
  ast: ts.SourceFile,
  object: ts.ObjectLiteralExpression,
  groups: ReadonlyMap<string, readonly ts.ObjectLiteralElementLike[]>,
) {
  const source = ast.text;
  const imports: string[] = [];
  const edits: Edit[] = [];
  const before = object.properties
    .filter(ts.isSpreadAssignment)
    .map(({ expression }) => expression.getText());
  for (const [owner, props] of groups) {
    const binding = wordsBinding(owner);
    const spread = before.includes(binding);
    if (!spread) imports.push(`import { words as ${binding} } from "./en/${owner}";`);
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
  if (imports.length) edits.push({ start: 0, end: 0, text: `${imports.join("\n")}\n` });
  return edits;
}

export async function splitWords(file: string, source: string, components: readonly string[]) {
  const ast = parseSource(file, source);
  const object = objectNamed(ast, "en");
  if (!object) throw new Error(`${file}: expected an en dictionary`);
  const inline = object.properties.filter((node) => propertyName(node) !== undefined);
  if (!inline.length) return [];

  const fragments = await wordFragments(file);
  const existing = new Map(
    [...fragments].flatMap(([owner, { object }]) =>
      object.properties.flatMap((node) => {
        const key = propertyName(node);
        return key === undefined ? [] : [[key, owner] as const];
      }),
    ),
  );
  const ownerOf = await wordOwners(dirname(dirname(file)), components);
  const groups = new Map<string, ts.ObjectLiteralElementLike[]>();
  for (const node of inline) {
    const key = propertyName(node)!;
    const owner = existing.get(key) ?? ownerOf(key);
    const group = groups.get(owner) ?? [];
    group.push(node);
    groups.set(owner, group);
  }

  const { type, constant } = dictionaryType(object);
  const available = dependencies(ast, object);
  const edits = [...groups].map(
    ([owner, props]) =>
      [
        join(dirname(file), "en", `${owner}.ts`),
        fragmentSource(
          fragments.get(owner)?.object,
          props,
          usedDependencies(props, available),
          type,
          constant,
        ),
      ] as const,
  );
  return [
    ...edits,
    [file, dropUnusedSupport(file, applyEdits(source, aggregateEdits(ast, object, groups)))] as const,
  ];
}
