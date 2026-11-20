import { liveProps, parseControlProps, stageItemAdjustment } from "./live-props";
import type { Definition } from "../probes";
import { migrateScreen } from "../migrations";
import { affordancesOf, type Affordance } from "./affordances";
import type { ScreenLike } from "./read";
import { controlsAreValid, localValues, selectStep, stageValue, validateStep } from "./action-input";
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
import { advanceSession, sessionEvent, sessionKey, staleSession } from "./session";

export type ActStep = { address: string; action: string; value?: unknown };
export type Values = Record<string, unknown>;
type ActCode = "not_actionable" | "invalid_value" | "random_unavailable" | "max_active";
export type ActResult =
  | { ok: true; values: Values; changed: string[]; links: { goto: string; address: string }[] }
  | { ok: false; code: ActCode; at: number; hint?: string };

const relative = (screen: string, address: string) =>
  address.replace(new RegExp(`^${screen}/`), "").replace(/\/root$/, "");

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
    const { draw, emptyActions, errorActions, session, successActions, items, live } = def.meta;
    const policy = items?.nested?.activeParent || items?.nested?.maxActive !== undefined;
    // Keep the legacy data-only planner's state fallback for definitions without a state opt-in.
    const liveState =
      (props.state as typeof state) ??
      (draw || emptyActions || errorActions?.length || session || successActions?.length || policy || live
        ? state
        : undefined);
    return affordancesOf(def.meta, props, id, local, liveState, true);
  });
}

function expireProgress(screen: ScreenLike, defs: Record<string, Definition>, values: Values) {
  for (const { id, c, state: _state, ...raw } of screen.components) {
    const def = defs[c];
    const draw = `${screen.id}/${id}/${drawKey}`;
    const session = `${screen.id}/${id}/${sessionKey}`;
    if (!def || (values[draw] === undefined && values[session] === undefined)) continue;
    const props = liveInput(def, raw, id, localValues(screen.id, values));
    if (def.meta.draw && staleDraw(def.meta, props, values[draw])) values[draw] = undefined;
    if (staleSession(def.meta, props, values[session])) values[session] = undefined;
  }
}

function stageProgress(
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
  const event = sessionEvent(def.meta, target, step.action);
  const role = drawRole(def.meta, target, step.action);
  if (!event && !role) return;
  const { id: _id, c: _c, state: _state, ...raw } = entry;
  const get = (part: string) => next[`${screen.id}/${id}/${part}`];
  const props = liveInput(def, raw, entry.id, localValues(screen.id, next));
  if (event) {
    next[`${screen.id}/${id}/${sessionKey}`] = advanceSession(def.meta, props, get, event);
    return "";
  }
  if (!role) return;
  const outcome = performDraw(def.meta, props, get, role, target, step.value, random ?? (() => 0));
  next[`${screen.id}/${id}/${drawKey}`] = storeDraw(def.meta, props, outcome);
  if (!random && (role === "draw" || role === "redraw")) return "";
  const value =
    role === "hold" && outcome.kind === "faces" ? outcome.held[holdIndex(def.meta, target)] : outcome;
  return ` = ${JSON.stringify(value)}`;
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
    const key = `${screen.id}/${address}`;
    const { result, number, limits } = validateStep(screen, defs, found, step, next, key);
    if ("code" in result) return { ok: false, at, ...result };
    try {
      const progress = stageProgress(screen, defs, address, step, next, random);
      if (progress !== undefined) {
        changed.push(`${address} ${step.action}${progress}`);
        continue;
      }
    } catch {
      return { ok: false, code: "random_unavailable", at, hint: "Cannot generate a random result" };
    }
    const adjusted = number ? undefined : stageItemAdjustment(screen, defs, address, step.action, next);
    if (!(adjusted ?? stageValue(next, key, found, result.value, number, screen.id, links)))
      return { ok: false, code: "not_actionable", at };
    Object.assign(next, selected.changes);
    const validate = limits || number?.adjustment || adjusted || selected.declared;
    if (validate && !controlsAreValid(screen, defs, address, next))
      return { ok: false, code: "invalid_value", at, hint: "Value conflicts with component props" };
    expireProgress(screen, defs, next);
    changed.push(`${address} ${step.action}${key in next ? ` = ${JSON.stringify(next[key])}` : ""}`);
  }
  return { ok: true, values: next, changed, links };
}
