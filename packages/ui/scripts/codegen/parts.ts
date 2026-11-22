import type { ActionName, Meta, Tier } from "../../src/catalog";
import { splitTop } from "./doc-section";
import { addressedSources, projection, rowSources, type RowSource } from "./row-sources";
import type { Field } from "./shape";

const actions = [
  "press",
  "toggle",
  "check",
  "select",
  "type",
  "set",
  "increment",
  "decrement",
  "swipe",
  "start",
  "stop",
  "dismiss",
  "play",
  "pause",
  "seek",
  "flip",
  "move",
  "send",
  "scan",
  "copy",
] as const satisfies readonly ActionName[];
const plain = (value: string) => value.replaceAll("`", "");
const partName = (name: string) => name.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
const unique = (list: string[]) => [...new Set(list)];
const rowsKey = "$rows";

type Part = { name: string; itemKey?: string; actions: ActionName[]; confirm: boolean };
function readParts(source: string, sources: RowSource[], host: RowSource | undefined): Part[] {
  const keys = sources.map(({ key }) => key);
  const topKeys = sources.filter(({ parents }) => !parents.length).map(({ key }) => key);
  return splitTop(splitTop(source, ".")[0] ?? "", ",;").flatMap((raw) => {
    const entry = plain(raw);
    const words = (entry.split(/[(]/, 1)[0] ?? "").trim().split(/\s+/);
    const scope = words[0]!;
    const generic = scope === "items" || scope === "item";
    const qualified =
      keys.includes(scope) &&
      (words.length >= 3 || (words.length === 2 && !actions.includes(words[1] as ActionName)));
    // A host-annotated wire list can supply separately named runtime rows.
    const hostRole = host && words.length >= 3 && !actions.includes(words[1] as ActionName);
    const owners = generic ? topKeys : qualified || hostRole ? [scope] : [];
    if (generic && !owners.length) throw new Error(`Item part needs a bounded array: ${raw}`);
    if (owners.length) words.shift();
    const name = words.shift();
    const offered = words
      .join(" ")
      .split(/[\s/|]+/)
      .filter(Boolean);
    if (
      !name ||
      !/^[a-z][a-z0-9_]*$/i.test(name) ||
      offered.some((word) => !actions.includes(word as ActionName))
    )
      throw new Error(`Unsupported part or action: ${raw}`);
    const part = { name, actions: offered as ActionName[], confirm: /\bconfirmParts\b/.test(entry) };
    return owners.length ? owners.map((itemKey) => ({ ...part, itemKey })) : [part];
  });
}

function partTiers(source: string) {
  const pairs = [...plain(source).matchAll(/\bpartTiers:\s*\{([^}]*)\}/g)]
    .flatMap((match) => splitTop(match[1]!, ","))
    .map((entry) => {
      const hit = /^(\w+):\s*["']?(phone|ok|people|service)["']?$/.exec(entry);
      if (!hit) throw new Error(`Invalid part tier declaration: ${entry}`);
      return [hit[1]!, hit[2] as Tier] as const;
    });
  return Object.fromEntries(pairs);
}

function merged(parts: Part[]) {
  const result: Record<string, ActionName[]> = {};
  for (const { name, actions } of parts) {
    if (actions.length)
      result[name] = [...new Set([...(Object.hasOwn(result, name) ? result[name]! : []), ...actions])];
  }
  return result;
}

function partPolicies(
  source: string,
  fields: Field[],
  original: Part[],
  renamed: Part[],
  declared: string[],
) {
  const targets = (name: string) => {
    const mapped = original.flatMap((part, i) => (part.name === name ? [renamed[i]!.name] : []));
    return unique(mapped.length ? mapped : [partName(name)]);
  };
  const confirmParts = unique([
    ...renamed.filter(({ confirm }) => confirm).map(({ name }) => name),
    ...[...plain(source).matchAll(/confirmParts:\s*\[([^\]]*)\]/g)].flatMap((hit) =>
      [...hit[1]!.matchAll(/["'](\w+)["']/g)].flatMap((item) => targets(item[1]!)),
    ),
  ]);
  if (confirmParts.some((part) => !declared.includes(part)))
    throw new Error("Confirmation names an undeclared part");
  const overrides = Object.fromEntries(
    Object.entries(partTiers(source)).flatMap(([name, tier]) => targets(name).map((part) => [part, tier])),
  );
  const extraParts = Object.keys(overrides).filter((part) => !declared.includes(part));
  for (const part of extraParts)
    if (!fields.some(({ name }) => partName(name) === part))
      throw new Error(`Invalid part tier declaration: ${part}`);
  return { confirmParts, overrides, extraParts };
}

export function partMeta(source: string, fields: Field[]) {
  const arrays = rowSources(fields);
  const top = arrays.filter(({ parents }) => !parents.length);
  const hosts = top.filter(({ field }) => field.members && field.array?.hostOverflow);
  const host = hosts.length === 1 ? hosts[0] : undefined;
  const entries = readParts(source, arrays, host);
  const componentEntries = entries.filter(({ itemKey }) => !itemKey);
  const components = componentEntries.map((part) => ({ ...part, name: partName(part.name) }));
  const rowEntries = entries.filter(({ itemKey }) => itemKey);
  const addressed = addressedSources(
    arrays,
    rowEntries.map(({ itemKey }) => itemKey!),
    host,
  );
  const multiple = new Set(addressed.map(({ field }) => field)).size > 1;
  const rows = rowEntries.map((row) => ({
    ...row,
    name: partName(multiple && row.name === "root" ? row.itemKey! : row.name),
  }));
  const key = addressed[0]?.key ?? (top.length === 1 && top[0]!.field.members ? top[0]!.key : undefined);
  const projected =
    multiple || addressed.some(({ parents, field, role }) => parents.length || !field.members || role);
  const parts = unique(["root", ...components.map(({ name }) => name)]);
  const rowParts = unique(["root", ...rows.map(({ name }) => name)]);
  const { confirmParts, overrides, extraParts } = partPolicies(
    source,
    fields,
    [...componentEntries, ...rowEntries],
    [...components, ...rows],
    [...parts, ...rowParts],
  );
  const partsActions = merged(components);
  const itemsActions = merged(rows);
  const { groups, when } = projected
    ? projection(addressed, rows, partsActions, fields)
    : { groups: [], when: {} };
  const visible = groups.some(({ parentIndex }) => parentIndex) ? { visibleWhen: { $active: true } } : {};
  const actionSpec: NonNullable<Meta["actions"]> = {
    ...(Object.keys(partsActions).length ? { parts: partsActions } : {}),
    ...(Object.keys(itemsActions).length ? { items: itemsActions } : {}),
    ...(Object.keys(when).length ? { when } : {}),
  };
  return {
    groups,
    meta: {
      parts: [...parts, ...extraParts],
      ...(key ? { items: { key: projected ? rowsKey : key, parts: rowParts, ...visible } } : {}),
      ...(Object.keys(actionSpec).length ? { actions: actionSpec } : {}),
      ...(confirmParts.length ? { confirmParts } : {}),
      ...(Object.keys(overrides).length ? { partTiers: overrides } : {}),
    },
  };
}
