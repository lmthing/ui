import type { Definition } from "../../probes";
import {
  captureDeviceTime,
  deviceTimeOf,
  filterDeviceDataScreen,
  projectDeviceData,
  type DeviceData,
} from "../device-data";
import { migrateScreen } from "../../migrations";
import { acceptsPrivateMark, privateMarkKey, type PrivateMarks } from "../private-controls";
import { withRecordScreen } from "../record-runtime";
import { validateStep } from "./index";
import { itemEditSpec } from "../report-edits";
import { pickerAt, pickerSelectionChanges } from "../live-inputs";
import { planDateSpan } from "../date-span";
import {
  choiceOptions,
  validateActionValue,
  type Affordance,
  type ActResult,
  liveProps,
  parseControlProps,
  projectAdjustments,
  resolveChoice,
  selectionAt,
  selectionChanges,
  selectionError,
  selectionOffer,
  sessionActionProps,
  sessionState,
  type ActStep,
  type ScreenLike,
  type Values,
} from "../index";

import { moveKey } from "../collections";
import { localValues } from "../live-props";
import { affordancesOfScreen } from "./screen-offers";

export type SelectedStep = {
  step: ActStep;
  error?: string | undefined;
  changes?: Values | undefined;
  declared?: boolean;
};

export function selectStep(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  step: ActStep,
  address: string,
  values: Values,
  data?: DeviceData,
  now?: number,
): SelectedStep {
  if (step.action !== "select" && step.action !== "press") return { step };
  const [id, ...parts] = address.split("/");
  const entry = screen.components.find((item) => item.id === id);
  const def = entry && defs[entry.c];
  const target = parts.join("/") || "root";
  const offer = def && selectionOffer(def.meta, target);
  const item = def && itemEditSpec(def.meta, target)?.action === "select";
  const dateSpan = def?.meta.dateSpan;
  if (!def || (step.action !== "select" && !(step.action === "press" && target === dateSpan?.clear)))
    return { step };
  if (!dateSpan && !def.meta.select && !offer && !item && !def.meta.items?.pickers) return { step };
  const { id: _id, c: _c, state: _state, ...raw } = entry!;
  const local = localValues(screen.id, values);
  const get = (part: string) => local[`${id}/${part}`];
  let props = parseControlProps(def, raw, get);
  if (
    item ||
    dateSpan ||
    def.meta.select?.runtime ||
    def.meta.items?.deviceData ||
    def.meta.recordRuntime ||
    def.meta.localState ||
    def.meta.items?.pickers ||
    Object.hasOwn(def.meta.selections ?? {}, target)
  )
    props = liveProps(def.meta, props, id!, local, true, data, now);
  else if (def.meta.items?.set) props = projectAdjustments(def.meta, props, get);
  props = sessionActionProps(def.meta, props, sessionState(def.meta, props, get));
  const span = dateSpan && planDateSpan(def.meta, props, step, target, `${screen.id}/${id}`);
  if (span || step.action !== "select") return span ?? { step };
  const picker = pickerAt(def.meta, props, target);
  if (item || picker) {
    const selected = resolveChoice(choiceOptions(def.meta, props, target) ?? [], step.value, !!picker);
    if (!selected) return { step, error: "Select an allowed value at this address" };
    const changes = picker && pickerSelectionChanges(`${screen.id}/${id}`, target, selected.value, values);
    return { step: { ...step, value: selected.value }, changes };
  }
  if (!def.meta.select && !offer) return { step };
  const error = selectionError(def.meta, props, target, step.value);
  return {
    step: { ...step, value: selectionAt(def.meta, props, target, step.value)?.value },
    error,
    declared: Boolean(offer && !offer.runtime),
    changes: Object.fromEntries(
      Object.entries(selectionChanges(def.meta, props, target, step.value)).map(([part, value]) => [
        `${screen.id}/${id}/${part}`,
        value,
      ]),
    ),
  };
}

export function actionValueAddress(address: string, found: Affordance) {
  if (found.nestedStep) return `${address.split("/")[0]}/${found.nestedStep.key}`;
  if (found.flagKey) return `${address.split("/")[0]}/${found.flagKey}`;
  return found.move ? moveKey(address) : address;
}

export function findAction(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  next: Values,
  original: ActStep,
  at: number,
  data?: DeviceData,
  now?: number,
  hostCapture = false,
) {
  const address = hostCapture
    ? original.address
    : original.address.replace(new RegExp(`^${screen.id}/`), "").replace(/\/root$/, "");
  const offered = affordancesOfScreen(screen, defs, next, data, now, hostCapture ? original : undefined);
  const found = offered.find((a) => a.address === address && a.action === original.action);
  if (found?.hostSecret)
    return { error: { ok: false, code: "not_actionable", at, hint: "Use the local control" } as const };
  if (found?.hostReveal)
    return {
      error: { ok: false, code: "not_actionable", at, hint: "Reveal requires a local press" } as const,
    };
  if (!found) {
    const here = offered.filter((a) => a.address === address).map((a) => a.action);
    const hint = here.length ? `offers ${here.join(", ")}` : "no action at this address";
    return { error: { ok: false, code: "not_actionable", at, hint } as const };
  }
  const selected =
    offeredSelection(found, original) ?? selectStep(screen, defs, original, address, next, data, now);
  if (selected.error)
    return { error: { ok: false, code: "invalid_value", at, hint: selected.error } as const };
  const { drive } = found;
  if (!drive) return { address, selected, found, drive, step: selected.step };
  const invalid = validateActionValue(original.action, original.value);
  if (invalid) return { error: { ok: false, at, ...invalid } as const };
  const destination = offered.find((a) => a.address === drive.address && a.action === drive.action);
  if (!destination || destination.hostReveal || destination.hostIntent || destination.hostSecret)
    return { error: { ok: false, code: "not_actionable", at } as const };
  const driven =
    offeredSelection(destination, drive) ?? selectStep(screen, defs, drive, drive.address, next, data, now);
  if (driven.error) return { error: { ok: false, code: "invalid_value", at, hint: driven.error } as const };
  return { address: drive.address, selected: driven, found: destination, drive, step: driven.step };
}

function offeredSelection(found: Affordance, step: ActStep): SelectedStep | undefined {
  const { rowSelection, nestedChoice } = found;
  if (rowSelection)
    return {
      step: { ...step, value: rowSelection.value },
      error:
        step.value === undefined || step.value === rowSelection.value
          ? undefined
          : "Select the option at this address",
    };
  if (nestedChoice) {
    const choice = resolveChoice(nestedChoice.options, step.value);
    return {
      step: { ...step, value: choice?.value },
      error: choice ? undefined : "Select an allowed value at this address",
      declared: true,
    };
  }
}

/** Kit-only entry for one already-canonical, registered capture. */
export function planHostAct(
  input: ScreenLike,
  defs: Record<string, Definition>,
  values: Values,
  step: ActStep,
  marks: PrivateMarks,
  token: symbol,
  data?: DeviceData,
): ActResult {
  const unavailable = { ok: false, code: "not_actionable", at: 0 } as const;
  if (step.action !== "set" || !acceptsPrivateMark(marks, step.address, step.value, token))
    return unavailable;
  const now = deviceTimeOf(data) ?? Date.now();
  const migrated = migrateScreen(input, { variantOnly: true });
  const snapshot = withRecordScreen(projectDeviceData(captureDeviceTime(defs, data, now), values), migrated);
  const screen = filterDeviceDataScreen(migrated, defs, snapshot);
  const action = findAction(screen, defs, values, step, 0, snapshot, now, true);
  if (action.error) return action.error;
  const key = `${screen.id}/${step.address}`;
  const { result } = validateStep(screen, defs, action.found, step, values, key);
  if ("code" in result) return { ok: false, at: 0, ...result };
  if (result.value !== step.value) return unavailable;
  // Do not run generic edit or record effects that can copy the reference to other addresses.
  return {
    ok: true,
    values: { ...values, [key]: step.value, [privateMarkKey(screen.id, step.address)]: true },
    changed: [`${step.address} ${step.action}`],
    links: [],
  };
}
