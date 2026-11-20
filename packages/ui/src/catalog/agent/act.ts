import { parseControlProps, stageItemAdjustment } from "./live-props";
import type { Definition } from "../probes";
import { migrateScreen } from "../migrations";
import type { Affordance } from "./affordances";
import type { ScreenLike } from "./read";
import {
  affordancesOfScreen,
  controlsAreValid,
  liveInput,
  localValues,
  selectStep,
  stageProgress,
  stageValue,
  validateStep,
} from "./action-input";
import { deviceRandom, drawKey, staleDraw, type RandomSource } from "./draw";
import { sessionKey, staleSession } from "./session";
import { clockChanges, clockControlDeclared } from "./clocks";
import { filterDeviceDataScreen, type DeviceData } from "./device-data";
import { stageLinkedEdit } from "./linked-edits";

export type ActStep = { address: string; action: string; value?: unknown };
export type Values = Record<string, unknown>;
export type SendDraft = { address: string; text: string; audience?: string };
type ActCode = "not_actionable" | "invalid_value" | "random_unavailable" | "max_active";
export type ActResult =
  | {
      ok: true;
      values: Values;
      changed: string[];
      links: { goto: string; address: string }[];
      sends?: SendDraft[];
    }
  | { ok: false; code: ActCode; at: number; hint?: string };

const relative = (screen: string, address: string) =>
  address.replace(new RegExp(`^${screen}/`), "").replace(/\/root$/, "");

/** A mounted controller already stages clocks through its action table. */
function stageStandaloneClock(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  next: Values,
  address: string,
  step: ActStep,
  data?: DeviceData,
) {
  const [id, ...parts] = address.split("/");
  const { id: _id, c, state: _state, ...input } = screen.components.find((item) => item.id === id)!;
  const def = defs[c]!;
  const { meta } = def;
  const legacy = meta.live?.derive && (meta.clocks || meta.items?.clocks || meta.items?.nested?.clocks);
  const target = parts.join("/") || "root";
  if (!legacy && !clockControlDeclared(meta, target, step.action, true)) return;
  const get = (part: string) => next[`${screen.id}/${id}/${part}`];
  const props = legacy
    ? liveInput(def, input, id!, localValues(screen.id, next), data)
    : parseControlProps(def, input, get);
  const now = Number(get("$now") ?? Date.now());
  const changes = clockChanges(meta, props, get, target, step, now);
  for (const [part, value] of Object.entries(changes)) next[`${screen.id}/${id}/${part}`] = value;
}

function expireProgress(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  values: Values,
  data?: DeviceData,
) {
  for (const { id, c, state: _state, ...raw } of screen.components) {
    const def = defs[c];
    const draw = `${screen.id}/${id}/${drawKey}`;
    const session = `${screen.id}/${id}/${sessionKey}`;
    if (!def || (values[draw] === undefined && values[session] === undefined)) continue;
    const props = liveInput(def, raw, id, localValues(screen.id, values), data);
    if (def.meta.draw && staleDraw(def.meta, props, values[draw])) values[draw] = undefined;
    if (staleSession(def.meta, props, values[session])) values[session] = undefined;
  }
}

function missingOffer(offered: Affordance[], address: string, at: number): ActResult {
  const here = offered.filter((a) => a.address === address).map((a) => a.action);
  const hint = here.length ? `offers ${here.join(", ")}` : "no action at this address";
  return { ok: false, code: "not_actionable", at, hint };
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
  clockOwner: "planner" | "controller" = "planner",
  data?: DeviceData,
): ActResult {
  if (random && steps.length > 1) {
    const preview = planAct(input, defs, values, steps, null, clockOwner, data);
    if (!preview.ok) return preview;
  }
  return plan(input, defs, values, steps, random, clockOwner, data);
}

/** Kit-only entry: verify one complete step with the registered host, never an agent batch. */
export function planHostAct(
  input: ScreenLike,
  defs: Record<string, Definition>,
  values: Values,
  step: ActStep,
  authorize: (step: Readonly<ActStep>) => boolean,
  data?: DeviceData,
): ActResult {
  if (!authorize(step)) return { ok: false, code: "not_actionable", at: 0 };
  const host = { ...step, address: relative(input.id, step.address) };
  return plan(input, defs, values, [host], null, "controller", data, host);
}

function plan(
  input: ScreenLike,
  defs: Record<string, Definition>,
  values: Values,
  steps: ActStep[],
  random: RandomSource | null,
  clockOwner: "planner" | "controller",
  data?: DeviceData,
  host?: ActStep,
): ActResult {
  const screen = filterDeviceDataScreen(migrateScreen(input, { variantOnly: true }), defs, data);
  const next: Values = { ...values };
  const changed: string[] = [];
  const links: Extract<ActResult, { ok: true }>["links"] = [];
  const sends: SendDraft[] = [];
  for (const [at, original] of steps.entries()) {
    const offered = affordancesOfScreen(screen, defs, next, data, host);
    const address = relative(screen.id, original.address);
    const selected = selectStep(screen, defs, original, address, next, data);
    const step = selected.step;
    const found = offered.find((a) => a.address === address && a.action === step.action);
    if (!found) return missingOffer(offered, address, at);
    if (selected.error) return { ok: false, code: "invalid_value", at, hint: selected.error };
    const key = `${screen.id}/${address}`;
    const { result, number, limits } = validateStep(screen, defs, found, step, next, key);
    if ("code" in result) return { ok: false, at, ...result };
    try {
      const progress =
        stageLinkedEdit(screen, defs, next, found, result.value) ??
        stageProgress(screen, defs, address, { ...step, value: result.value }, next, random, data);
      if (progress !== undefined) {
        changed.push(`${address} ${step.action}${progress}`);
        continue;
      }
    } catch {
      return { ok: false, code: "random_unavailable", at, hint: "Cannot generate a random result" };
    }
    const adjusted = number ? undefined : stageItemAdjustment(screen, defs, address, step.action, next);
    if (clockOwner === "planner")
      stageStandaloneClock(screen, defs, next, address, { ...step, value: result.value }, data);
    if (!(adjusted ?? stageValue(next, key, found, result.value, number, screen.id, links)))
      return { ok: false, code: "not_actionable", at };
    Object.assign(next, selected.changes);
    const validate = limits || number?.adjustment || adjusted || selected.declared;
    if (validate && !controlsAreValid(screen, defs, address, next))
      return { ok: false, code: "invalid_value", at, hint: "Value conflicts with component props" };
    expireProgress(screen, defs, next, data);
    if (found.send) sends.push({ ...found.send, address: `${screen.id}/${found.send.address}` });
    changed.push(`${address} ${step.action}${key in next ? ` = ${JSON.stringify(next[key])}` : ""}`);
  }
  return { ok: true, values: next, changed, links, ...(sends.length ? { sends } : {}) };
}
