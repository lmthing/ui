import { projectScreen } from "../index";
import type {
  ControllerContext,
  createClock,
  createMediaRuntime,
  createPrivateControls,
  createSequenceClock,
} from "./index";
import { discardHiddenConfirmation } from "./dispatch";

type Clock = ReturnType<typeof createClock>;
type Media = ReturnType<typeof createMediaRuntime>;
type PrivateControls = Pick<ReturnType<typeof createPrivateControls>, "clear" | "reconcile" | "dispose">;
type Sequence = ReturnType<typeof createSequenceClock>;

function watchAdmission(ctx: ControllerContext, clock: Clock, sequence: Sequence, onAdmission: () => void) {
  let unwatch: (() => void) | undefined;
  return {
    mount() {
      unwatch ??= ctx.options.parentGate?.subscribe(onAdmission);
      if (!ctx.admitted()) return;
      const expired = ctx.expiredProgress(ctx.valuesOf());
      // A boundary may have passed between the initial render and the mount effect.
      const timeGated = ctx.screen.components.some(({ c }) => ctx.defs[c]?.meta.deviceDataWake);
      if (timeGated || Object.keys(expired).length) ctx.store.setMany(expired);
      clock.scheduleClock();
      sequence.mount();
    },
    unwatch: () => unwatch?.(),
  };
}

function snapshotScreen(ctx: ControllerContext) {
  if (!ctx.admitted()) return { id: ctx.screen.id, components: [] };
  return projectScreen(
    ctx.screen,
    ctx.defs,
    ctx.valuesOf(),
    ctx.now(),
    ctx.status.openSheet,
    false,
    true,
    ctx.options.deviceData,
  );
}

function reconcile(ctx: ControllerContext, secrets: PrivateControls, media: Media) {
  ctx.hosts.prune();
  discardHiddenConfirmation(ctx);
  secrets.reconcile();
  media.reconcile();
}

export function controllerLifecycle(
  ctx: ControllerContext,
  clock: Clock,
  media: Media,
  secrets: PrivateControls,
  sequence: Sequence,
) {
  const schedule = () => {
    clock.scheduleClock();
    sequence.tick();
  };
  const admission = watchAdmission(ctx, clock, sequence, () => {
    if (!ctx.admitted()) ctx.micCapture.reset();
    reconcile(ctx, secrets, media);
    ctx.store.setMany({});
    if (ctx.admitted()) sequence.mount();
    schedule();
  });
  const view = {
    tick() {
      clock.tick();
      sequence.tick();
    },
    mount: admission.mount,
    discardHiddenConfirmation() {
      reconcile(ctx, secrets, media);
      schedule();
    },
    snapshotScreen: () => snapshotScreen(ctx),
    reset() {
      ctx.status.openSheet = undefined;
      ctx.status.confirmation = undefined;
      ctx.hosts.reset();
      secrets.clear();
      ctx.micCapture.reset();
      media.reset();
      ctx.store.reset(ctx.screen.id);
      ctx.resetValues();
      schedule();
      ctx.notifyChange();
    },
    dispose() {
      ctx.status.disposed = true;
      admission.unwatch();
      ctx.hosts.reset();
      secrets.clear();
      secrets.dispose();
      clock.dispose();
      sequence.dispose();
      ctx.micCapture.reset();
      media.dispose();
    },
  };
  return { view, schedule, registerPart: reconcileOnUnmount(ctx, media) };
}

function reconcileOnUnmount(ctx: ControllerContext, media: Media) {
  return (register: (address: string) => () => void) => (address: string) => {
    const unregister = register(address);
    return () => {
      unregister();
      if (ctx.options.attachments || ctx.options.resolvePlayback) queueMicrotask(media.reconcile);
    };
  };
}
