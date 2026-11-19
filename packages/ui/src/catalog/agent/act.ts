import { controlValueKey, liveProps, parseControlProps, projectControlInput } from "./live-props";
import type { Definition } from "../probes";
import { stampItemIds } from "../lines";
import { affordancesOf, type Affordance } from "./affordances";
import type { ScreenLike } from "./read";
import { resolveKeypadValue, validateActionValue } from "./validate-value";
import { nestedAt, selectionAt, selectionChanges, selectionError } from "./selection";
import { adjustmentAt, numericSetAt, projectAdjustments } from "./clocks";

export type ActStep = { address: string; action: string; value?: unknown };
export type Values = Record<string, unknown>;
export type ActResult =
  | { ok: true; values: Values; changed: string[]; links: { goto: string; address: string }[] }
  | { ok: false; code: "not_actionable" | "invalid_value"; at: number; hint?: string };

const relative = (screen: string, address: string) =>
  address.replace(new RegExp(`^${screen}/`), "").replace(/\/root$/, "");

function nestedSpec(screen: ScreenLike, defs: Record<string, Definition>, address: string) {
  const [id, ...parts] = address.split("/");
  const entry = screen.components.find((item) => item.id === id);
  const def = entry && defs[entry.c];
  if (!def?.meta.items?.nested) return undefined;
  const { id: _id, c: _c, state: _state, ...raw } = entry!;
  return nestedAt(def.meta, stampItemIds(def.meta, def.props.parse(raw) as Values), parts.join("/"))?.spec;
}

function numericStep(
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

function controlsAreValid(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  address: string,
  values: Values,
) {
  const [id] = address.split("/");
  const entry = screen.components.find((item) => item.id === id)!;
  const def = defs[entry.c]!;
  const { id: _id, c: _c, state: _state, ...raw } = entry;
  const projected = projectControlInput(def, raw, (part) => values[`${screen.id}/${id}/${part}`]);
  return projected === raw || def.props.safeParse(projected).success;
}

/** An opted-in part's owner supplies the initial value and optional bounds. */
function keypadInput(
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

function affordancesOfScreen(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  values: Values,
): Affordance[] {
  const local = Object.fromEntries(
    Object.entries(values).map(([address, value]) => [address.replace(`${screen.id}/`, ""), value]),
  );
  return screen.components.flatMap(({ id, c, state: _state, ...input }) => {
    const def = defs[c];
    if (!def) return [];
    const parsed = parseControlProps(def, input, (part) => local[`${id}/${part}`]);
    const props = liveProps(def.meta, parsed, id, local, true);
    return affordancesOf(def.meta, props, id, local);
  });
}

function initialOn(found: Affordance) {
  return found.detail === ":on" || found.detail === ":done";
}

function selectStep(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  step: ActStep,
  address: string,
  values: Values,
) {
  if (step.action !== "select") return { step };
  const [id, ...parts] = address.split("/");
  const entry = screen.components.find((item) => item.id === id);
  const def = entry && defs[entry.c];
  if (!def?.meta.select) return { step };
  const { id: _id, c: _c, state: _state, ...raw } = entry!;
  const target = parts.join("/") || "root";
  const get = (part: string) => values[`${screen.id}/${id}/${part}`];
  const parsed = parseControlProps(def, raw, get);
  const props = def.meta.items?.set ? projectAdjustments(def.meta, parsed, get) : parsed;
  const error = selectionError(def.meta, props, target, step.value);
  return {
    step: { ...step, value: selectionAt(def.meta, props, target, step.value)?.value },
    error,
    declared: Object.hasOwn(def.meta.select.choices ?? {}, target),
    changes: Object.fromEntries(
      Object.entries(selectionChanges(def.meta, props, target, step.value)).map(([part, value]) => [
        `${screen.id}/${id}/${part}`,
        value,
      ]),
    ),
  };
}

/**
 * Plans a list of steps against a screen without changing anything: every step must name an offered
 * action with a valid value. All or nothing: the first bad step returns its index and no values, so
 * a caller commits `values` only when `ok` (atomic batches; a dry run is simply not committing).
 */
export function planAct(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  values: Values,
  steps: ActStep[],
): ActResult {
  const next: Values = { ...values };
  const changed: string[] = [];
  const links: { goto: string; address: string }[] = [];
  for (const [at, original] of steps.entries()) {
    const offered = affordancesOfScreen(screen, defs, next);
    const address = relative(screen.id, original.address);
    const selected = selectStep(screen, defs, original, address, next);
    const step = selected.step;
    const found = offered.find((a) => a.address === address && a.action === step.action);
    if (!found) {
      const here = offered.filter((a) => a.address === address).map((a) => a.action);
      const hint = here.length ? `offers ${here.join(", ")}` : "no action at this address";
      return { ok: false, code: "not_actionable", at, hint };
    }
    if (selected.error) return { ok: false, code: "invalid_value", at, hint: selected.error };
    const number = numericStep(screen, defs, address, step.action, next);
    const limits = number?.set
      ? { ...number.set.spec, numeric: true as const }
      : nestedSpec(screen, defs, address);
    const key = `${screen.id}/${address}`;
    const keypad = step.action === "type" ? keypadInput(screen, defs, found, next) : undefined;
    const result = keypad
      ? resolveKeypadValue(step.value, next[key] ?? keypad.value, keypad)
      : (validateActionValue(step.action, step.value, limits) ?? { value: step.value });
    if ("code" in result) return { ok: false, at, ...result };
    if (number?.adjustment) {
      const { next: amount, atSet } = number.adjustment;
      if (amount === undefined) return { ok: false, code: "not_actionable", at };
      const base = `${screen.id}/${number.id}`;
      next[`${base}/${number.slot}`] = amount;
      next[atSet === "root" ? base : `${base}/${atSet}`] = amount;
      next[key] = amount;
    } else if (step.action === "toggle" || step.action === "check") {
      const now = (next[key] as boolean | undefined) ?? initialOn(found);
      next[key] = (result.value as boolean | undefined) ?? !now;
    } else if (step.action === "increment" || step.action === "decrement") {
      next[key] = Number(next[key] ?? 0) + (step.action === "increment" ? 1 : -1);
    } else if (step.action === "press" || step.action === "select") {
      if (found.detail.startsWith("→")) links.push({ goto: found.detail.slice(1), address: key });
      if (step.action === "select") next[key] = result.value;
    } else {
      next[key] = result.value;
      if (number?.set) next[`${screen.id}/${number.id}/${number.slot}`] = result.value;
    }
    Object.assign(next, selected.changes);
    if ((limits || number?.adjustment || selected.declared) && !controlsAreValid(screen, defs, address, next))
      return { ok: false, code: "invalid_value", at, hint: "Value conflicts with component props" };
    changed.push(`${address} ${step.action}${key in next ? ` = ${JSON.stringify(next[key])}` : ""}`);
  }
  return { ok: true, values: next, changed, links };
}
