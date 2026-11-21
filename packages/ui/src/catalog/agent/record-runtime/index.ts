import type { Meta } from "../../meta";
import type { Definition } from "../../probes";
import { deviceTimeOf, selectDeviceData, type DeviceData } from "../device-data";
import { liveProps, parseControlProps } from "../live-props";
import { addressedItems } from "../visibility";
import type { ActStep, ScreenLike, Values } from "../index";

export const isRecordJournal = (key: string) => key.startsWith("$record:");
const addressOf = (screen: string, key: string) =>
  key.startsWith(`${screen}/`) ? key.slice(screen.length + 1) : key;

function context(meta: Meta, props: Values, values: Values, now: number, data?: DeviceData) {
  const spec = meta.recordRuntime!;
  const scope = props[spec.scope];
  const key = typeof scope === "string" ? `$record:${spec.kind}:${encodeURIComponent(scope)}` : undefined;
  const existing = key && values[key];
  return {
    key,
    input: {
      props,
      now,
      data: selectDeviceData(meta, data),
      journal: Array.isArray(existing) ? existing : [],
    },
  };
}

export function projectRecordRuntime(
  meta: Meta,
  props: Values,
  instance: string,
  values: Values,
  data?: DeviceData,
  now?: number,
) {
  if (!meta.recordRuntime) return props;
  const at = Number(values[`${instance}/$now`] ?? now ?? deviceTimeOf(data) ?? Date.now());
  return { ...props, ...meta.recordRuntime.project(context(meta, props, values, at, data).input) };
}

function pressAt(meta: Meta, address: string, action: string) {
  if (action !== "press") return;
  const [, item, part, extra] = address.split("/");
  const presses = meta.recordRuntime?.presses;
  if (item && part && !extra && presses && Object.hasOwn(presses, part))
    return { item, press: presses[part]! };
}
export const isRecordPress = (meta: Meta, address: string, action: string) =>
  Boolean(pressAt(meta, address, action));

/** Bind a pending confirmation to a durable record (and, for receipts, its revision). */
export function recordTargetAt(meta: Meta, props: Values, address: string, action: string) {
  const control = pressAt(meta, address, action);
  const row = control && addressedItems(meta, props).find(({ id }) => id === control.item);
  return row ? JSON.stringify([props[meta.recordRuntime!.scope], control.press.target(row)]) : undefined;
}

export function stageRecordPress(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  next: Values,
  step: ActStep,
  now: number,
  data?: DeviceData,
) {
  const entry = screen.components.find(({ id }) => id === step.address.split("/")[0]);
  const def = entry && defs[entry.c];
  const control = def && pressAt(def.meta, step.address, step.action);
  if (!control || !def || !entry) return;
  const { id, c: _c, state: _state, ...raw } = entry;
  const local = Object.fromEntries(
    Object.entries(next).map(([key, value]) => [addressOf(screen.id, key), value]),
  );
  const get = (part: string) => local[`${id}/${part}`];
  const props = parseControlProps(def, raw, get);
  const at = Number(get("$now") ?? now);
  const projected = liveProps(def.meta, props, id, local, true, data, at);
  const row = addressedItems(def.meta, projected).find(({ id }) => id === control.item);
  const { key, input } = context(def.meta, props, next, at, data);
  if (!row || !key || step.value !== undefined)
    return { error: "The record press needs an addressed record and no value" };
  if (
    step.recordTarget !== undefined &&
    step.recordTarget !== recordTargetAt(def.meta, projected, step.address, step.action)
  )
    return { error: "The record changed after confirmation opened" };
  const plan = control.press.plan(input, row);
  if (!("error" in plan) && plan.operation !== undefined) next[key] = [...input.journal, plan.operation];
  return plan;
}
