import { liveProps, parseControlProps } from "./live-props";
import type { Definition } from "../probes";
import { migrateScreen } from "../migrations";
import { affordancesOf, type Affordance } from "./affordances";
import type { ScreenLike } from "./read";
import { resolveKeypadValue, validateActionValue } from "./validate-value";
import { selectionAt, selectionChanges, selectionError } from "./selection";
import { projectAdjustments } from "./clocks";
import { controlsAreValid, keypadInput, nestedSpec, numericStep, stageValue } from "./action-input";
import {
  deviceRandom,
  drawKey,
  drawRole,
  holdIndex,
  performDraw,
  staleDraw,
  storeDraw,
  type RandomSource,
} from "./draw";

export type ActStep = { address: string; action: string; value?: unknown };
export type Values = Record<string, unknown>;
export type ActResult =
  | { ok: true; values: Values; changed: string[]; links: { goto: string; address: string }[] }
  | { ok: false; code: "not_actionable" | "invalid_value" | "random_unavailable"; at: number; hint?: string };

const relative = (screen: string, address: string) =>
  address.replace(new RegExp(`^${screen}/`), "").replace(/\/root$/, "");

function localValues(screen: string, values: Values): Values {
  return Object.fromEntries(
    Object.entries(values).map(([address, value]) => [address.replace(`${screen}/`, ""), value]),
  );
}

function liveInput(def: Definition, input: Values, id: string, local: Values) {
  const parsed = parseControlProps(def, input, (part) => local[`${id}/${part}`]);
  return liveProps(def.meta, parsed, id, local, true);
}

function affordancesOfScreen(screen: ScreenLike, defs: Record<string, Definition>, values: Values) {
  const local = localValues(screen.id, values);
  return screen.components.flatMap(({ id, c, state, ...input }) => {
    const def = defs[c];
    if (!def) return [];
    const props = liveInput(def, input, id, local);
    const liveState =
      (props.state as typeof state) ?? (def.meta.draw || def.meta.emptyActions ? state : undefined);
    return affordancesOf(def.meta, props, id, local, liveState);
  });
}

function expireDraws(screen: ScreenLike, defs: Record<string, Definition>, values: Values) {
  for (const { id, c, state: _state, ...raw } of screen.components) {
    const def = defs[c];
    const key = `${screen.id}/${id}/${drawKey}`;
    if (!def?.meta.draw || values[key] === undefined) continue;
    const props = liveInput(def, raw, id, localValues(screen.id, values));
    if (staleDraw(def.meta, props, values[key])) values[key] = undefined;
  }
}

function stageDraw(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  address: string,
  step: ActStep,
  next: Values,
  random: RandomSource | null,
): string | undefined {
  const [id, ...parts] = address.split("/");
  const entry = screen.components.find((item) => item.id === id)!;
  const def = defs[entry.c]!;
  const target = parts.join("/") || "root";
  const role = drawRole(def.meta, target, step.action);
  if (!role) return;
  const { id: _id, c: _c, state: _state, ...raw } = entry;
  const get = (part: string) => next[`${screen.id}/${id}/${part}`];
  const props = liveInput(def, raw, entry.id, localValues(screen.id, next));
  const outcome = performDraw(def.meta, props, get, role, target, step.value, random ?? (() => 0));
  next[`${screen.id}/${id}/${drawKey}`] = storeDraw(def.meta, props, outcome);
  if (!random && (role === "draw" || role === "redraw")) return "";
  const value =
    role === "hold" && outcome.kind === "faces" ? outcome.held[holdIndex(def.meta, target)] : outcome;
  return ` = ${JSON.stringify(value)}`;
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
 * a caller commits `values` only when `ok`. Pass `null` to validate draws without using entropy.
 */
export function planAct(
  input: ScreenLike,
  defs: Record<string, Definition>,
  values: Values,
  steps: ActStep[],
  random: RandomSource | null = deviceRandom,
): ActResult {
  const screen = migrateScreen(input, { variantOnly: true });
  if (random && steps.length > 1) {
    const preview = planAct(input, defs, values, steps, null);
    if (!preview.ok) return preview;
  }
  const next: Values = { ...values };
  const changed: string[] = [];
  const links: Extract<ActResult, { ok: true }>["links"] = [];
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
    try {
      const draw = stageDraw(screen, defs, address, step, next, random);
      if (draw !== undefined) {
        changed.push(`${address} ${step.action}${draw}`);
        continue;
      }
    } catch {
      return { ok: false, code: "random_unavailable", at, hint: "Cannot generate a random result" };
    }
    if (!stageValue(next, key, found, result.value, number, screen.id, links))
      return { ok: false, code: "not_actionable", at };
    Object.assign(next, selected.changes);
    if ((limits || number?.adjustment || selected.declared) && !controlsAreValid(screen, defs, address, next))
      return { ok: false, code: "invalid_value", at, hint: "Value conflicts with component props" };
    expireDraws(screen, defs, next);
    changed.push(`${address} ${step.action}${key in next ? ` = ${JSON.stringify(next[key])}` : ""}`);
  }
  return { ok: true, values: next, changed, links };
}
