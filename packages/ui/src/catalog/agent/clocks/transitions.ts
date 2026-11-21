import type { ClockState, Meta } from "../../meta";
import type { ActStep, Values } from "../index";
import { adjustmentAt } from "./adjustment";
import {
  clockTargets,
  clockKey,
  clockMillis,
  clockPropKey,
  clockSeed,
  clockTime,
  clockEnded,
  clockTriggerTarget,
  isPlaybackClock,
  canReplay,
} from "./clock";

function replayFromZero(
  clock: ReturnType<typeof clockTargets>[number],
  state: ClockState | undefined,
  seconds: number,
) {
  return canReplay(clock) && (state?.expired || clockEnded(clock, seconds));
}

function adjustValues(adjustment: ReturnType<typeof adjustmentAt>, now: number): Values {
  if (adjustment?.atSet || adjustment?.next === undefined) return {};
  const { clock, state, current, next: seconds, key } = adjustment;
  if (!clock) return { [key]: seconds };
  const running = Boolean(
    state?.running && !clockEnded(clock, Number(current)) && !clockEnded(clock, seconds),
  );
  // Keep the next tick on its original boundary when adjusting mid-second.
  const from = running ? now - (clockMillis(state!, now) % 1000) : now;
  const zero = clock.spec.zero;
  return {
    [clockKey(clock)]: { running, from, seconds, seed: state?.seed ?? clockSeed(clock) } satisfies ClockState,
    [clockPropKey(clock)]: seconds,
    ...(clockEnded(clock, seconds) && zero && zero !== "stop" && "state" in zero
      ? { $state: zero.state }
      : {}),
  };
}
/** Stage every matching clock transition alongside the existing control action. */
export function clockChanges(
  meta: Meta,
  props: Values,
  get: (part: string) => unknown,
  target: string,
  step: ActStep,
  now: number,
  adjustment = adjustmentAt(meta, props, target, step.action, get, now),
): Values {
  const changes: Values = {};
  const clocks = clockTargets(meta, props);
  for (const clock of clocks) {
    if (clock.spec.kind === "until" || clock.spec.commitOnStop) continue;
    for (const operation of ["start", "stop", "reset"] as const) {
      const trigger = clock.spec[operation];
      if (!trigger || trigger.action !== step.action || clockTriggerTarget(clock, trigger) !== target)
        continue;
      if (trigger.value !== undefined && (step.value ?? get(target)) !== trigger.value) continue;
      const state = get(clockKey(clock)) as ClockState | undefined;
      const seed = state?.seed ?? clockSeed(clock);
      const current = clockTime(clock, state, get(clockPropKey(clock)), now);
      const replay = operation === "start" && replayFromZero(clock, state, current);
      const seconds = replay ? 0 : operation === "reset" ? seed : current;
      const playback = isPlaybackClock(clock.spec);
      const zero = clock.spec.zero;
      changes[clockKey(clock)] = {
        running: operation === "start",
        from: now,
        seconds,
        seed,
        ...(playback
          ? { remainder: state && operation !== "reset" && !replay ? clockMillis(state, now) % 1000 : 0 }
          : {}),
      } satisfies ClockState;
      if (clock.spec.prop) changes[clockPropKey(clock)] = seconds;
      if (trigger.state) changes.$state = trigger.state;
      // A mounted tick may have saved completion; rewinding removes only that clock's terminal state.
      else if (
        operation === "reset" &&
        playback &&
        zero &&
        zero !== "stop" &&
        "state" in zero &&
        clockEnded(clock, current) &&
        get("$state") === zero.state
      )
        changes.$state = undefined;
    }
  }
  Object.assign(changes, adjustValues(adjustment, now));
  if (changes.$state && changes.$state !== "filled")
    for (const clock of clocks) {
      const state = (changes[clockKey(clock)] ?? get(clockKey(clock))) as ClockState | undefined;
      if (!state?.running) continue;
      const seconds = clockTime(clock, state, changes[clockPropKey(clock)] ?? get(clockPropKey(clock)), now);
      changes[clockKey(clock)] = { ...state, running: false, from: now, seconds };
      if (clock.spec.prop) changes[clockPropKey(clock)] = seconds;
    }
  return changes;
}
