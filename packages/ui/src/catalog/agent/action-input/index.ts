import type { Definition } from "../../probes";
import { repairVariants } from "../../rules";
import { adjustmentAt, projectAdjustments, setAt } from "../clocks";
export { localValues, selectStep } from "./select-step";
export { stageProgress } from "./progress";
import { storeLiveInput } from "../live-inputs";
import {
  controlValueKey,
  nestedAt,
  parseControlProps,
  projectControlInput,
  resolveKeypadValue,
  validateActionValue,
  type ActResult,
  type ActStep,
  type Affordance,
  type ScreenLike,
  type Values,
} from "../index";

export function validateStep(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  found: Affordance,
  step: ActStep,
  values: Values,
  key: string,
) {
  const edit = setStep(screen, defs, found.address, step.action, values);
  const limits = edit?.set?.spec ?? nestedSpec(screen, defs, found.address);
  const keypad = step.action === "type" ? keypadInput(screen, defs, found, values) : undefined;
  let result = keypad
    ? resolveKeypadValue(step.value, values[key] ?? keypad.value, keypad)
    : (validateActionValue(step.action, step.value, limits) ?? { value: step.value });
  if (!("code" in result)) {
    const max = found.input?.kind === "text" ? found.input.max : undefined;
    if (max !== undefined && typeof result.value === "string" && result.value.length > max)
      result = { code: "invalid_value", hint: `Use at most ${max} characters` };
    else if (found.blocked && result.value !== false)
      return { result: { code: found.blocked, hint: "Turn off an active choice first" }, edit, limits };
  }
  return { result, edit, limits };
}

export function nestedSpec(screen: ScreenLike, defs: Record<string, Definition>, address: string) {
  const [id, ...parts] = address.split("/");
  const entry = screen.components.find((item) => item.id === id);
  const def = entry && defs[entry.c];
  if (!def?.meta.items?.nested) return undefined;
  const { id: _id, c: _c, state: _state, ...raw } = entry!;
  return nestedAt(def.meta, parseControlProps(def, raw), parts.join("/"))?.spec;
}

function setStep(
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
    const set = setAt(def.meta, props, target);
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
  edit: ReturnType<typeof setStep>,
  screenId: string,
  links: Extract<ActResult, { ok: true }>["links"],
) {
  const { action, detail } = found;
  if (edit?.adjustment) {
    const { next: amount, atSet } = edit.adjustment;
    if (amount === undefined) return false;
    const base = `${screenId}/${edit.id}`;
    next[`${base}/${edit.slot}`] = amount;
    next[atSet === "root" ? base : `${base}/${atSet}`] = amount;
    next[key] = amount;
  } else if (action === "toggle" || action === "check") {
    const projected = detail === ":on" || detail === ":done";
    const now =
      found.togglePeers || found.input ? projected : ((next[key] as boolean | undefined) ?? projected);
    next[key] = (value as boolean | undefined) ?? !now;
    for (const peer of found.togglePeers ?? []) next[`${screenId}/${peer}`] = next[key];
  } else if (action === "increment" || action === "decrement") {
    next[key] = Number(next[key] ?? 0) + (action === "increment" ? 1 : -1);
  } else if (action === "press" || action === "select") {
    if (detail.startsWith("→")) links.push({ goto: detail.slice(1), address: key });
    if (action === "select") next[key] = value;
  } else {
    next[key] = value;
    if (edit?.set) next[`${screenId}/${edit.id}/${edit.slot}`] = value;
  }
  storeLiveInput(next, screenId, found, next[key]);
  return true;
}
