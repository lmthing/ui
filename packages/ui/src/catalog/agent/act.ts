import { liveProps } from "./live-props";
import type { Definition } from "../probes";
import { stampItemIds } from "../lines";
import { affordancesOf, type Affordance } from "./affordances";
import type { ScreenLike } from "./read";
import { validateActionValue } from "./validate-value";
import { selectionAt, selectionChanges, selectionError } from "./selection";
import { nestedAt } from "./selection";
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

function nestedSpec(screen: ScreenLike, defs: Record<string, Definition>, address: string) {
  const [id, ...parts] = address.split("/");
  const entry = screen.components.find((item) => item.id === id);
  const def = entry && defs[entry.c];
  if (!def?.meta.items?.nested) return undefined;
  const { id: _id, c: _c, state: _state, ...raw } = entry!;
  return nestedAt(def.meta, stampItemIds(def.meta, def.props.parse(raw) as Values), parts.join("/"))?.spec;
}

function affordancesOfScreen(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  values: Values,
): Affordance[] {
  const local = localValues(screen.id, values);
  return screen.components.flatMap(({ id, c, state, ...input }) => {
    const def = defs[c];
    if (!def) return [];
    const props = liveProps(def.meta, stampItemIds(def.meta, def.props.parse(input) as Values), id, local);
    const liveState = props.state as typeof state;
    return affordancesOf(
      def.meta,
      props,
      id,
      local,
      liveState ?? (def.meta.draw || def.meta.emptyActions ? state : undefined),
    );
  });
}

function localValues(screen: string, values: Values): Values {
  return Object.fromEntries(
    Object.entries(values).map(([address, value]) => [address.replace(`${screen}/`, ""), value]),
  );
}

function expireDraws(screen: ScreenLike, defs: Record<string, Definition>, values: Values) {
  for (const { id, c, state: _state, ...raw } of screen.components) {
    const def = defs[c];
    const key = `${screen.id}/${id}/${drawKey}`;
    if (!def?.meta.draw || values[key] === undefined) continue;
    const props = liveProps(def.meta, def.props.parse(raw) as Values, id, localValues(screen.id, values));
    if (staleDraw(def.meta, props, values[key])) values[key] = undefined;
  }
}

function drawStep(screen: ScreenLike, defs: Record<string, Definition>, address: string, action: string) {
  const [id, ...parts] = address.split("/");
  const entry = screen.components.find((item) => item.id === id);
  const def = entry && defs[entry.c];
  if (!def?.meta.draw) return;
  const target = parts.join("/") || "root";
  const role = drawRole(def.meta, target, action);
  return role ? { def, entry: entry!, target, role } : undefined;
}

function stageDraw(
  screen: string,
  { def, entry, target, role }: NonNullable<ReturnType<typeof drawStep>>,
  next: Values,
  step: ActStep,
  random: RandomSource | null,
): string {
  const { id, c: _c, state: _state, ...raw } = entry;
  const get = (part: string) => next[`${screen}/${id}/${part}`];
  const props = liveProps(def.meta, def.props.parse(raw) as Values, id, localValues(screen, next));
  const outcome = performDraw(def.meta, props, get, role, target, step.value, random ?? (() => 0));
  next[`${screen}/${id}/${drawKey}`] = storeDraw(def.meta, props, outcome);
  if (!random && (role === "draw" || role === "redraw")) return "";
  const value =
    role === "hold" && outcome.kind === "faces" ? outcome.held[holdIndex(def.meta, target)] : outcome;
  return ` = ${JSON.stringify(value)}`;
}

function initialOn(found: Affordance) {
  return found.detail === ":on" || found.detail === ":done";
}

function selectStep(screen: ScreenLike, defs: Record<string, Definition>, step: ActStep, address: string) {
  if (step.action !== "select") return { step };
  const [id, ...parts] = address.split("/");
  const entry = screen.components.find((item) => item.id === id);
  const def = entry && defs[entry.c];
  if (!def?.meta.select) return { step };
  const { id: _id, c: _c, state: _state, ...raw } = entry!;
  const props = stampItemIds(def.meta, def.props.parse(raw) as Values);
  const target = parts.join("/");
  const error = selectionError(def.meta, props, target, step.value);
  return {
    step: { ...step, value: selectionAt(def.meta, props, target)?.value },
    error,
    changes: Object.fromEntries(
      Object.entries(selectionChanges(def.meta, props, target)).map(([part, value]) => [
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
  screen: ScreenLike,
  defs: Record<string, Definition>,
  values: Values,
  steps: ActStep[],
  random: RandomSource | null = deviceRandom,
): ActResult {
  if (random && steps.length > 1) {
    const preview = planAct(screen, defs, values, steps, null);
    if (!preview.ok) return preview;
  }
  const next: Values = { ...values };
  const changed: string[] = [];
  const links: { goto: string; address: string }[] = [];
  for (const [at, original] of steps.entries()) {
    const offered = affordancesOfScreen(screen, defs, next);
    const address = relative(screen.id, original.address);
    const selected = selectStep(screen, defs, original, address);
    const step = selected.step;
    const found = offered.find((a) => a.address === address && a.action === step.action);
    if (!found) {
      const here = offered.filter((a) => a.address === address).map((a) => a.action);
      const hint = here.length ? `offers ${here.join(", ")}` : "no action at this address";
      return { ok: false, code: "not_actionable", at, hint };
    }
    if (selected.error) return { ok: false, code: "invalid_value", at, hint: selected.error };
    const error = validateActionValue(step.action, step.value, nestedSpec(screen, defs, address));
    if (error) return { ok: false, at, ...error };
    const draw = drawStep(screen, defs, address, step.action);
    if (draw) {
      try {
        changed.push(`${address} ${step.action}${stageDraw(screen.id, draw, next, step, random)}`);
      } catch {
        return { ok: false, code: "random_unavailable", at, hint: "Cannot generate a random result" };
      }
      continue;
    }
    const key = `${screen.id}/${address}`;
    if (step.action === "toggle" || step.action === "check") {
      const now = (next[key] as boolean | undefined) ?? initialOn(found);
      next[key] = (step.value as boolean | undefined) ?? !now;
    } else if (step.action === "increment" || step.action === "decrement") {
      next[key] = Number(next[key] ?? 0) + (step.action === "increment" ? 1 : -1);
    } else if (step.action === "press" || step.action === "select") {
      if (found.detail.startsWith("→")) links.push({ goto: found.detail.slice(1), address: key });
      if (step.action === "select") next[key] = step.value;
    } else {
      next[key] = step.value;
    }
    Object.assign(next, selected.changes);
    expireDraws(screen, defs, next);
    changed.push(`${address} ${step.action}${key in next ? ` = ${JSON.stringify(next[key])}` : ""}`);
  }
  return { ok: true, values: next, changed, links };
}
