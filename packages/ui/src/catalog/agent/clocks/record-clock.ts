import type { ClockMeta, ClockState } from "../../meta";
import type { Definition } from "../../probes";
import type { Values } from "../act";
import { inLocalWeek, recordKey, selectDeviceData, type DeviceData } from "../device-data";
import { rememberRecordIds, validRecordWire, writeRecordWire } from "../report-edits";
import { projectControlInput } from "../live-props";

type Get = (part: string) => unknown;
type Owners = Readonly<Record<string, string>>;
export const recordClockOwnersKey = "$recordClockOwners";
type Context = {
  def: Definition;
  wire: Values;
  props: Values;
  get: Get;
  now: number;
  data?: DeviceData | undefined;
  owners?: Owners | undefined;
};

export function resetRecordClockOwners(values: Values, screen: string) {
  if (!Object.hasOwn(values, recordClockOwnersKey)) return;
  const owners = values[recordClockOwnersKey] as Owners;
  values[recordClockOwnersKey] = Object.fromEntries(
    Object.entries(owners).filter(([, owner]) => !owner.startsWith(`${screen}/`)),
  );
}

export const hasRecordClock = (meta: Definition["meta"]) =>
  Boolean(meta.clocks?.some(({ commitOnStop }) => commitOnStop));

function clockOperation(clock: ClockMeta, target: string, action: string) {
  return (["start", "stop", "reset"] as const).find(
    (op) => clock[op]?.part === target && clock[op]?.action === action,
  );
}

function recordClockStep(context: Context, target: string, action: string) {
  const { def, props, get, now, data, owners } = context;
  const matching = (def.meta.clocks ?? []).filter(
    (clock) => clock.commitOnStop && clockOperation(clock, target, action),
  );
  if (!matching.length) return;
  const clock = matching.find((clock) =>
    Object.entries(clock.when ?? {}).every(([key, value]) => props[key] === value),
  );
  if (!clock || clock.kind !== "up" || clock.start?.action !== "start" || clock.stop?.action !== "stop")
    return false;
  const op = clockOperation(clock, target, action)!;
  if (clock[op]?.value !== undefined) return false;
  const state = get(`$${clock.id}`) as ClockState | undefined;
  const commit = clock.commitOnStop!;
  const group = `group:${commit.group ?? def.meta.id}`;
  if (op === "reset")
    return Boolean(state?.running) && { clock, group, op, state: { running: false, from: now, seconds: 0 } };
  if (!Number.isFinite(now)) return false;
  const snapshot = selectDeviceData(def.meta, data);
  const zone = commit.timeZone?.(snapshot);
  if ((commit.timeZone && !zone) || !commit.validTarget(props, snapshot)) return false;
  const selection = JSON.stringify([props[commit.week], ...commit.selection.map((key) => props[key])]);
  if (op === "start") {
    if (
      state?.running ||
      Object.hasOwn(owners ?? {}, group) ||
      !inLocalWeek(now, now + 1, props[commit.week], zone)
    )
      return false;
    return { clock, group, op, state: { running: true, from: now, seconds: 0, selection } };
  }
  if (!state?.running || state.selection !== selection || now <= state.from) return false;
  if (!inLocalWeek(state.from, now, props[commit.week], zone)) return false;
  return appendSession(context, clock, group, state.from, snapshot);
}

function appendSession(
  { def, wire, props, now }: Context,
  clock: ClockMeta,
  group: string,
  start: number,
  data: DeviceData,
) {
  const commit = clock.commitOnStop!;
  const rows = wire[commit.rows] ?? props[commit.rows];
  if (!Array.isArray(rows)) return false;
  const row = commit.record({ start, end: now }, props, data);
  if (!row) return false;
  const keys = def.meta.items?.key === commit.rows ? def.meta.items.records?.keys : undefined;
  const key = keys && recordKey(row, keys);
  if (keys && (key === undefined || rows.some((before) => recordKey(before, keys) === key))) return false;
  const patch = { [commit.rows]: [...rows, row] };
  return (
    validRecordWire(def, wire, patch) && {
      clock,
      group,
      op: "stop" as const,
      patch,
      row,
      state: { running: false, from: now, seconds: Math.floor((now - start) / 1000) },
    }
  );
}

export function recordClockOffer(
  def: Definition,
  raw: Values,
  props: Values,
  get: Get,
  data?: DeviceData,
  now?: number,
  values?: Values,
) {
  if (!hasRecordClock(def.meta)) return;
  const context = recordClockInput(def, raw, props, get, data, now, values);
  return (target: string, action: string) => recordClockStep(context, target, action) !== false;
}

export function stageRecordClock(
  context: Context,
  values: Values,
  base: string,
  target: string,
  action: string,
) {
  const change = recordClockStep(context, target, action);
  if (!change) return change;
  const { clock, group, state, op } = change;
  if ("patch" in change) {
    writeRecordWire(context.def.meta, context.wire, values, base, change.patch);
    if (context.def.meta.items?.key === clock.commitOnStop?.rows)
      rememberRecordIds(context.def.meta, context.props, values, base, change.row);
  }
  const owners = { ...context.owners };
  if (op === "start") owners[group] = base;
  else if (owners[group] === base) delete owners[group];
  values[recordClockOwnersKey] = owners;
  values[`${base}/$${clock.id}`] = state;
  if (clock.prop)
    values[`${base}/$${clock.prop}${clock.prop === clock.id ? "/seconds" : ""}`] = state.seconds;
  if (clock[op]?.state) values[`${base}/$state`] = clock[op].state;
  return true;
}

export function recordClockInput(
  def: Definition,
  input: Values,
  props: Values,
  get: (part: string) => unknown,
  data?: DeviceData,
  now = Date.now(),
  values?: Values,
) {
  return {
    def,
    props,
    get,
    data,
    owners: values?.[recordClockOwnersKey] as Owners | undefined,
    now: Number(get("$now") ?? now),
    wire: projectControlInput(def, input, get),
  };
}
