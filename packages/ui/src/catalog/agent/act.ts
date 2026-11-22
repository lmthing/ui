import type { Definition } from "../probes";
import { migrateScreen } from "../migrations";
import type { ScreenLike } from "./read";
import {
  actionValueAddress,
  controlsAreValid,
  expireProgress,
  findAction,
  type selectStep,
  stageStepProgress,
  stageItemAdjustment,
  stageValue,
  validateStep,
} from "./action-input";
import { deviceRandom, type RandomSource } from "./draw";
import { adjustmentChanges, stageStandaloneClock } from "./clocks";
import {
  captureDeviceTime,
  deviceTimeOf,
  filterDeviceDataScreen,
  projectDeviceData,
  type DeviceData,
} from "./device-data";
import { stageReportEdit } from "./report-edits";
import { stageInlinePress } from "./live-inputs";
import { isLocalAnchorAction } from "./drives";
import type { Affordance } from "./affordances";
import type { HostIntent } from "./host-commands";
import { stageLocalEvent, stageRecordAction, withRecordScreen } from "./record-runtime";
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
      hostCommands?: HostIntent[];
      localEvent?: true;
      anchors?: { address: string; action: "focus" | "jump" }[];
    }
  | { ok: false; code: ActCode; at: number; hint?: string };
function stageEffect(
  plan: Extract<ActResult, { ok: true }>,
  screen: ScreenLike,
  address: string,
  action: string,
  found: Affordance,
) {
  if (found.hostIntent) (plan.hostCommands ??= []).push(found.hostIntent);
  else if (isLocalAnchorAction(action))
    (plan.anchors ??= []).push({ address: `${screen.id}/${address}`, action });
  // Clipboard text is a host effect, not a value to persist or echo back.
  else if (action !== "copy") return false;
  plan.changed.push(`${address} ${action}`);
  return true;
}

function recordControlResult(
  plan: Extract<ActResult, { ok: true }>,
  found: Affordance,
  screen: ScreenLike,
  resolved: ActStep,
  key: string,
) {
  if (found.send) (plan.sends ??= []).push({ ...found.send, address: `${screen.id}/${found.send.address}` });
  const { address, action } = resolved;
  plan.changed.push(
    `${address} ${action}${key in plan.values ? ` = ${JSON.stringify(plan.values[key])}` : ""}`,
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
  const { values: next } = plan;
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
    if (stageEffect(plan, screen, address, step.action, found)) continue;
    const resolved = { ...step, address, value: result.value };
    if (found.localEvent) {
      const failure = stageLocalEvent(screen, defs, next, resolved, found.localEvent);
      if (failure) return { ok: false, code: "invalid_value", at, hint: failure.error };
      plan.localEvent = true;
      plan.changed.push(`${address} ${step.action}`);
      continue;
    }
    const record = stageRecordAction(screen, defs, next, resolved, now, snapshot);
    if (record && "error" in record) return { ok: false, code: "invalid_value", at, hint: record.error };
    try {
      const progress = record
        ? ""
        : stageStepProgress(screen, defs, next, resolved, found, random, snapshot, now);
      if (progress === false)
        return { ok: false, code: "invalid_value", at, hint: "Invalid record mutation" };
      if (progress !== undefined) {
        plan.changed.push(`${address} ${step.action}${progress}`);
        continue;
      }
    } catch {
      return { ok: false, code: "random_unavailable", at, hint: "Cannot generate a random result" };
    }
    const timing = { owner: clockOwner, snapshot, now };
    const failure = stageControl(screen, defs, next, resolved, found, plan.links, timing, validated);
    if (failure) return { ...failure, at };
    expireProgress(screen, defs, next, snapshot);
    recordControlResult(plan, found, screen, resolved, key);
  }
  return plan;
}
