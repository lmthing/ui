import type { ActionName, ActionSpec } from "../../src/catalog";
import type { Field } from "./shape";

export type RowSource = { key: string; field: Field; parents: Field[]; role?: string };
type ScopedPart = { name: string; itemKey?: string; actions: ActionName[] };
type Flag = true | { field: string; truthy: boolean };
export type RowGroup = {
  path: string[];
  scalar: boolean;
  flags: Record<string, Flag>;
  role?: string;
  parentIndex?: string;
};

export function rowSources(fields: Field[], parents: Field[] = []): RowSource[] {
  return fields.flatMap((field) =>
    field.array
      ? [{ key: field.name, field, parents }, ...rowSources(field.members ?? [], [...parents, field])]
      : [],
  );
}

export function addressedSources(sources: RowSource[], keys: string[], host: RowSource | undefined) {
  const addressed = sources.filter(({ key }) => keys.includes(key));
  if (new Set(addressed.map(({ key }) => key)).size !== addressed.length)
    throw new Error("Addressed array name must be unique");
  if (host) {
    for (const key of new Set(keys)) {
      if (!sources.some((source) => source.key === key)) addressed.push({ ...host, key, role: key });
    }
  }
  return addressed;
}

function actionFlag(part: string, action: ActionName, source: RowSource): Flag {
  const { members } = source.field;
  if (part === "call" && action === "press" && members?.some(({ name }) => name === "phone"))
    return { field: "phone", truthy: true };
  if (
    source.parents.length &&
    part === "root" &&
    action === "select" &&
    members?.some(({ name }) => name === "taken")
  )
    return { field: "taken", truthy: false };
  return true;
}

export function projection(
  sources: RowSource[],
  rows: ScopedPart[],
  parts: Record<string, ActionName[]>,
  fields: Field[],
) {
  const when: NonNullable<ActionSpec["when"]> = {};
  const groups: RowGroup[] = sources.map((source) => {
    const { field, parents, role } = source;
    const flags: RowGroup["flags"] = {};
    for (const row of rows.filter(({ itemKey }) => source.key === itemKey)) {
      for (const action of row.actions) {
        // A guard is shared between component and item actions with the same name and verb.
        if (Object.hasOwn(parts, row.name) && parts[row.name]!.includes(action))
          throw new Error(`Item and component both declare ${row.name} ${action}`);
        const key = `$${row.name}_${action}`;
        flags[key] = actionFlag(row.name, action, source);
        when[`${row.name}.${action}`] = { [key]: true };
      }
    }
    const indices = parents.length ? fields.filter(({ indexOf }) => indexOf === parents[0]!.name) : [];
    return {
      path: [...parents, field].map(({ name }) => name),
      scalar: !field.members,
      flags,
      ...(indices.length === 1 ? { parentIndex: indices[0]!.name } : {}),
      ...(role ? { role } : {}),
    };
  });
  return { groups, when };
}
