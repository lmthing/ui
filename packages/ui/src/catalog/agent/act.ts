import { liveProps, parseControlProps, stageItemAdjustment } from "./live-props";
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
  stageRecord,
  stageValue,
  validateStep,
} from "./action-input";
import { deviceRandom, drawKey, staleDraw, type RandomSource } from "./draw";
import { sessionKey, staleSession } from "./session";
import { clockChanges, clockControlDeclared } from "./clocks";
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
      datePicks?: ActStep[];
    }
  | { ok: false; code: ActCode; at: number; hint?: string };
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
  const legacy =
    (meta.live?.derive || meta.recordRuntime?.actions) &&
    (meta.clocks || meta.items?.clocks || meta.items?.nested?.clocks);
  const target = parts.join("/") || "root";
  if (!legacy && !clockControlDeclared(meta, target, step.action, true)) return;
  const get = (part: string) => next[`${screen.id}/${id}/${part}`];
  const props = legacy
    ? liveInput(def, input, id!, localValues(screen.id, next), data)
    : parseControlProps(def, input, get);
  const now = Number(get("$now") ?? deviceTimeOf(data) ?? Date.now());
  const changes = clockChanges(meta, props, get, target, step, now);
  for (const [part, value] of Object.entries(changes)) next[`${screen.id}/${id}/${part}`] = value;
}

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
  clockOwner: "planner" | "controller",
  snapshot: DeviceData | undefined,
  {
    key,
    edit,
    limits,
    changes,
    declared,
  }: ReturnType<typeof validateStep> & ReturnType<typeof selectStep> & { key: string },
): Omit<Extract<ActResult, { ok: false }>, "at"> | undefined {
  const { address, action, value } = resolved;
  const adjusted = edit ? undefined : stageItemAdjustment(screen, defs, address, action, next);
  if (clockOwner === "planner") stageStandaloneClock(screen, defs, next, address, resolved, snapshot);
  if (!(adjusted ?? stageValue(next, key, found, value, edit, screen.id, links)))
    return { ok: false, code: "not_actionable" };
  stageInlinePress(screen, defs, resolved, next);
  Object.assign(next, changes);
  if (stageReportEdit(screen, defs, next, resolved, { kind: "input" }, snapshot) === false)
    return { ok: false, code: "invalid_value", hint: "Value conflicts with report props" };
  if ((limits || edit?.adjustment || adjusted || declared) && !controlsAreValid(screen, defs, address, next))
    return { ok: false, code: "invalid_value", hint: "Value conflicts with component props" };
}

/** Plans without mutation; commit values only on success. Pass `null` to validate draws without entropy. */
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
    if (step.action === "copy") {
      // Clipboard text stays in the host.
      changed.push(`${address} copy`);
      continue;
    }
    const resolved = { ...step, address, value: result.value };
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
    const failure = stageControl(screen, defs, next, resolved, found, links, clockOwner, snapshot, validated);
    if (failure) return { ...failure, at };
    if (found.dateSpan) (plan.datePicks ??= []).push(resolved);
    expireProgress(screen, defs, next, snapshot);
    if (found.send)
      (plan.sends ??= []).push({ ...found.send, address: `${screen.id}/${found.send.address}` });
    changed.push(`${address} ${step.action}${key in next ? ` = ${JSON.stringify(next[key])}` : ""}`);
  }
  return plan;
}
