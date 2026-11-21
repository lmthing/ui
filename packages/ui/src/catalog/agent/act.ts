import { liveProps, parseControlProps } from "./live-props";
import type { Definition } from "../probes";
import { migrateScreen } from "../migrations";
import type { Affordance } from "./affordances";
import type { ScreenLike } from "./read";
import {
  actionValueAddress,
  controlsAreValid,
  findAction,
  localValues,
  type selectStep,
  stageProgress,
  stageItemAdjustment,
  stageRecord,
  stageValue,
  validateStep,
} from "./action-input";
import { deviceRandom, drawKey, staleDraw, type RandomSource } from "./draw";
import { sessionKey, staleSession } from "./session";
import { adjustmentChanges, stageStandaloneClock } from "./clocks";
import {
  captureDeviceTime,
  deviceTimeOf,
  filterDeviceDataScreen,
  projectDeviceData,
  type DeviceData,
} from "./device-data";
import { stageLinkedEdit } from "./linked-edits";
import { stageReportEdit } from "./report-edits";
import { stageInlinePress } from "./live-inputs";
import { stageRecordAction, withRecordScreen } from "./record-runtime";
import { isLocalAnchorAction } from "./drives";
export type ActStep = { address: string; action: string; value?: unknown; recordTarget?: string };
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
      driven?: ActStep[];
      anchors?: { address: string; action: "focus" | "jump" }[];
    }
  | { ok: false; code: ActCode; at: number; hint?: string };

function liveInput(def: Definition, input: Values, id: string, local: Values, data?: DeviceData) {
  const parsed = parseControlProps(def, input, (part) => local[`${id}/${part}`]);
  return liveProps(def.meta, parsed, id, local, true, data);
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

function stepProgress(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  next: Values,
  step: ActStep,
  found: Affordance,
  random: RandomSource | null,
  snapshot: DeviceData | undefined,
  now: number,
) {
  const record = stageRecord(screen, defs, next, step, snapshot, now);
  if (record !== undefined) return record ? "" : false;
  return (
    stageLinkedEdit(screen, defs, next, found, step.value) ??
    stageProgress(screen, defs, step.address, step, next, random, snapshot)
  );
}

function stageControl(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  next: Values,
  resolved: ActStep,
  found: Parameters<typeof stageValue>[2],
  links: Extract<ActResult, { ok: true }>["links"],
  timing: { owner: "planner" | "controller"; snapshot: DeviceData | undefined; now: number },
  {
    key,
    edit,
    limits,
    changes,
    declared,
  }: ReturnType<typeof validateStep> & ReturnType<typeof selectStep> & { key: string },
): Omit<Extract<ActResult, { ok: false }>, "at"> | undefined {
  const { address, action, value } = resolved;
  const { owner, snapshot, now } = timing;
  let adjusted = edit
    ? undefined
    : stageItemAdjustment(screen, defs, address, action, next, found.adjustment);
  if (!edit && adjusted === undefined && found.adjustment) {
    const base = `${screen.id}/${address.split("/")[0]}`;
    for (const [part, amount] of Object.entries(adjustmentChanges(found.adjustment, now)))
      next[`${base}/${part}`] = amount;
    next[key] = found.adjustment.next;
    adjusted = true;
  } else if (owner === "planner") stageStandaloneClock(screen, defs, next, address, resolved, snapshot);
  if (!(adjusted ?? stageValue(next, key, found, value, edit, screen.id, links)))
    return { ok: false, code: "not_actionable" };
  stageInlinePress(screen, defs, resolved, next);
  Object.assign(next, changes);
  if (stageReportEdit(screen, defs, next, resolved, { kind: "input" }, snapshot) === false)
    return { ok: false, code: "invalid_value", hint: "Value conflicts with report props" };
  if (
    (limits || edit?.adjustment || adjusted || declared || found.adjustment) &&
    !controlsAreValid(screen, defs, address, next)
  )
    return { ok: false, code: "invalid_value", hint: "Value conflicts with component props" };
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
  now = deviceTimeOf(data) ?? Date.now(),
): ActResult {
  data = captureDeviceTime(defs, data, now);
  if (random && steps.length > 1) {
    const preview = planAct(input, defs, values, steps, null, clockOwner, data, now);
    if (!preview.ok) return preview;
  }
  const migrated = migrateScreen(input, { variantOnly: true });
  const plan: Extract<ActResult, { ok: true }> = { ok: true, values: { ...values }, changed: [], links: [] };
  const { values: next, changed, links } = plan;
  for (const [at, original] of steps.entries()) {
    const snapshot = withRecordScreen(projectDeviceData(data, next), migrated);
    const screen = filterDeviceDataScreen(migrated, defs, snapshot);
    const action = findAction(screen, defs, next, original, at, snapshot, now);
    if (action.error) return action.error;
    const { address, selected, found, drive, step } = action;
    if (drive) (plan.driven ??= []).push(drive);
    const key = `${screen.id}/${actionValueAddress(address, found)}`;
    const validated = { key, ...selected, ...validateStep(screen, defs, found, step, next, key) };
    const { result } = validated;
    if ("code" in result) return { ok: false, at, ...result };
    const resolved = { ...step, address, value: result.value };
    if (isLocalAnchorAction(step.action)) {
      (plan.anchors ??= []).push({ address: `${screen.id}/${address}`, action: step.action });
      changed.push(`${address} ${step.action}`);
      continue;
    }
    const record = stageRecordAction(screen, defs, next, resolved, now, snapshot);
    if (record && "error" in record) return { ok: false, code: "invalid_value", at, hint: record.error };
    try {
      const progress = record ? "" : stepProgress(screen, defs, next, resolved, found, random, snapshot, now);
      if (progress === false)
        return { ok: false, code: "invalid_value", at, hint: "Invalid record mutation" };
      if (progress !== undefined) {
        changed.push(`${address} ${step.action}${progress}`);
        continue;
      }
    } catch {
      return { ok: false, code: "random_unavailable", at, hint: "Cannot generate a random result" };
    }
    const timing = { owner: clockOwner, snapshot, now };
    const failure = stageControl(screen, defs, next, resolved, found, links, timing, validated);
    if (failure) return { ...failure, at };
    expireProgress(screen, defs, next, snapshot);
    if (found.send)
      (plan.sends ??= []).push({ ...found.send, address: `${screen.id}/${found.send.address}` });
    changed.push(`${address} ${step.action}${key in next ? ` = ${JSON.stringify(next[key])}` : ""}`);
  }
  return plan;
}
