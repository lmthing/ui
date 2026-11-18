import {
  createControllerContext,
  createClock,
  createMediaRuntime,
  createAct,
  createAccess,
  type ControllerOptions,
} from "./runtime";
export type { Confirmation } from "./runtime";

/** One dispatcher for human taps and agent steps. Hidden sheets and covered controls are not actionable. */
export function createScreenController(options: ControllerOptions) {
  const ctx = createControllerContext(options);
  const clock = createClock(ctx);
  const media = createMediaRuntime(ctx);
  const act = createAct(ctx, media, clock.scheduleClock);
  return {
    defs: ctx.defs,
    store: ctx.store,
    act,
    mountMedia: media.mountMedia,
    tick: clock.tick,
    ...createAccess(ctx, act),
    mount: clock.scheduleClock,
    get openSheet() {
      return ctx.status.openSheet;
    },
    get confirmation() {
      return ctx.status.confirmation;
    },
    snapshotScreen: () => ctx.liveScreen(ctx.valuesOf(), ctx.status.openSheet),
    reset() {
      ctx.status.openSheet = undefined;
      ctx.status.confirmation = undefined;
      media.reset();
      ctx.store.reset(ctx.screen.id);
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
