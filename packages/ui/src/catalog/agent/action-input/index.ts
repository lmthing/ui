import type { Definition } from "../../probes";
import { hostItemInput, safeParseItemProps } from "../../lines";
import { repairVariants } from "../../rules";
import { adjustmentAt, projectAdjustments, setAt } from "../clocks";
export { actionValueAddress, findAction, planHostAct, selectStep } from "./resolve-step";
import { storeLiveInput } from "../live-inputs";
import { isKeypadPart } from "../keypad-profile";
import {
  controlValueKey,
  isAdjustOnlyItem,
  nestedAt,
  nestedPart,
  parseControlProps,
  projectControlInput,
  resolveKeypadValue,
  validateActionValue,
  wireAdjustmentKey,
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
  const edit = setStep(screen, defs, found, step.action, values);
  if (found.sequence?.action === "seek") {
    const { implicit, min, max } = found.sequence;
    const result = validateActionValue(step.action, step.value, undefined, { max, min, implicit });
    return { result: result ?? { value: implicit ?? step.value }, edit, limits: undefined };
  }
  const limits = found.move
    ? { type: "choice" as const, choices: found.move.choices }
    : (edit?.set?.spec ?? nestedSpec(screen, defs, found.address));
  const keypad =
    step.action === "type" && !found.keypad ? keypadInput(screen, defs, found, values) : undefined;
  let result = found.keypad
    ? resolveKeypadValue(step.value, values[key] ?? found.keypad.initial, {}, found.keypad.profile)
    : keypad
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

function setStep(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  found: Affordance,
  action: string,
  values: Values,
) {
  if (!["set", "increment", "decrement"].includes(action)) return;
  const [id, ...parts] = found.address.split("/");
  const entry = screen.components.find((item) => item.id === id);
  const def = entry && defs[entry.c];
  if (!def || (!def.meta.items?.set && !def.meta.set)) return;
  const { id: _id, c: _c, state: _state, ...raw } = entry!;
  const get = (part: string) => values[`${screen.id}/${id}/${part}`];
  const props = parseControlProps(def, raw, get);
  const target = parts.join("/") || "root";
  if (action === "set") {
    const set = found.numeric ?? setAt(def.meta, props, target);
    if (set) return { id, set, slot: controlValueKey(def, set.key) };
  }
  const adjustment =
    found.adjustment ?? adjustmentAt(def.meta, props, target, action, get, Number(get("$now") ?? Date.now()));
  if (adjustment?.atSet) return { id, adjustment, slot: controlValueKey(def, adjustment.key) };
}

export function controlsAreValid(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  address: string,
  values: Values,
) {
  const [id, ...parts] = address.split("/");
  const entry = screen.components.find((item) => item.id === id)!;
  const def = defs[entry.c]!;
  const { id: _id, c: _c, state: _state, ...raw } = entry;
  const repaired = repairVariants(def, raw).props as Values;
  const projected = projectControlInput(def, repaired, (part) => values[`${screen.id}/${id}/${part}`]);
  const target = parts.join("/");
  const spec = nestedPart(def.meta, target);
  if (spec?.action === "select") {
    const { parsed } = safeParseItemProps(def, projected);
    if (!parsed.success) return false;
    const control = nestedAt(def.meta, parsed.data, target);
    return Boolean(control && control.item[spec.prop] === values[`${screen.id}/${address}`]);
  }
  return projected === repaired || def.props.safeParse(hostItemInput(def, projected).wire).success;
}

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
  if (!isKeypadPart(def.props, found.part)) return undefined;
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
  found: Affordance & { checks?: readonly Affordance[] },
  value: unknown,
  edit: ReturnType<typeof setStep>,
  screenId: string,
  links: Extract<ActResult, { ok: true }>["links"],
) {
  const { action, detail } = found;
  const instance = `${screenId}/${found.address.split("/")[0]}`;
  for (const check of found.checks ?? [])
    stageValue(next, `${screenId}/${check.address}`, check, true, undefined, screenId, links);
  if (found.slotMove) {
    const order = typeof value === "string" && found.slotMove.orders.get(value);
    if (!order) return false;
    next[`${instance}/${found.slotMove.key}`] = order;
    next[key] = value;
  } else if (found.rowSelection) {
    next[`${instance}/${found.rowSelection.key}`] = found.rowSelection.id;
    next[key] = value;
  } else if (edit?.adjustment) {
    const { next: amount, atSet } = edit.adjustment;
    if (amount === undefined) return false;
    const base = `${screenId}/${edit.id}`;
    next[`${base}/${edit.slot}`] = amount;
    next[atSet === "root" ? base : `${base}/${atSet}`] = amount;
    next[key] = amount;
  } else if (found.nestedStep) {
    next[key] = found.nestedStep.next;
  } else if (action === "toggle" || action === "check") {
    const projected = detail === ":on" || detail === ":done";
    const now =
      found.flagKey || found.togglePeers || found.input
        ? projected
        : ((next[key] as boolean | undefined) ?? projected);
    next[key] = (value as boolean | undefined) ?? !now;
    for (const peer of found.togglePeers ?? []) next[`${screenId}/${peer}`] = next[key];
    if (next[key] === true)
      for (const peer of found.replaceToggles ?? []) next[`${screenId}/${peer}`] = false;
  } else if (action === "increment" || action === "decrement") {
    next[key] = Number(next[key] ?? 0) + (action === "increment" ? 1 : -1);
  } else if (action === "press" || action === "select") {
    if (detail.startsWith("→")) links.push({ goto: detail.slice(1), address: key });
    if (action === "select" && !found.dateSpan) next[key] = value;
    if (found.jump) {
      const slot = jumpKey(key);
      next[slot] = Number(next[slot] ?? 0) + 1;
    }
  } else {
    next[key] = value;
    if (edit?.set) next[`${screenId}/${edit.id}/${edit.slot}`] = value;
  }
  storeLiveInput(next, screenId, found, next[key]);
  return true;
}

/** The registered address remains a plain press; the redraw cue is runtime-only. */
export const jumpKey = (address: string) => `${address}/$jump`;

function nestedSpec(screen: ScreenLike, defs: Record<string, Definition>, address: string) {
  const [id, ...parts] = address.split("/");
  const entry = screen.components.find((item) => item.id === id);
  const def = entry && defs[entry.c];
  if (!def?.meta.items?.nested) return undefined;
  const { id: _id, c: _c, state: _state, ...raw } = entry!;
  const spec = nestedAt(def.meta, parseControlProps(def, raw), parts.join("/"))?.spec;
  if (!spec) return;
  return spec.action === "set" || spec.action === "toggle" ? spec : {};
}

export function stageItemAdjustment(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  address: string,
  action: string,
  values: Values,
  planned?: ReturnType<typeof adjustmentAt>,
): boolean | undefined {
  if (action !== "increment" && action !== "decrement") return;
  const [id, ...parts] = address.split("/");
  const entry = screen.components.find((item) => item.id === id);
  const def = entry && defs[entry.c];
  if (!entry || !def?.meta.items?.adjust) return;
  const { id: _id, c: _c, state: _state, ...raw } = entry;
  const base = `${screen.id}/${id}`;
  const get = (part: string) => values[`${base}/${part}`];
  const props = parseControlProps(def, raw, get);
  const now = Number(get("$now") ?? Date.now());
  const adjustment = planned ?? adjustmentAt(def.meta, props, parts.join("/"), action, get, now);
  if (!isAdjustOnlyItem(adjustment, action)) return;
  const slot = wireAdjustmentKey(def, adjustment.key);
  if (adjustment.next === undefined || !slot) return false;
  values[`${base}/${slot}`] = adjustment.next;
  values[`${screen.id}/${address}`] = adjustment.next;
  return true;
}

export { componentOffers } from "./screen-offers";
export { localValues } from "../live-props";
