import type { Meta } from "../../meta";
import type { Definition } from "../../probes";
import { deviceTimeOf, selectDeviceData, type DeviceData } from "../device-data";
import { liveProps, localValues, parseControlProps, projectLiveInput } from "../live-props";
import { addressedItems } from "../visibility";
import type { ActStep, ScreenLike, Values } from "../index";
import { hasRecordClock, recordClockInput, stageRecordClock } from "../clocks";
import { isRecordAction, recordRequestAllowed } from "../report-edits";

export const isRecordJournal = (key: string) => key.startsWith("$record:");
const addressOf = (screen: string, key: string) =>
  key.startsWith(`${screen}/`) ? key.slice(screen.length + 1) : key;

const recordScreen = Symbol("recordScreen");
type RecordData = DeviceData & { [recordScreen]?: ScreenLike };
export function withRecordScreen(data: DeviceData | undefined, screen: ScreenLike): RecordData {
  return { ...data, [recordScreen]: screen };
}

function scopeOf(meta: Meta, props: Values, screen?: ScreenLike) {
  const field = meta.recordRuntime?.scope;
  return field ? props[field] : screen?.id;
}

function context(meta: Meta, props: Values, values: Values, now: number, data?: DeviceData) {
  const spec = meta.recordRuntime!;
  const screen = (data as RecordData | undefined)?.[recordScreen];
  const scope = scopeOf(meta, props, screen);
  const key = typeof scope === "string" ? `$record:${spec.kind}:${encodeURIComponent(scope)}` : undefined;
  const existing = key && values[key];
  return {
    key,
    input: {
      props,
      now,
      data: selectDeviceData(meta, data),
      journal: Array.isArray(existing) ? existing : [],
      ...(spec.scope === undefined && { screen }),
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

export function recordActionAt(meta: Meta, part: string, action: string) {
  const actions = meta.recordRuntime?.actions;
  const key = `${part}.${action}` as const;
  return Object.hasOwn(actions ?? {}, key) ? actions?.[key] : undefined;
}

/** Bind a pending confirmation to a durable record (and, for receipts, its revision). */
export function recordTargetAt(
  meta: Meta,
  props: Values,
  address: string,
  action: string,
  screen?: ScreenLike,
) {
  const scope = scopeOf(meta, props, screen);
  const target = address.split("/").slice(1).join("/") || "root";
  const component = recordActionAt(meta, target, action);
  if (component) {
    const identity = component.target(props);
    return typeof scope === "string" && identity !== undefined
      ? JSON.stringify([scope, identity])
      : undefined;
  }
  const control = pressAt(meta, address, action);
  const row = control && addressedItems(meta, props).find(({ id }) => id === control.item);
  return row ? JSON.stringify([scope, control.press.target(row)]) : undefined;
}

export function stageRecordAction(
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
  const target = step.address.split("/").slice(1).join("/") || "root";
  const component = def && recordActionAt(def.meta, target, step.action);
  if ((!control && !component) || !def || !entry) return;
  const { id, c: _c, state: _state, ...raw } = entry;
  const local = Object.fromEntries(
    Object.entries(next).map(([key, value]) => [addressOf(screen.id, key), value]),
  );
  const get = (part: string) => local[`${id}/${part}`];
  const props = parseControlProps(def, raw, get);
  const at = Number(get("$now") ?? now);
  if (component) local[`${id}/$now`] = at;
  const projected = liveProps(def.meta, props, id, local, true, data, at);
  const row = control && addressedItems(def.meta, projected).find(({ id }) => id === control.item);
  const { key, input } = context(def.meta, component ? projected : props, next, at, data);
  const identity = recordTargetAt(def.meta, projected, step.address, step.action, screen);
  if ((!component && !row) || !key || identity === undefined || step.value !== undefined)
    return { error: "The action needs an addressed record and no value" };
  if (step.recordTarget !== undefined && step.recordTarget !== identity)
    return { error: "The record changed after confirmation opened" };
  const plan = component ? component.plan(input) : control!.press.plan(input, row!);
  if (!("error" in plan) && plan.operation !== undefined && (!component || step.recordTarget !== undefined))
    next[key] = [...input.journal, plan.operation];
  return plan;
}

export function stageRecordControl(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  next: Values,
  step: ActStep,
  data: DeviceData | undefined,
  now: number,
) {
  const [id, ...parts] = step.address.split("/");
  const { c, id: _id, state: _state, ...raw } = screen.components.find((entry) => entry.id === id)!;
  const def = defs[c]!;
  const target = parts.join("/") || "root";
  const record = isRecordAction(def.meta, target, step.action);
  if (!record && !hasRecordClock(def.meta)) return;
  const base = `${screen.id}/${id}`;
  const get = (part: string) => next[`${base}/${part}`];
  const props = projectLiveInput(def, raw, id!, localValues(screen.id, next), data, now);
  if (record) return recordRequestAllowed(def.meta, props, target, step); // Intent only until confirmation.
  return stageRecordClock(
    recordClockInput(def, raw, props, get, data, now, next),
    next,
    base,
    target,
    step.action,
  );
}
