import {
  createControllerContext,
  createClock,
  createMediaRuntime,
  createAct,
  createAccess,
  discardHiddenConfirmation,
  type ControllerContext,
  type ControllerOptions,
} from "./runtime";
export type { Confirmation } from "./runtime";
import { projectScreen } from "./live-screen";
import {
  atDeviceTime,
  emptyDeviceData,
  liveProps,
  projectDeviceData,
  selectDeviceData,
  type Meta,
  type Values,
} from "../../catalog";

function liveControls(ctx: ControllerContext, meta: Meta, props: Values, component: string) {
  const prefix = `${ctx.screen.id}/`;
  const now = ctx.now();
  const values = ctx.valuesOf(now);
  const local = Object.fromEntries(
    Object.entries(values)
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, value]) => [key.slice(prefix.length), value]),
  );
  const definition = ctx.defs[meta.id]?.meta ?? meta;
  return liveProps(
    definition,
    props,
    component,
    local,
    true,
    atDeviceTime(projectDeviceData(ctx.options.deviceData, values), now),
  );
}

/** One dispatcher for human taps and agent steps. Hidden sheets and covered controls are not actionable. */
export function createScreenController(options: ControllerOptions) {
  const ctx = createControllerContext(options);
  const clock = createClock(ctx, () => discardHiddenConfirmation(ctx));
  const media = createMediaRuntime(ctx);
  const act = createAct(ctx, media, clock.scheduleClock);
  return {
    defs: ctx.defs,
    store: ctx.store,
    act,
    mountMedia: media.mountMedia,
    tick: clock.tick,
    ...createAccess(ctx, act),
    deviceDataFor(component: string, data = options.deviceData) {
      const source = ctx.sourceOf(component);
      const def = source && ctx.defs[source.c];
      return def ? selectDeviceData(def.meta, projectDeviceData(data, ctx.valuesOf())) : emptyDeviceData;
    },
    get deviceData() {
      return options.deviceData;
    },
    liveControls: (meta: Meta, props: Values, component: string) => liveControls(ctx, meta, props, component),
    mount() {
      const expired = ctx.expiredProgress(ctx.valuesOf());
      // A boundary may have passed between the initial render and the mount effect.
      const timeGated = ctx.screen.components.some(({ c }) => ctx.defs[c]?.meta.deviceDataWake);
      if (timeGated || Object.keys(expired).length) ctx.store.setMany(expired);
      clock.scheduleClock();
    },
    get openSheet() {
      return ctx.status.openSheet;
    },
    get confirmation() {
      return ctx.confirmationFor();
    },
    confirmationFor: ctx.confirmationFor,
    discardHiddenConfirmation: () => {
      discardHiddenConfirmation(ctx);
      clock.scheduleDeviceWake();
    },
    snapshotScreen: () => {
      const values = ctx.valuesOf();
      return projectScreen(ctx.screen, ctx.defs, values, ctx.now(), ctx.status.openSheet);
    },
    reset() {
      ctx.status.openSheet = undefined;
      ctx.status.confirmation = undefined;
      media.reset();
      ctx.store.reset(ctx.screen.id);
      ctx.resetValues();
      clock.scheduleClock();
      ctx.notifyChange();
    },
    dispose() {
      ctx.status.disposed = true;
      clock.dispose();
      media.dispose();
    },
  };
}
export type ScreenController = ReturnType<typeof createScreenController>;
