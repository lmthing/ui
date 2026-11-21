import {
  atDeviceTime,
  filterDeviceDataScreen,
  projectDeviceData,
  projectDeviceRows,
  hasPlaybackClock,
  hasRecordClock,
  wordsFor,
  type ActStep,
  type Values,
} from "../../../catalog";
import type { ActOptions, ActReply } from "../index";
import { actionFailure } from "../actions";
import type { ControllerContext } from "./context";
import type { MediaRuntime } from "./media";
import { planSteps } from "./planning";

function snapshotPlanning(ctx: ControllerContext): ControllerContext {
  const at = ctx.now();
  const values = ctx.valuesOf(at);
  const data = atDeviceTime(ctx.options.deviceData, at);
  const projected = projectDeviceData(data, values);
  if (ctx.standalone)
    for (const { c, id } of ctx.screen.components)
      if (ctx.defs[c] && hasRecordClock(ctx.defs[c]!.meta)) values[ctx.key(id, "$now")] = at;
  return {
    ...ctx,
    options: { ...ctx.options, deviceData: data },
    screen: filterDeviceDataScreen(ctx.screen, ctx.defs, projected),
    now: () => at,
    valuesOf: () => values,
    status: { ...ctx.status, confirmation: ctx.confirmationFor(data, at) },
    mounted: new Map(ctx.mounted),
    disabledParts: new Map(ctx.disabledParts),
    liveScreen: (next, sheet, covered) => ctx.liveScreen(next, sheet, covered, at),
    inputOf: (entry) => projectDeviceRows(ctx.defs[entry.c]!.meta, ctx.inputOf(entry), projected),
    expiredProgress: (next) => ctx.expiredProgress(next, at),
  };
}

export function discardHiddenConfirmation(ctx: ControllerContext) {
  if (ctx.status.confirmation && !ctx.confirmationFor()) {
    ctx.status.confirmation = undefined;
    ctx.store.set(`${ctx.screen.id}/$confirmation`, undefined);
  }
}

export function createAct(ctx: ControllerContext, media: MediaRuntime, scheduleClock: () => void) {
  return function act(steps: ActStep | ActStep[], opts: ActOptions = {}): ActReply {
    if (ctx.status.disposed) return actionFailure(0, "not_actionable", "This screen is no longer mounted");
    if (ctx.options.interactive === false)
      return actionFailure(0, "not_interactive", "This screen is a preview");
    const list = Array.isArray(steps) ? steps : [steps];
    if (!list.length) return { ok: true, screen: ctx.screen.id, changed: "", dryRun: Boolean(opts.dryRun) };
    // A host snapshot change invalidates the confirmation independently of this action's result.
    if (!opts.dryRun) discardHiddenConfirmation(ctx);
    const planning = snapshotPlanning(ctx);
    const preview = planSteps(list, planning, media, null);
    if (preview.error) return preview.error;
    if (opts.dryRun)
      return { ok: true, screen: ctx.screen.id, changed: preview.state.changes.join("\n"), dryRun: true };
    // Prepare media after validation, before consuming randomness or committing values.
    let settleMedia: (commit: boolean) => Values = () => ({});
    try {
      if (!ctx.standalone) settleMedia = media.prepare(preview.performed, Boolean(preview.drew));
    } catch (error) {
      return actionFailure(
        0,
        "media_unavailable",
        error instanceof Error ? error.message : wordsFor(ctx.options.lang).mediaUnavailable,
      );
    }
    const result = preview.drew ? planSteps(list, planning, media, ctx.options.random) : preview;
    if (result.error) {
      settleMedia(false);
      return result.error;
    }
    const { state, effects } = result;
    ctx.status.openSheet = state.sheet;
    ctx.status.confirmation = state.confirmation;
    if (!ctx.standalone) {
      state.values[`${ctx.screen.id}/$sheet`] = state.sheet;
      state.values[`${ctx.screen.id}/$agentMode`] = Boolean(opts.agent);
    }
    // Planning timestamps must not freeze subsequent detached reads.
    for (const { c, id } of ctx.screen.components) {
      const meta = ctx.defs[c]?.meta;
      if (meta && (hasRecordClock(meta) || (!ctx.standalone && hasPlaybackClock(meta))))
        state.values[ctx.key(id, "$now")] = undefined;
    }
    if (!ctx.standalone || state.confirmation || planning.status.confirmation)
      state.values[`${ctx.screen.id}/$confirmation`] = state.confirmation;
    ctx.store.setMany({ ...settleMedia(true), ...state.values });
    for (const effect of effects) effect();
    scheduleClock();
    ctx.notifyChange();
    return { ok: true, screen: ctx.screen.id, changed: state.changes.join("\n"), dryRun: false };
  };
}
