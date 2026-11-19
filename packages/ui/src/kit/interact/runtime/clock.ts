import {
  clockTargets,
  clockKey,
  clockPropKey,
  clockTime,
  clockEnded,
  type ClockState,
} from "../../../catalog";
import { tickClocks } from "../controls";
import type { ControllerContext } from "./context";
function needsClock(ctx: ControllerContext) {
  const values = ctx.valuesOf();
  return ctx.screen.components.some((entry) => {
    if (!ctx.defs[entry.c]) return false;
    const get = (part: string) => values[ctx.key(entry.id, part)];
    if (get("$dismissed") || (get("$state") ?? entry.state ?? "filled") !== "filled") return false;
    return clockTargets(ctx.defs[entry.c]!.meta, ctx.inputOf(entry)).some((clock) => {
      const state = get(clockKey(clock)) as ClockState | undefined;
      return clock.spec.kind === "until"
        ? clockTime(clock, undefined, undefined, ctx.now()) > 0
        : Boolean(state?.running) &&
            !clockEnded(clock, clockTime(clock, state, get(clockPropKey(clock)), ctx.now()));
    });
  });
}
function tickValues(ctx: ControllerContext) {
  const values = ctx.valuesOf();
  const changes: Record<string, unknown> = {};
  for (const entry of ctx.screen.components) {
    if (!ctx.defs[entry.c]) continue;
    const get = (part: string) => values[ctx.key(entry.id, part)];
    if (get("$dismissed") || (get("$state") ?? entry.state ?? "filled") !== "filled") continue;
    for (const [part, value] of Object.entries(
      tickClocks(ctx.defs[entry.c]!.meta, ctx.inputOf(entry), get, ctx.now()),
    ))
      changes[ctx.key(entry.id, part)] = value;
  }
  if (Object.keys(changes).length) {
    ctx.store.setMany(changes);
    ctx.notifyChange();
  }
}
export function createClock(ctx: ControllerContext) {
  let clock: ReturnType<typeof setInterval> | undefined;
  function scheduleClock() {
    if (needsClock(ctx) && !clock && !ctx.status.disposed) clock = setInterval(tick, 1000);
    else if ((!needsClock(ctx) || ctx.status.disposed) && clock) {
      clearInterval(clock);
      clock = undefined;
    }
  }
  function tick() {
    if (ctx.status.disposed) return;
    tickValues(ctx);
    scheduleClock();
  }
  return {
    tick,
    scheduleClock,
    dispose: () => {
      if (clock) clearInterval(clock);
      clock = undefined;
    },
  };
}
