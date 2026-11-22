import { projectScreen } from "../index";
import type {
  ControllerContext,
  createClock,
  createMediaRuntime,
  createReveal,
  createSequenceClock,
} from "./index";
import { discardHiddenConfirmation } from "./dispatch";

type Clock = ReturnType<typeof createClock>;
type Media = ReturnType<typeof createMediaRuntime>;
type Reveal = ReturnType<typeof createReveal>;
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

function reconcile(ctx: ControllerContext, reveal: Reveal, media: Media) {
  ctx.hosts.prune();
  discardHiddenConfirmation(ctx);
  reveal.reconcile();
  media.reconcile();
}

export function controllerLifecycle(
  ctx: ControllerContext,
  clock: Clock,
  media: Media,
  reveal: Reveal,
  sequence: Sequence,
) {
  const schedule = () => {
    clock.scheduleClock();
    sequence.tick();
  };
  const admission = watchAdmission(ctx, clock, sequence, () => {
    reconcile(ctx, reveal, media);
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
      reconcile(ctx, reveal, media);
      schedule();
    },
    snapshotScreen: () => snapshotScreen(ctx),
    reset() {
      ctx.status.openSheet = undefined;
      ctx.status.confirmation = undefined;
      ctx.hosts.reset();
      reveal.clear();
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
      reveal.clear();
      clock.dispose();
      sequence.dispose();
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
