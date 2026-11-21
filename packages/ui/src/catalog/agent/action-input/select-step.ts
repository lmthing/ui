import type { Definition } from "../../probes";
import type { DeviceData } from "../device-data";
import { itemEditSpec } from "../report-edits";
import { pickerAt, pickerSelectionChanges } from "../live-inputs";
import { planDateSpan } from "../date-span";
import {
  choiceOptions,
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

export function localValues(screen: string, values: Values): Values {
  return Object.fromEntries(
    Object.entries(values).map(([address, value]) => [address.replace(`${screen}/`, ""), value]),
  );
}

export function selectStep(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  step: ActStep,
  address: string,
  values: Values,
  data?: DeviceData,
  now?: number,
): { step: ActStep; changes?: Values | undefined; error?: string | undefined; declared?: boolean } {
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
