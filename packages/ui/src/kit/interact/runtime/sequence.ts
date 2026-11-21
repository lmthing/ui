import {
  atDeviceTime,
  liveProps,
  parseControlProps,
  projectDeviceData,
  sequenceKey,
  sequenceState,
  withRecordScreen,
  type SequenceState,
  type Values,
} from "../../../catalog";
import type { ControllerContext } from "./context";

function frameState(ctx: ControllerContext, values: Values, now: number, mode: "tick" | "mount" | "pause") {
  const sheet = ctx.status.openSheet;
  const visible = ctx.liveScreen(values, sheet, Boolean(sheet), now);
  const prefix = `${ctx.screen.id}/`;
  const local = Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key.replace(prefix, ""), value]),
  );
  const data = withRecordScreen(
    atDeviceTime(projectDeviceData(ctx.options.deviceData, values), now),
    ctx.screen,
  );
  const changes: Values = {};
  let next = Infinity;
  for (const { id, c } of ctx.screen.components) {
    const def = ctx.defs[c];
    if (!def?.meta.sequence) continue;
    const key = ctx.key(id, sequenceKey);
    const saved = values[key] as SequenceState | undefined;
    if (saved?.since === undefined && (mode !== "mount" || saved || !def.meta.sequence.controls?.start))
      continue;
    const entry = visible.components.find((entry) => entry.id === id);
    if (mode === "pause" || !entry || (entry.state && entry.state !== "filled")) {
      if (saved) changes[key] = { index: saved.index };
      continue;
    }
    const { id: _id, c: _c, state: _state, ...wire } = entry;
    const get = (part: string) => local[`${id}/${part}`];
    const props = liveProps(def.meta, parseControlProps(def, wire, get), id, local, true, data, now);
    const { index, min, max, interval, since, auto } = sequenceState(def.meta, props, get)!;
    const fromTime = since ?? (mode === "mount" && !saved && auto ? now : undefined);
    if (
      fromTime === undefined ||
      !Number.isSafeInteger(interval) ||
      interval! <= 0 ||
      max < min ||
      (props.state && props.state !== "filled")
    ) {
      if (saved) changes[key] = { index };
      continue;
    }
    const elapsed = mode === "mount" ? 0 : Math.max(0, Math.floor((now - fromTime) / interval!));
    const position = index + elapsed;
    const from = mode === "mount" ? now : fromTime + elapsed * interval!;
    changes[key] = position > max ? { index: max } : { index: position, since: from };
    if (position <= max) next = Math.min(next, from + interval!);
    if (position === saved?.index && from === saved.since) delete changes[key];
  }
  return { changes, next };
}

export function createSequenceClock(ctx: ControllerContext) {
  let mounted = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cancel = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };
  const update = (mode: "tick" | "mount" | "pause") => {
    cancel();
    if (!mounted && mode !== "pause") return;
    const now = ctx.now();
    const { changes, next } = frameState(ctx, ctx.valuesOf(now), now, mode);
    if (Number.isFinite(next)) timer = setTimeout(tick, Math.min(next - now, 2 ** 31 - 1));
    if (Object.keys(changes).length) {
      ctx.store.setMany(changes);
      if (!ctx.status.disposed) ctx.notifyChange();
    }
  };
  const tick = () => update("tick");
  const enabled =
    ctx.options.interactive !== false && ctx.screen.components.some(({ c }) => ctx.defs[c]?.meta.sequence);
  return {
    tick: () => {
      if (enabled) tick();
    },
    mount: () => {
      if (!enabled || mounted || ctx.status.disposed) return;
      mounted = true;
      update("mount");
    },
    dispose: () => {
      mounted = false;
      if (enabled) update("pause");
    },
  };
}
