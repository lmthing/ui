import type { ClockMeta, ClockState, ClockTrigger, Meta } from "../../meta";
import type { StateName } from "../../types";
import type { Values } from "../index";

type ClockTarget = {
  spec: ClockMeta;
  holder: Values;
  outer: Values;
  row?: number;
  child?: number;
  base: string;
  suffix: string;
};
const rows = (value: unknown): Values[] => (Array.isArray(value) ? (value as Values[]) : []);
const clockGroups = (meta: Meta) => [meta.clocks, meta.items?.clocks, meta.items?.nested?.clocks];
export const isPlaybackAction = (action: string) => action === "play" || action === "pause";
export const isPlaybackClock = (spec: ClockMeta) =>
  [spec.start, spec.stop, spec.reset].some((trigger) => trigger && isPlaybackAction(trigger.action));
export const hasPlaybackClock = (meta: Meta) =>
  clockGroups(meta).some((specs) => specs?.some(isPlaybackClock));
function targets(specs: readonly ClockMeta[] | undefined, target: Omit<ClockTarget, "spec">) {
  return (specs ?? [])
    .filter((spec) =>
      Object.entries(spec.when ?? {}).every(
        ([key, value]) => (target.holder[key] ?? target.outer[key]) === value,
      ),
    )
    .map((spec) => ({ ...target, spec }));
}
/** Stable clock addresses follow the same row and indexed-sub-item convention as controls. */
export function clockTargets(meta: Meta, props: Values): ClockTarget[] {
  return [
    ...targets(meta.clocks, { holder: props, outer: props, base: "", suffix: "" }),
    ...rows(props[meta.items?.key ?? ""]).flatMap((holder, row) => {
      const base = `${String(holder.id ?? `${meta.items?.prefix ?? "r"}${row + 1}`)}/`;
      return [
        ...targets(meta.items?.clocks, { holder, outer: props, base, suffix: "", row }),
        ...rows(holder[meta.items?.nested?.key ?? ""]).flatMap((item, child) =>
          targets(meta.items?.nested?.clocks, {
            holder: item,
            outer: props,
            base,
            suffix: `_${child + 1}`,
            row,
            child,
          }),
        ),
      ];
    }),
  ];
}
export const clockKey = (clock: ClockTarget) => `${clock.base}$${clock.spec.id}${clock.suffix}`;
export const clockPropKey = (clock: ClockTarget, prop = clock.spec.prop ?? "") =>
  `${clock.base}$${prop}${clock.suffix}${prop === clock.spec.id ? "/seconds" : ""}`;
export const clockSeed = (clock: ClockTarget) =>
  Number(clock.holder[clock.spec.from ?? ""] ?? clock.outer[clock.spec.from ?? ""] ?? 0);
export const clockMax = ({ spec, holder, outer }: ClockTarget) =>
  (typeof spec.max === "function" ? spec.max(holder, outer) : spec.max) ?? Infinity;
export const clockMillis = (state: ClockState, now: number) =>
  (state.remainder ?? 0) + (state.running ? Math.max(0, now - state.from) : 0);
export function clockTime(clock: ClockTarget, state: ClockState | undefined, held: unknown, now: number) {
  if (clock.spec.kind === "until") {
    const date = clock.holder[clock.spec.from ?? ""] ?? clock.outer[clock.spec.from ?? ""];
    const at = clock.holder[clock.spec.at ?? ""] ?? clock.outer[clock.spec.at ?? ""] ?? "00:00";
    return Math.max(0, new Date(`${String(date)}T${String(at)}`).getTime() - now);
  }
  const seed = Number(held ?? state?.seconds ?? clockSeed(clock));
  const elapsed = state?.running ? Math.floor(clockMillis(state, now) / 1000) : 0;
  return Math.min(
    clockMax(clock),
    Math.max(0, state?.running ? state.seconds + (clock.spec.kind === "up" ? elapsed : -elapsed) : seed),
  );
}
export function clockEnded(clock: ClockTarget, seconds: number) {
  return clock.spec.kind === "up" ? seconds >= clockMax(clock) : seconds === 0;
}
export function clockTriggerTarget(clock: ClockTarget, trigger: ClockTrigger) {
  if (trigger.scope === "component") return trigger.part;
  return (
    `${clock.base}${trigger.part === "root" ? "" : trigger.part}${clock.suffix}`.replace(/\/$/, "") || "root"
  );
}
function projectHolder(meta: Meta, props: Values, clock: ClockTarget, changes: Values): Values {
  if (clock.row === undefined) return { ...props, ...changes };
  const key = meta.items!.key;
  return {
    ...props,
    [key]: rows(props[key]).map((row, index) => {
      if (index !== clock.row) return row;
      if (clock.child === undefined) return { ...row, ...changes };
      const nested = meta.items!.nested!.key;
      return {
        ...row,
        [nested]: rows(row[nested]).map((child, at) =>
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
  mode: "all" | "playback" | "legacy" = "all",
): Values {
  let playbackCompletion: StateName | undefined;
  for (const clock of clockTargets(meta, props)) {
    const playback = isPlaybackClock(clock.spec);
    if (mode !== "all" && playback !== (mode === "playback")) continue;
    const state = get(clockKey(clock)) as ClockState | undefined;
    if (!state && !playback && clock.spec.kind !== "until") continue;
    const seconds = clockTime(clock, state, get(clockPropKey(clock)), now);
    const changes: Values = clock.spec.prop ? { [clock.spec.prop]: seconds } : {};
    if (clock.spec.runningProp)
      changes[clock.spec.runningProp] = Boolean(state?.running && !clockEnded(clock, seconds));
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
/** Detached reads project opted-in playback clocks, but do not start legacy clocks. */
export function projectLiveClocks(meta: Meta, props: Values, get: (part: string) => unknown, all: boolean) {
  if (!all && !hasPlaybackClock(meta)) return props;
  return projectClocks(meta, props, get, Number(get("$now") ?? Date.now()), all ? "all" : "playback");
}
/** Shared addresses (for example stop-all) are valid if any owning clock can act. */
export function clockControlDeclared(meta: Meta, target: string, action: string, playbackOnly = false) {
  const [row, part = "root"] = target.split("/");
  const groups = [
    { specs: meta.clocks, local: target, own: true },
    { specs: meta.items?.clocks, local: part, own: false },
    { specs: meta.items?.nested?.clocks, local: part.replace(/_[1-9][0-9]*$/, ""), own: false },
  ];
  return groups.some(({ specs, local, own }) =>
    (specs ?? []).some(
      (spec) =>
        (!playbackOnly || isPlaybackClock(spec)) &&
        [spec.start, spec.stop, spec.reset].some(
          (trigger) =>
            trigger?.action === action &&
            (trigger.scope === "component"
              ? target === trigger.part
              : (own || row?.startsWith(meta.items?.prefix ?? "r")) && local === trigger.part),
        ),
    ),
  );
}
export function clockActionValid(
  meta: Meta,
  props: Values,
  target: string,
  action: string,
  get: (part: string) => unknown,
  now: number,
) {
  const owners = clockTargets(meta, props).flatMap((clock) => {
    const state = get(clockKey(clock)) as ClockState | undefined;
    const seconds = () => clockTime(clock, state, get(clockPropKey(clock)), now);
    return (["start", "stop", "reset"] as const).flatMap((operation) => {
      const trigger = clock.spec[operation];
      if (!trigger || trigger.action !== action || clockTriggerTarget(clock, trigger) !== target) return [];
      const playback = isPlaybackAction(action);
      if (!playback && !["start", "stop"].includes(action) && operation !== "reset") return [true];
      if (playback && operation !== "reset" && clockEnded(clock, seconds())) return [false];
      const running = Boolean(state?.running);
      return [
        operation === "start"
          ? !running
          : operation === "stop"
            ? running
            : running || seconds() !== (state?.seed ?? clockSeed(clock)),
      ];
    });
  });
  return owners.length ? owners.some(Boolean) : !clockControlDeclared(meta, target, action);
}
