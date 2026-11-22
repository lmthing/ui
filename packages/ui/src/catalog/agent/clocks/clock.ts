import type { ClockMeta, ClockState, ClockTrigger, Meta } from "../../meta";
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
export const clockRows = (value: unknown): Values[] => (Array.isArray(value) ? (value as Values[]) : []);
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
    ...clockRows(props[meta.items?.key ?? ""]).flatMap((holder, row) => {
      const base = `${String(holder.id ?? `${meta.items?.prefix ?? "r"}${row + 1}`)}/`;
      return [
        ...targets(meta.items?.clocks, { holder, outer: props, base, suffix: "", row }),
        ...clockRows(holder[meta.items?.nested?.key ?? ""]).flatMap((item, child) =>
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
export function canReplay(clock: ClockTarget) {
  return (
    clock.spec.kind === "up" &&
    clock.spec.restartOnPlay === true &&
    clock.spec.start?.action === "play" &&
    clockMax(clock) > 0
  );
}
export function clockTriggerTarget(clock: ClockTarget, trigger: ClockTrigger) {
  if (trigger.scope === "component") return trigger.part;
  return (
    `${clock.base}${trigger.part === "root" ? "" : trigger.part}${clock.suffix}`.replace(/\/$/, "") || "root"
  );
}
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
      if (playback && operation !== "reset" && (state?.expired || clockEnded(clock, seconds())))
        return [operation === "start" && canReplay(clock)];
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
