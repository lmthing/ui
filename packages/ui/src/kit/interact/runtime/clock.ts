import {
  clockTargets,
  clockKey,
  clockTime,
  clockEnded,
  parseControlProps,
  type ClockState,
  type Meta,
  type Values,
} from "../../../catalog";
import { tickClocks } from "../controls";
import type { ControllerContext } from "./context";

function tickInput(
  ctx: ControllerContext,
  entry: ControllerContext["screen"]["components"][number],
  get: (part: string) => unknown,
) {
  const def = ctx.defs[entry.c]!;
  const { meta } = def;
  if (
    [meta.clocks, meta.items?.clocks, meta.items?.nested?.clocks].some((clocks) =>
      clocks?.some(({ liveDuration }) => liveDuration),
    )
  ) {
    const { id: _id, c: _c, state: _state, ...input } = entry;
    return parseControlProps(def, input, get);
  }
  return ctx.inputOf(entry);
}

function needsClock(ctx: ControllerContext) {
  const values = ctx.valuesOf();
  return ctx.screen.components.some((entry) => {
    if (!ctx.defs[entry.c]) return false;
    const get = (part: string) => values[ctx.key(entry.id, part)];
    if (get("$dismissed") || (get("$state") ?? entry.state ?? "filled") !== "filled") return false;
    return clockTargets(ctx.defs[entry.c]!.meta, tickInput(ctx, entry, get)).some((clock) => {
      const state = get(clockKey(clock)) as ClockState | undefined;
      return clock.spec.kind === "until"
        ? clockTime(clock, undefined, undefined, ctx.now()) > 0
        : Boolean(state?.running);
    });
  });
}
function noteReplayExpiry(meta: Meta, input: Values, changes: Values) {
  for (const clock of clockTargets(meta, input)) {
    if (clock.spec.kind !== "up" || !clock.spec.restartOnPlay || clock.spec.start?.action !== "play")
      continue;
    const key = clockKey(clock);
    const next = changes[key] as ClockState | undefined;
    if (next && !next.running && clockEnded(clock, next.seconds)) changes[key] = { ...next, expired: true };
  }
  return changes;
}

function tickValues(ctx: ControllerContext) {
  const values = ctx.valuesOf();
  const changes: Record<string, unknown> = {};
  for (const entry of ctx.screen.components) {
    if (!ctx.defs[entry.c]) continue;
    const get = (part: string) => values[ctx.key(entry.id, part)];
    if (get("$dismissed") || (get("$state") ?? entry.state ?? "filled") !== "filled") continue;
    const { meta } = ctx.defs[entry.c]!;
    const input = tickInput(ctx, entry, get);
    const ticked = noteReplayExpiry(meta, input, tickClocks(meta, input, get, ctx.now()));
    for (const [part, value] of Object.entries(ticked)) changes[ctx.key(entry.id, part)] = value;
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
