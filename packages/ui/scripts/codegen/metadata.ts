import type { ActionName, Meta, StateName, Tier } from "../../src/catalog";
import { componentSection, splitTop } from "./doc-section";
import type { Field } from "./shape";

const groups = ["structure", "content", "data", "input", "action", "beyond", "signature", "escape"];
const tiers: Tier[] = ["phone", "ok", "people", "service"];
const states: StateName[] = ["filled", "empty", "loading", "success", "error"];
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
const regions = ["top", "body", "bottom", "overlay"] as const;
const plain = (value: string) => value.replaceAll("`", "");

type DraftMeta = Omit<Meta, "variants"> & { variants?: Record<string, string[]> };
type Part = { name: string; itemKey?: string; actions: ActionName[]; confirm: boolean };

function readParts(source: string, keys: string[]): Part[] {
  const parts: Part[] = [];
  for (const raw of splitTop(splitTop(source, ".")[0] ?? "", ",;")) {
    const entry = plain(raw);
    const words = (entry.split(/[(]/, 1)[0] ?? "").trim().split(/\s+/);
    const scope = words[0];
    const itemKey =
      scope === "items" || scope === "item"
        ? keys.length === 1
          ? keys[0]
          : undefined
        : scope && keys.includes(scope) && words.length >= 2
          ? scope
          : undefined;
    if (scope === "items" || scope === "item") {
      if (!itemKey) throw new Error(`Ambiguous item part: ${raw}`);
      words.shift();
    } else if (itemKey) words.shift();
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
    parts.push({ name, itemKey, actions: offered as ActionName[], confirm: /\bconfirmParts\b/.test(entry) });
  }
  if (new Set(parts.flatMap(({ itemKey }) => (itemKey ? [itemKey] : []))).size > 1)
    throw new Error("Only one addressed item collection is supported");
  return parts;
}

function partTiers(source: string, declared: string[]) {
  const pairs = [...plain(source).matchAll(/\bpartTiers:\s*\{([^}]*)\}/g)]
    .flatMap((match) => splitTop(match[1]!, ","))
    .map((entry) => {
      const hit = /^([\w]+):\s*["']?(phone|ok|people|service)["']?$/.exec(entry);
      if (!hit || !declared.includes(hit[1]!)) throw new Error(`Invalid part tier declaration: ${entry}`);
      return [hit[1]!, hit[2] as Tier] as const;
    });
  return Object.fromEntries(pairs);
}

function partMeta(source: string, fields: Field[]) {
  const unique = (list: string[]) => [...new Set(list)];
  const keys = fields.filter(({ collection }) => collection).map(({ name }) => name);
  const entries = readParts(source, keys);
  const merged = (list: Part[]) =>
    Object.fromEntries(
      list
        .filter((part) => part.actions.length)
        .map(({ name }) => [
          name,
          unique(list.filter((part) => part.name === name).flatMap((part) => part.actions)) as ActionName[],
        ]),
    );
  const parts = unique(["root", ...entries.filter(({ itemKey }) => !itemKey).map(({ name }) => name)]);
  const rows = entries.filter(({ itemKey }) => itemKey);
  const rowParts = rows.length ? unique(["root", ...rows.map(({ name }) => name)]) : [];
  const declared = [...parts, ...rowParts];
  const confirmParts = unique([
    ...entries.filter(({ confirm }) => confirm).map(({ name }) => name),
    ...[...plain(source).matchAll(/confirmParts:\s*\[([^\]]*)\]/g)].flatMap((hit) =>
      [...hit[1]!.matchAll(/["']([\w]+)["']/g)].map((item) => item[1]!),
    ),
  ]);
  if (confirmParts.some((part) => !declared.includes(part)))
    throw new Error("Confirmation names an undeclared part");
  const partsActions = merged(entries.filter(({ itemKey }) => !itemKey));
  const itemsActions = merged(rows);
  const actionSpec = {
    ...(Object.keys(partsActions).length ? { parts: partsActions } : {}),
    ...(Object.keys(itemsActions).length ? { items: itemsActions } : {}),
  };
  const key = rows[0]?.itemKey ?? (keys.length === 1 ? keys[0] : undefined);
  const overrides = partTiers(source, declared);
  return {
    parts,
    ...(key ? { items: { key, parts: rowParts.length ? rowParts : ["root"] } } : {}),
    ...(Object.keys(actionSpec).length ? { actions: actionSpec } : {}),
    ...(confirmParts.length ? { confirmParts } : {}),
    ...(Object.keys(overrides).length ? { partTiers: overrides } : {}),
  };
}

function readStates(source: string): StateName[] {
  if (!source) return ["filled"];
  return splitTop(splitTop(source, ".")[0] ?? "", ",;").map((part) => {
    const state = plain(part).split(/\s+/, 1)[0] as StateName;
    if (!states.includes(state)) throw new Error(`Unknown state: ${part}`);
    return state;
  });
}

export function readMeta(
  name: string,
  doc: ReturnType<typeof componentSection>,
  fields: Field[],
  axes: Record<string, string[]>,
): DraftMeta {
  const group = doc.heading.find((word) => groups.includes(word)) as Meta["group"] | undefined;
  const tier = doc.heading.find((word) => tiers.includes(word as Tier)) as Tier | undefined;
  const pick = doc.sections.get("Pick");
  if (!group || !tier || !pick) throw new Error(`Expected group, tier and Pick for ${name}`);
  const region = regions.find((value) => doc.heading.includes(value)) ?? "body";
  const density = doc.sections.get("Density") ?? "";
  const weight =
    /\bweight\s+([0-3])\b/.exec([...doc.heading, density].join(" "))?.[1] ??
    (region === "overlay" ? "0" : group === "structure" ? "1" : "2");
  const words = plain(doc.description || pick)
    .split(/\s+/)
    .slice(0, 16)
    .join(" ")
    .replace(/[,;:]$/, "");
  const purpose = /[.!?]$/.test(words) ? words : `${words}.`;
  return {
    id: name,
    status: "draft",
    group,
    tier,
    pick: plain(pick),
    purpose,
    region,
    weight: Number(weight) as Meta["weight"],
    realPath: plain(
      doc.sections.get("Real path") ?? "On-device app content. Confirm the real path before shipping.",
    ),
    ...(Object.keys(axes).length ? { variants: axes } : {}),
    ...(/dense:\s*true/.test(density) ? { dense: true } : {}),
    ...partMeta(doc.sections.get("Parts") ?? "", fields),
    states: readStates(doc.sections.get("States") ?? ""),
    ...(/\bcode-owned\b/i.test(doc.heading.join(" ")) ? { codeOwned: true } : {}),
  };
}

export function nearMiss(pick: string) {
  const alternatives = pick
    .split(/\bnot\b/i)
    .slice(1)
    .join(" ");
  return /`([A-Z][A-Za-z0-9]*)`/.exec(alternatives)?.[1];
}
