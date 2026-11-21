import type { ClockMeta, ClockState } from "../../meta";
import type { Definition } from "../../probes";
import type { Values } from "../act";
import { recordKey, selectDeviceData, type DeviceData } from "../device-data";
import { rememberRecordIds, validRecordWire, writeRecordWire } from "../report-edits";
import { inLocalWeek } from "../device-data";
import { projectControlInput } from "../live-props";

type Get = (part: string) => unknown;
type Context = {
  def: Definition;
  wire: Values;
  props: Values;
  get: Get;
  now: number;
  data?: DeviceData | undefined;
};

export const hasRecordClock = (meta: Definition["meta"]) =>
  Boolean(meta.clocks?.some(({ commitOnStop }) => commitOnStop));

function clockOperation(clock: ClockMeta, target: string, action: string) {
  return (["start", "stop", "reset"] as const).find(
    (op) => clock[op]?.part === target && clock[op]?.action === action,
  );
}

function recordClockStep({ def, wire, props, get, now, data }: Context, target: string, action: string) {
  const owners = (def.meta.clocks ?? []).filter(
    (clock) => clock.commitOnStop && clockOperation(clock, target, action),
  );
  if (!owners.length) return;
  const clock = owners.find((clock) =>
    Object.entries(clock.when ?? {}).every(([key, value]) => props[key] === value),
  );
  if (!clock || clock.kind !== "up" || !clock.start || !clock.stop || !Number.isFinite(now)) return false;
  const op = clockOperation(clock, target, action)!;
  if (clock[op]?.value !== undefined) return false;
  const state = get(`$${clock.id}`) as ClockState | undefined;
  const commit = clock.commitOnStop!;
  const selection = JSON.stringify([props[commit.week], ...commit.selection.map((key) => props[key])]);
  if (op === "start")
    return !state?.running && { clock, op, state: { running: true, from: now, seconds: 0, selection } };
  if (op === "reset")
    return (
      Boolean(state?.running || state?.seconds) && {
        clock,
        op,
        state: { running: false, from: now, seconds: 0 },
      }
    );
  if (!state?.running || state.selection !== selection || now <= state.from) return false;
  const rows = wire[commit.rows] ?? props[commit.rows];
  if (!Array.isArray(rows)) return false;
  const snapshot = selectDeviceData(def.meta, data);
  const timeZone = commit.timeZone?.(snapshot);
  if ((commit.timeZone && !timeZone) || !inLocalWeek(state.from, now, props[commit.week], timeZone))
    return false;
  const row = commit.record({ start: state.from, end: now }, props, snapshot);
  if (!row) return false;
  const keys = def.meta.items?.key === commit.rows ? def.meta.items.records?.keys : undefined;
  const key = keys && recordKey(row, keys);
  if (keys && (key === undefined || rows.some((before) => recordKey(before, keys) === key))) return false;
  const patch = { [commit.rows]: [...rows, row] };
  return (
    validRecordWire(def, wire, patch) && {
      clock,
      op,
      patch,
      row,
      state: { running: false, from: now, seconds: Math.floor((now - state.from) / 1000) },
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
) {
  if (!hasRecordClock(def.meta)) return;
  const context = recordClockInput(def, raw, props, get, data, now);
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
  const { clock, state, op, patch, row } = change;
  if (patch) {
    writeRecordWire(values, base, patch);
    if (context.def.meta.items?.key === clock.commitOnStop?.rows)
      rememberRecordIds(context.def.meta, context.props, values, base, row);
  }
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
) {
  return {
    def,
    props,
    get,
    data,
    now: Number(get("$now") ?? now),
    wire: projectControlInput(def, input, get),
  };
}
