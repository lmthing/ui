import {
  createControllerContext,
  createClock,
  createSequenceClock,
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
  isRecordJournal,
  liveProps,
  parseAppCurrency,
  projectDeviceData,
  projectSelectionBinding,
  selectDeviceData,
  selectionBindingFor,
  withDisabledSelectionChecks,
  withRecordScreen,
  type AppCurrency,
  type Meta,
  type Values,
} from "../../catalog";

function liveControls(ctx: ControllerContext, meta: Meta, props: Values, component: string) {
  const prefix = `${ctx.screen.id}/`;
  const now = ctx.now();
  const values = ctx.valuesOf(now);
  const local = Object.fromEntries(
    Object.entries(values)
      .filter(([key]) => key.startsWith(prefix) || isRecordJournal(key))
      .map(([key, value]) => [key.startsWith(prefix) ? key.slice(prefix.length) : key, value]),
  );
  const definition = ctx.defs[meta.id]?.meta ?? meta;
  const data = withRecordScreen(
    atDeviceTime(projectDeviceData(ctx.options.deviceData, values), now),
    ctx.screen,
  );
  const live = liveProps(definition, props, component, local, true, data);
  if (!definition.selectionBinding) return live;
  const sheet = ctx.status.openSheet;
  const visible = ctx.liveScreen(values, sheet, Boolean(sheet), now);
  const screen = withDisabledSelectionChecks(visible, ctx.disabledParts);
  const selection = selectionBindingFor(screen, ctx.defs, definition, component, local, data);
  return projectSelectionBinding(definition, live, selection?.view);
}

function deviceDataFor(ctx: ControllerContext, component: string, data = ctx.options.deviceData) {
  const source = ctx.sourceOf(component);
  const def = source && ctx.defs[source.c];
  return def ? selectDeviceData(def.meta, projectDeviceData(data, ctx.valuesOf())) : emptyDeviceData;
}

/** One dispatcher for human taps and agent steps. Hidden sheets and covered controls are not actionable. */
export function createScreenController(options: ControllerOptions & { currency?: AppCurrency | undefined }) {
  const currency = parseAppCurrency(options.currency);
  const ctx = createControllerContext(options);
  const clock = createClock(ctx, () => discardHiddenConfirmation(ctx));
  const sequence = createSequenceClock(ctx);
  const media = createMediaRuntime(ctx);
  const schedule = () => {
    clock.scheduleClock();
    sequence.tick();
  };
  const act = createAct(ctx, media, schedule);
  const access = createAccess(ctx, act, currency);
  return {
    defs: ctx.defs,
    store: ctx.store,
    get currency() {
      return currency;
    },
    act,
    mountMedia: media.mountMedia,
    activeMedia: media.activeMedia,
    attachmentReference: media.attachmentReference,
    tick() {
      clock.tick();
      sequence.tick();
    },
    ...access,
    registerPart(address: string) {
      const unregister = access.registerPart(address);
      return () => {
        unregister();
        if (options.attachments || options.resolvePlayback) queueMicrotask(media.reconcile);
      };
    },
    deviceDataFor: (component: string, data = options.deviceData) => deviceDataFor(ctx, component, data),
    get deviceData() {
      return options.deviceData;
    },
    liveControls: (meta: Meta, props: Values, component: string) => liveControls(ctx, meta, props, component),
    ...lifecycle(ctx, clock, sequence, media, schedule),
  };
}
export type ScreenController = ReturnType<typeof createScreenController>;

function lifecycle(
  ctx: ControllerContext,
  clock: ReturnType<typeof createClock>,
  sequence: ReturnType<typeof createSequenceClock>,
  media: ReturnType<typeof createMediaRuntime>,
  schedule: () => void,
) {
  return {
    mount() {
      const expired = ctx.expiredProgress(ctx.valuesOf());
      // A boundary may have passed between the initial render and the mount effect.
      const timeGated = ctx.screen.components.some(({ c }) => ctx.defs[c]?.meta.deviceDataWake);
      if (timeGated || Object.keys(expired).length) ctx.store.setMany(expired);
      clock.scheduleClock();
      sequence.mount();
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
      media.reconcile();
      sequence.tick();
    },
    snapshotScreen: () => {
      const values = ctx.valuesOf();
      return projectScreen(
        ctx.screen,
        ctx.defs,
        values,
        ctx.now(),
        ctx.status.openSheet,
        false,
        true,
        ctx.options.deviceData,
      );
    },
    reset() {
      ctx.status.openSheet = undefined;
      ctx.status.confirmation = undefined;
      media.reset();
      ctx.store.reset(ctx.screen.id);
      ctx.resetValues();
      schedule();
      ctx.notifyChange();
    },
    dispose() {
      ctx.status.disposed = true;
      clock.dispose();
      sequence.dispose();
      media.dispose();
    },
  };
}
