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
  emptyDeviceData,
  isRecordJournal,
  liveProps,
  parseAppCurrency,
  projectDeviceData,
  selectDeviceData,
  type AppCurrency,
  type Meta,
  type Values,
} from "../../catalog";

function liveControls(ctx: ControllerContext, meta: Meta, props: Values, component: string) {
  const prefix = `${ctx.screen.id}/`;
  const values = ctx.valuesOf();
  const local = Object.fromEntries(
    Object.entries(values)
      .filter(([key]) => key.startsWith(prefix) || isRecordJournal(key))
      .map(([key, value]) => [key.startsWith(prefix) ? key.slice(prefix.length) : key, value]),
  );
  const definition = ctx.defs[meta.id]?.meta ?? meta;
  return liveProps(
    definition,
    props,
    component,
    local,
    true,
    projectDeviceData(ctx.options.deviceData, values),
  );
}

/** One dispatcher for human taps and agent steps. Hidden sheets and covered controls are not actionable. */
export function createScreenController(options: ControllerOptions & { currency?: AppCurrency | undefined }) {
  const currency = parseAppCurrency(options.currency);
  const ctx = createControllerContext(options);
  const clock = createClock(ctx);
  const media = createMediaRuntime(ctx);
  const act = createAct(ctx, media, clock.scheduleClock);
  return {
    defs: ctx.defs,
    store: ctx.store,
    get currency() {
      return currency;
    },
    act,
    mountMedia: media.mountMedia,
    tick: clock.tick,
    ...createAccess(ctx, act, currency),
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
      if (Object.keys(expired).length) ctx.store.setMany(expired);
      clock.scheduleClock();
    },
    get openSheet() {
      return ctx.status.openSheet;
    },
    get confirmation() {
      return ctx.confirmationFor();
    },
    confirmationFor: ctx.confirmationFor,
    discardHiddenConfirmation: () => discardHiddenConfirmation(ctx),
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
