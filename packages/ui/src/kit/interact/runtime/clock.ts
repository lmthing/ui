import {
  atDeviceTime,
  clockTargets,
  clockKey,
  clockTime,
  clockEnded,
  clockMax,
  hasTimestampClock,
  timestampReading,
  parseControlProps,
  isDeviceDataVisible,
  liveProps,
  projectDeviceData,
  selectDeviceData,
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
    hasTimestampClock(meta) ||
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
  const now = ctx.now();
  const values = ctx.valuesOf(now);
  const data = projectDeviceData(ctx.options.deviceData, values);
  return ctx.screen.components.some((entry) => {
    if (!ctx.defs[entry.c]) return false;
    const get = (part: string) => values[ctx.key(entry.id, part)];
    if (get("$dismissed") || (get("$state") ?? entry.state ?? "filled") !== "filled") return false;
    const { meta } = ctx.defs[entry.c]!;
    return clockTargets(meta, tickInput(ctx, entry, get)).some((clock) => {
      if (clock.spec.timestamp)
        return timestampReading(clock, selectDeviceData(meta, data), now, clockMax(clock))?.running;
      const state = get(clockKey(clock)) as ClockState | undefined;
      return clock.spec.kind === "until"
        ? clockTime(clock, undefined, undefined, ctx.now()) > 0
        : Boolean(
            state?.running &&
            (!clock.spec.journal || !clockEnded(clock, clockTime(clock, state, undefined, now))),
          );
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
  const now = ctx.now();
  const values = ctx.valuesOf(now);
  const data = projectDeviceData(ctx.options.deviceData, values);
  const changes: Record<string, unknown> = {};
  for (const entry of ctx.screen.components) {
    if (!ctx.defs[entry.c]) continue;
    const get = (part: string) => values[ctx.key(entry.id, part)];
    if (get("$dismissed") || (get("$state") ?? entry.state ?? "filled") !== "filled") continue;
    const { meta } = ctx.defs[entry.c]!;
    const input = tickInput(ctx, entry, get);
    const ticked = noteReplayExpiry(meta, input, tickClocks(meta, input, get, now, data));
    for (const [part, value] of Object.entries(ticked)) changes[ctx.key(entry.id, part)] = value;
  }
  if (Object.keys(changes).length) {
    ctx.store.setMany(changes);
    ctx.notifyChange();
  }
}
/** Find the next declared boundary without polling the host. */
function nextDeviceWake(ctx: ControllerContext, now: number): number | undefined {
  const candidates = ctx.screen.components.filter(({ c }) => ctx.defs[c]?.meta.deviceDataWake);
  if (!candidates.length) return;
  const values = ctx.valuesOf(now);
  const data = atDeviceTime(projectDeviceData(ctx.options.deviceData, values), now);
  const prefix = `${ctx.screen.id}/`;
  const local = Object.fromEntries(
    Object.entries(values)
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, value]) => [key.slice(prefix.length), value]),
  );
  let next: number | undefined;
  for (const { c, id, state: _state, ...wire } of candidates) {
    const def = ctx.defs[c]!;
    const { meta } = def;
    if (!isDeviceDataVisible(meta, data)) continue;
    let parsed: Values;
    try {
      parsed = parseControlProps(def, wire, (part) => local[`${id}/${part}`]);
    } catch {
      continue;
    }
    const live = liveProps(meta, parsed, id, local, true, data);
    const at = meta.deviceDataWake!(selectDeviceData(meta, data), live, now);
    if (at !== undefined && Number.isFinite(at) && at > now && (next === undefined || at < next)) next = at;
  }
  return next;
}
const maxTimerDelay = 2 ** 31 - 1;

export function createClock(ctx: ControllerContext, expireConfirmation?: () => void) {
  let clock: ReturnType<typeof setInterval> | undefined;
  let wake: ReturnType<typeof setTimeout> | undefined;
  function scheduleDeviceWake() {
    if (wake !== undefined) clearTimeout(wake);
    wake = undefined;
    if (ctx.status.disposed) return;
    const now = ctx.now();
    const next = nextDeviceWake(ctx, now);
    if (next === undefined) return;
    wake = setTimeout(
      () => {
        if (ctx.now() >= next) {
          expireConfirmation?.();
          // Refresh subscribers without persisting a host clock or a projected flag.
          ctx.store.setMany({});
        }
        scheduleDeviceWake();
      },
      Math.min(next - now, maxTimerDelay),
    );
  }
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
    scheduleClock: () => {
      scheduleClock();
      scheduleDeviceWake();
    },
    scheduleDeviceWake,
    dispose: () => {
      if (clock) clearInterval(clock);
      if (wake !== undefined) clearTimeout(wake);
      clock = undefined;
      wake = undefined;
    },
  };
}
