import type { Definition } from "../../probes";
import { repairVariants } from "../../rules";
import { adjustmentAt, numericSetAt, projectAdjustments } from "../clocks";
import {
  controlValueKey,
  nestedAt,
  parseControlProps,
  projectControlInput,
  type ActResult,
  type Affordance,
  type ScreenLike,
  type Values,
} from "../index";

export function nestedSpec(screen: ScreenLike, defs: Record<string, Definition>, address: string) {
  const [id, ...parts] = address.split("/");
  const entry = screen.components.find((item) => item.id === id);
  const def = entry && defs[entry.c];
  if (!def?.meta.items?.nested) return undefined;
  const { id: _id, c: _c, state: _state, ...raw } = entry!;
  return nestedAt(def.meta, parseControlProps(def, raw), parts.join("/"))?.spec;
}

export function numericStep(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  address: string,
  action: string,
  values: Values,
) {
  if (!["set", "increment", "decrement"].includes(action)) return;
  const [id, ...parts] = address.split("/");
  const entry = screen.components.find((item) => item.id === id);
  const def = entry && defs[entry.c];
  if (!def || (!def.meta.items?.set && !def.meta.set)) return;
  const { id: _id, c: _c, state: _state, ...raw } = entry!;
  const get = (part: string) => values[`${screen.id}/${id}/${part}`];
  const props = parseControlProps(def, raw, get);
  const target = parts.join("/") || "root";
  if (action === "set") {
    const set = numericSetAt(def.meta, props, target);
    if (set) return { id, set, slot: controlValueKey(def, set.key) };
  }
  const adjustment = adjustmentAt(def.meta, props, target, action, get, Number(get("$now") ?? Date.now()));
  if (adjustment?.atSet) return { id, adjustment, slot: controlValueKey(def, adjustment.key) };
}

export function controlsAreValid(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  address: string,
  values: Values,
) {
  const [id] = address.split("/");
  const entry = screen.components.find((item) => item.id === id)!;
  const def = defs[entry.c]!;
  const { id: _id, c: _c, state: _state, ...raw } = entry;
  const repaired = repairVariants(def, raw).props as Values;
  const projected = projectControlInput(def, repaired, (part) => values[`${screen.id}/${id}/${part}`]);
  return projected === repaired || def.props.safeParse(projected).success;
}

/** An opted-in part's owner supplies the initial value and optional bounds. */
export function keypadInput(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  found: Affordance,
  values: Values,
) {
  const [id, item, part] = found.address.split("/");
  const entry = screen.components.find((entry) => entry.id === id)!;
  const { id: _id, c, state: _state, ...raw } = entry;
  const def = defs[c]!;
  const keypadParts = def.props.meta()?.keypadParts;
  if (!Array.isArray(keypadParts) || !keypadParts.includes(found.part)) return undefined;
  const get = (target: string) => values[`${screen.id}/${id}/${target}`];
  const parsed = parseControlProps(def, raw, get);
  const input = def.meta.items?.set ? projectAdjustments(def.meta, parsed, get) : parsed;
  if (!part && !(item && found.part === "root")) return input;
  const rows = input[def.meta.items?.key ?? ""];
  return (rows as Values[] | undefined)?.find((row) => row.id === item) ?? {};
}

export function stageValue(
  next: Values,
  key: string,
  found: Affordance,
  value: unknown,
  number: ReturnType<typeof numericStep>,
  screenId: string,
  links: Extract<ActResult, { ok: true }>["links"],
) {
  const { action, detail } = found;
  if (number?.adjustment) {
    const { next: amount, atSet } = number.adjustment;
    if (amount === undefined) return false;
    const base = `${screenId}/${number.id}`;
    next[`${base}/${number.slot}`] = amount;
    next[atSet === "root" ? base : `${base}/${atSet}`] = amount;
    next[key] = amount;
  } else if (action === "toggle" || action === "check") {
    const now = (next[key] as boolean | undefined) ?? (detail === ":on" || detail === ":done");
    next[key] = (value as boolean | undefined) ?? !now;
  } else if (action === "increment" || action === "decrement") {
    next[key] = Number(next[key] ?? 0) + (action === "increment" ? 1 : -1);
  } else if (action === "press" || action === "select") {
    if (detail.startsWith("→")) links.push({ goto: detail.slice(1), address: key });
    if (action === "select") next[key] = value;
  } else {
    next[key] = value;
    if (number?.set) next[`${screenId}/${number.id}/${number.slot}`] = value;
  }
  return true;
}
