import type { ClockState, Meta } from "../../../meta";
import type { StateName } from "../../../types";
import { deviceTimeOf, selectDeviceData, type DeviceData } from "../../device-data";
import type { Values } from "../../index";
import {
  clockEnded,
  clockKey,
  clockMax,
  clockPropKey,
  clockRows,
  clockTargets,
  clockTime,
  hasPlaybackClock,
  isPlaybackClock,
} from "../clock";
import { hasTimestampClock, timestampReading } from "./timestamp";
type ClockTarget = ReturnType<typeof clockTargets>[number];

function projectHolder(meta: Meta, props: Values, clock: ClockTarget, changes: Values): Values {
  if (clock.row === undefined) return { ...props, ...changes };
  const key = meta.items!.key;
  return {
    ...props,
    [key]: clockRows(props[key]).map((row, index) => {
      if (index !== clock.row) return row;
      if (clock.child === undefined) return { ...row, ...changes };
      const nested = meta.items!.nested!.key;
      return {
        ...row,
        [nested]: clockRows(row[nested]).map((child, at) =>
          at === clock.child ? { ...child, ...changes } : child,
        ),
      };
    }),
  };
}
/** Live clock props are presentation data, projected only after validating the wire seeds. */
export function projectClocks(
  meta: Meta,
  props: Values,
  get: (part: string) => unknown,
  now: number,
  mode: "all" | "playback" | "legacy" | "record" | "timestamp" = "all",
  data?: DeviceData,
  ids?: readonly (string | undefined)[],
): Values {
  let playbackCompletion: StateName | undefined;
  for (const clock of clockTargets(meta, props, ids)) {
    const playback = isPlaybackClock(clock.spec);
    const family = clock.spec.timestamp
      ? "timestamp"
      : clock.spec.commitOnStop || clock.spec.journal
        ? "record"
        : playback
          ? "playback"
          : "legacy";
    if (mode !== "all" && family !== mode) continue;
    if (family === "timestamp") {
      const live = timestampReading(clock, selectDeviceData(meta, data), now, clockMax(clock));
      props = projectHolder(meta, props, clock, {
        ...(clock.spec.prop ? { [clock.spec.prop]: live?.seconds ?? 0 } : {}),
        ...(clock.spec.runningProp ? { [clock.spec.runningProp]: live?.running ?? false } : {}),
      });
      continue;
    }
    const state = get(clockKey(clock)) as ClockState | undefined;
    if (!state && !playback && clock.spec.kind !== "until" && !clock.spec.journal) continue;
    const seconds = clockTime(clock, state, get(clockPropKey(clock)), now);
    const changes: Values = clock.spec.prop ? { [clock.spec.prop]: seconds } : {};
    const lapsProp = clock.spec.journal?.lap?.prop;
    if (lapsProp) changes[lapsProp] = state?.laps ?? [];
    if (clock.spec.runningProp)
      changes[clock.spec.runningProp] = Boolean(
        state?.running && (clock.spec.journal || !clockEnded(clock, seconds)),
      );
    const zero = clock.spec.zero;
    if (state && clockEnded(clock, seconds) && zero && zero !== "stop") {
      if ("state" in zero) {
        props = { ...props, state: zero.state };
        if (playback) playbackCompletion = zero.state;
      } else changes[zero.prop] = zero.value;
    }
    props = projectHolder(meta, props, clock, changes);
  }
  const state = get("$state");
  if (state === "filled" && playbackCompletion !== undefined) return { ...props, state: playbackCompletion };
  return state === undefined ? props : { ...props, state };
}
export function projectLiveClocks(
  meta: Meta,
  props: Values,
  get: (part: string) => unknown,
  all: boolean,
  data?: DeviceData,
) {
  const records = meta.clocks?.some(({ commitOnStop, journal }) => commitOnStop || journal);
  const timestamp = hasTimestampClock(meta);
  if (!all && !hasPlaybackClock(meta) && !records && !timestamp) return props;
  const now = Number(get("$now") ?? deviceTimeOf(data) ?? Date.now());
  if (!all && records) props = projectClocks(meta, props, get, now, "record");
  if (!all && timestamp) props = projectClocks(meta, props, get, now, "timestamp", data);
  return all || hasPlaybackClock(meta)
    ? projectClocks(meta, props, get, now, all ? "all" : "playback", data)
    : props;
}
