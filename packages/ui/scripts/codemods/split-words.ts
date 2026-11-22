import { dirname, join } from "node:path";
import type ts from "typescript";
import { migrateCoreOptions } from "./legacy-core-words";
import { applyEdits, objectNamed, parseSource, propertyName } from "./source";
import { aggregateEdits, dictionaryType, dropMovedSupport } from "./word-aggregate";
import { dependencies, fragmentSource, usedDependencies, wordFragments } from "./word-fragments";
import { wordOwners } from "./word-owners";

export async function splitWords(file: string, original: string, components: readonly string[]) {
  const { source, recover, remove } = await migrateCoreOptions(file, original);
  const ast = parseSource(file, source);
  const object = objectNamed(ast, "en");
  if (!object) throw new Error(`${file}: expected an en dictionary`);
  const inline = object.properties.filter((node) => propertyName(node) !== undefined);
  if (!inline.length && !recover && !remove) return [];

  const fragments = await wordFragments(file);
  const existing = new Map(
    [...fragments].flatMap(([owner, { object }]) =>
      object.properties.flatMap((node) => {
        const key = propertyName(node);
        return key === undefined ? [] : [[key, owner] as const];
      }),
    ),
  );
  for (const key of recover ?? []) {
    if (!existing.has(key))
      throw new Error(`${file}: recover ${key} from the legacy core-options.ts or its split fragment`);
  }
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
  const moved = new Set<ts.Statement>();
  const edits = [...groups].map(([owner, props]) => {
    const support = usedDependencies(props, available);
    support.forEach((node) => moved.add(node));
    return [
      join(dirname(file), "en", `${owner}.ts`),
      fragmentSource(fragments.get(owner)?.object, props, support, type, constant),
    ] as const;
  });
  const aggregate = applyEdits(source, aggregateEdits(ast, object, groups, fragments.keys()));
  return [
    ...edits,
    [file, dropMovedSupport(file, aggregate, [...moved])] as const,
    ...(remove ? [[remove, undefined] as const] : []),
  ];
}
