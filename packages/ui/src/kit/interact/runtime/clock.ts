import { projectScreen, type TimerState } from "../index";
import type { ControllerContext } from "./context";
function needsClock(ctx: ControllerContext) {
  return ctx.screen.components.some(
    (entry) =>
      entry.c === "Timer" &&
      ((ctx.store.get(ctx.key(entry.id, "$timer")) as TimerState | undefined)?.running ||
        (entry.style === "until" && new Date(`${entry.until}T${entry.at ?? "00:00"}`).getTime() > ctx.now())),
  );
}
function tickValues(ctx: ControllerContext) {
  const values = ctx.valuesOf();
  const current = projectScreen(ctx.screen, ctx.defs, values, ctx.now(), ctx.status.openSheet, true);
  let changed = false;
  for (const entry of current.components)
    if (entry.c === "Timer") {
      const timer = values[ctx.key(entry.id, "$timer")] as TimerState | undefined;
      if (timer?.running) {
        const seconds = Number(entry.seconds);
        if (values[ctx.key(entry.id, "$seconds")] !== seconds) {
          values[ctx.key(entry.id, "$seconds")] = seconds;
          changed = true;
        }
        if ((entry.style !== "up" && seconds === 0) || (entry.style === "up" && seconds === 86400)) {
          values[ctx.key(entry.id, "$timer")] = { ...timer, running: false, seconds: 0 };
          changed = true;
        }
      }
      if (entry.style === "until" && values[ctx.key(entry.id, "$tick")] !== Math.floor(ctx.now() / 60000)) {
        values[ctx.key(entry.id, "$tick")] = Math.floor(ctx.now() / 60000);
        changed = true;
      }
    }
  if (changed) {
    ctx.store.setMany(values);
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
