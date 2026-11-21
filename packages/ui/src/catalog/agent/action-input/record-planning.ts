import type { Definition } from "../../probes";
import type { ActStep, Values } from "../act";
import { affordancesOf } from "../affordances";
import {
  hasPlaybackClock,
  hasRecordClock,
  recordClockInput,
  recordClockOffer,
  stageRecordClock,
} from "../clocks";
import type { DeviceData } from "../device-data";
import { liveProps, parseControlProps } from "../live-props";
import type { ScreenLike } from "../read";
import { isRecordAction, recordRequestAllowed } from "../report-edits";
import { localValues } from "./select-step";

function liveInput(def: Definition, input: Values, id: string, local: Values, data?: DeviceData) {
  const parsed = parseControlProps(def, input, (part) => local[`${id}/${part}`]);
  return liveProps(def.meta, parsed, id, local, true, data);
}

export function affordancesOfScreen(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  values: Values,
  data?: DeviceData,
  now?: number,
) {
  const local = localValues(screen.id, values);
  return screen.components.flatMap(({ id, c, state, ...input }) => {
    const def = defs[c];
    if (!def) return [];
    const props = liveInput(def, input, id, local, data);
    const { draw, emptyActions, errorActions, session, successActions, readSuccess, items, live } = def.meta;
    const policy = items?.nested?.activeParent || items?.nested?.maxActive !== undefined;
    // Keep the legacy data-only planner's state fallback for definitions without a state opt-in.
    const liveState =
      (props.state as typeof state) ??
      (draw ||
      emptyActions ||
      errorActions?.length ||
      session ||
      successActions?.length ||
      readSuccess ||
      policy ||
      live ||
      def.meta.linkedEdits ||
      items?.edits ||
      items?.records ||
      items?.pickers ||
      def.meta.clear ||
      def.meta.signOff ||
      hasPlaybackClock(def.meta) ||
      hasRecordClock(def.meta)
        ? state
        : undefined);
    const get = (part: string) => local[`${id}/${part}`];
    const clock = recordClockOffer(def, input, props, get, data, now, values);
    return affordancesOf(def.meta, props, id, local, liveState, true, data, clock);
  });
}

export function stageRecord(
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
  const props = liveInput(def, raw, id!, localValues(screen.id, next), data);
  if (record) return recordRequestAllowed(def.meta, props, target, step); // Intent only until confirmation.
  return stageRecordClock(
    recordClockInput(def, raw, props, get, data, now, next),
    next,
    base,
    target,
    step.action,
  );
}
