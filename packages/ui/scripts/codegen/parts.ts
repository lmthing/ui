import type { ActionName, Meta, Tier } from "../../src/catalog";
import { splitTop } from "./doc-section";
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

type Part = { name: string; itemKey?: string; shared?: boolean; actions: ActionName[]; confirm: boolean };
export type RowGroup = { key: string; scalar: boolean; flags: Record<string, true> };

function readParts(source: string, keys: string[]): Part[] {
  return splitTop(splitTop(source, ".")[0] ?? "", ",;").flatMap((raw) => {
    const entry = plain(raw);
    const words = (entry.split(/[(]/, 1)[0] ?? "").trim().split(/\s+/);
    const scope = words[0]!;
    const generic = scope === "items" || scope === "item";
    const qualified = keys.includes(scope) && words.length >= 2 && !actions.includes(words[1] as ActionName);
    const owners = generic ? keys : qualified ? [scope] : [];
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
    return owners.length
      ? owners.map((itemKey) => ({ ...part, itemKey, shared: owners.length > 1 }))
      : [part];
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

function projection(items: Field[], rows: Part[], parts: Record<string, ActionName[]>) {
  const when: NonNullable<Meta["actions"]>["when"] = {};
  const groups: RowGroup[] = items.map(({ name, collection }) => {
    const flags: RowGroup["flags"] = {};
    for (const row of rows.filter(({ itemKey }) => name === itemKey)) {
      for (const action of row.actions) {
        // A guard is shared between component and item actions with the same name and verb.
        if (Object.hasOwn(parts, row.name) && parts[row.name]!.includes(action))
          throw new Error(`Item and component both declare ${row.name} ${action}`);
        const key = `$${row.name}_${action}`;
        flags[key] = true;
        when[`${row.name}.${action}`] = { [key]: true };
      }
    }
    return { key: name, scalar: !collection, flags };
  });
  return { groups, when };
}

export function partMeta(source: string, fields: Field[]) {
  const arrays = fields.filter(({ array }) => array);
  const entries = readParts(
    source,
    arrays.map(({ name }) => name),
  );
  const componentEntries = entries.filter(({ itemKey }) => !itemKey);
  const components = componentEntries.map((part) => ({ ...part, name: partName(part.name) }));
  const rowEntries = entries.filter(({ itemKey }) => itemKey);
  const addressed = arrays.filter(({ name }) => rowEntries.some(({ itemKey }) => itemKey === name));
  const multiple = addressed.length > 1;
  const rows = rowEntries.map((row) => ({
    ...row,
    name: partName(row.shared || (multiple && row.name === "root") ? row.itemKey! : row.name),
  }));
  const key =
    addressed[0]?.name ?? (arrays.length === 1 && arrays[0]!.collection ? arrays[0]!.name : undefined);
  const projected = multiple || (addressed.length === 1 && !addressed[0]!.collection);
  const parts = unique(["root", ...components.map(({ name }) => name)]);
  const rowParts = unique(["root", ...rows.map(({ name }) => name)]);
  const declared = [...parts, ...rowParts];
  const targets = (name: string) => {
    const mapped = rows.flatMap((row, i) => (rowEntries[i]!.name === name ? [row.name] : []));
    if (componentEntries.some((part) => part.name === name) || !mapped.length) mapped.push(partName(name));
    return unique(mapped);
  };
  const confirmParts = unique([
    ...[...components, ...rows].filter(({ confirm }) => confirm).map(({ name }) => name),
    ...[...plain(source).matchAll(/confirmParts:\s*\[([^\]]*)\]/g)].flatMap((hit) =>
      [...hit[1]!.matchAll(/["'](\w+)["']/g)].flatMap((item) => targets(item[1]!)),
    ),
  ]);
  if (confirmParts.some((part) => !declared.includes(part)))
    throw new Error("Confirmation names an undeclared part");
  const overrides = Object.fromEntries(
    Object.entries(partTiers(source)).flatMap(([name, tier]) => targets(name).map((part) => [part, tier])),
  );
  for (const part of Object.keys(overrides)) {
    if (declared.includes(part)) continue;
    if (!fields.some(({ name }) => partName(name) === part))
      throw new Error(`Invalid part tier declaration: ${part}`);
    parts.push(part);
  }
  const partsActions = merged(components);
  const itemsActions = merged(rows);
  const { groups, when } = projected ? projection(addressed, rows, partsActions) : { groups: [], when: {} };
  const actionSpec = {
    ...(Object.keys(partsActions).length ? { parts: partsActions } : {}),
    ...(Object.keys(itemsActions).length ? { items: itemsActions } : {}),
    ...(Object.keys(when).length ? { when } : {}),
  };
  return {
    groups,
    meta: {
      parts,
      ...(key ? { items: { key: projected ? rowsKey : key, parts: rowParts } } : {}),
      ...(Object.keys(actionSpec).length ? { actions: actionSpec } : {}),
      ...(confirmParts.length ? { confirmParts } : {}),
      ...(Object.keys(overrides).length ? { partTiers: overrides } : {}),
    },
  };
}
