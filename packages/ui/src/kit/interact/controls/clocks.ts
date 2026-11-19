import {
  clockTargets,
  clockKey,
  clockPropKey,
  clockSeed,
  clockTime,
  clockEnded,
  clockTriggerTarget,
  type ActStep,
  type ClockState,
  type Meta,
  type Values,
} from "../../../catalog";

export function initialClocks(meta: Meta, props: Values, now: number): Values {
  return Object.fromEntries(
    clockTargets(meta, props)
      .filter((clock) => clock.spec.kind !== "until")
      .map((clock) => [
        clockKey(clock),
        {
          running: !clock.spec.start,
          from: now,
          seconds: clockSeed(clock),
          seed: clockSeed(clock),
        } satisfies ClockState,
      ]),
  );
}
/** Stage every matching clock transition alongside the existing control action. */
export function clockChanges(
  meta: Meta,
  props: Values,
  get: (part: string) => unknown,
  target: string,
  step: ActStep,
  now: number,
): Values {
  const changes: Values = {};
  const clocks = clockTargets(meta, props);
  for (const clock of clocks) {
    if (clock.spec.kind === "until") continue;
    for (const operation of ["start", "stop", "reset"] as const) {
      const trigger = clock.spec[operation];
      if (!trigger || trigger.action !== step.action || clockTriggerTarget(clock, trigger) !== target)
        continue;
      if (trigger.value !== undefined && (step.value ?? get(target)) !== trigger.value) continue;
      const state = get(clockKey(clock)) as ClockState | undefined;
      const seed = state?.seed ?? clockSeed(clock);
      const seconds = operation === "reset" ? seed : clockTime(clock, state, get(clockPropKey(clock)), now);
      changes[clockKey(clock)] = {
        running: operation === "start",
        from: now,
        seconds,
        seed,
      } satisfies ClockState;
      if (clock.spec.prop) changes[clockPropKey(clock)] = seconds;
      if (trigger.state) changes.$state = trigger.state;
    }
  }
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
/** Materialise a tick; timestamps, not interval counts, determine the reading. */
export function tickClocks(meta: Meta, props: Values, get: (part: string) => unknown, now: number): Values {
  const changes: Values = {};
  for (const clock of clockTargets(meta, props)) {
    const state = get(clockKey(clock)) as ClockState | undefined;
    if (clock.spec.kind === "until") {
      const tick = Math.floor(now / 60000);
      if (get(clockKey(clock)) !== tick) changes[clockKey(clock)] = tick;
      continue;
    }
    if (!state?.running) continue;
    const seconds = clockTime(clock, state, get(clockPropKey(clock)), now);
    if (clock.spec.prop && get(clockPropKey(clock)) !== seconds) changes[clockPropKey(clock)] = seconds;
    if (clockEnded(clock, seconds)) {
      changes[clockKey(clock)] = { ...state, running: false, from: now, seconds };
      const zero = clock.spec.zero;
      if (zero && zero !== "stop" && "state" in zero) changes.$state = zero.state;
    }
  }
  if (changes.$state)
    for (const clock of clockTargets(meta, props)) {
      const state = get(clockKey(clock)) as ClockState | undefined;
      if (!state?.running) continue;
      const seconds = clockTime(clock, state, get(clockPropKey(clock)), now);
      changes[clockKey(clock)] = { ...state, running: false, from: now, seconds };
      if (clock.spec.prop) changes[clockPropKey(clock)] = seconds;
    }
  return changes;
}
