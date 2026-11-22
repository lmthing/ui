import { quote } from "./doc-section";
import type { RowGroup } from "./row-sources";

function rowSource({ scalar, flags, role, parentIndex }: RowGroup, visible: boolean) {
  const fields = [scalar ? "value" : "...row"];
  for (const [flag, value] of Object.entries(flags)) {
    const source = value === true ? "true" : `${value.truthy ? "Boolean" : "!"}(row.${value.field})`;
    fields.push(`${quote(flag)}: ${source}`);
  }
  if (role) fields.push(`$role: ${quote(role)}`);
  if (visible) fields.push(`$active: ${parentIndex ? `index === (input.${parentIndex} ?? 0)` : "true"}`);
  return `{ ${fields.join(", ")} }`;
}

function mapRows(path: string[], groups: RowGroup[], visible: boolean, depth = 0): string {
  const owner = depth === 0 ? "input" : `parent${depth - 1}`;
  const array = `(${owner}.${path[depth]} ?? [])`;
  if (depth < path.length - 1) {
    const index = depth === 0 && groups.some(({ parentIndex }) => parentIndex) ? ", index" : "";
    return `${array}.flatMap((parent${depth}${index}) => ${mapRows(path, groups, visible, depth + 1)})`;
  }
  const row = groups[0]!.scalar ? "value" : "row";
  const rows = groups.map((group) => rowSource(group, visible));
  return rows.length === 1
    ? `${array}.map((${row}) => (${rows[0]}))`
    : `${array}.flatMap((${row}) => [${rows.join(", ")}])`;
}

export function rowProjection(key: string, groups: RowGroup[]) {
  if (!groups.length) return "";
  const visible = groups.some(({ parentIndex }) => parentIndex);
  const paths = new Map<string, RowGroup[]>();
  for (const group of groups) {
    const key = group.path.join(".");
    const members = paths.get(key);
    if (members) members.push(group);
    else paths.set(key, [group]);
  }
  const rows = [...paths.values()].map((group) => {
    // For two surfaces of the same row, the linked record precedes its selector.
    const ordered = group.sort((a, b) => Number(!!b.flags.$root_press) - Number(!!a.flags.$root_press));
    return `...${mapRows(ordered[0]!.path, ordered, visible)}`;
  });
  return `.overwrite((input) => ({ ...input, ${quote(key)}: [${rows.join(", ")}] }))`;
}
