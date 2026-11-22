import {
  atDeviceTime,
  buzzTarget,
  filterDeviceDataScreen,
  projectDeviceData,
  projectDeviceRows,
  hasPlaybackClock,
  hasRecordClock,
  mediaHostKey,
  withDisabledSelectionChecks,
  wordsFor,
  type ActStep,
  type Values,
} from "../../../catalog";
import type { ActOptions, ActReply } from "../index";
import { actionFailure } from "../actions";
import type { ControllerContext } from "./context";
import type { MediaRuntime } from "./media";
import { planSteps } from "./planning";

function isBuzz(ctx: ControllerContext, { address, action }: ActStep): boolean {
  const [id, ...parts] = ctx.relative(address).split("/");
  const entry = ctx.sourceOf(id!);
  const meta = entry && ctx.defs[entry.c]?.meta;
  return !!meta && Boolean(buzzTarget(meta, parts.join("/") || "root", action));
}

function snapshotPlanning(
  ctx: ControllerContext,
  touchNow: () => number,
  holdApproval?: symbol,
): ControllerContext {
  const at = ctx.now();
  const values = ctx.valuesOf(at);
  const data = atDeviceTime(ctx.options.deviceData, at);
  const projected = projectDeviceData(data, values);
  if (ctx.standalone)
    for (const { c, id } of ctx.screen.components)
      if (ctx.defs[c] && hasRecordClock(ctx.defs[c]!.meta)) values[ctx.key(id, "$now")] = at;
  const disabledParts = new Map(ctx.disabledParts);
  return {
    ...ctx,
    options: { ...ctx.options, deviceData: data, clipboard: ctx.clipboard },
    screen: filterDeviceDataScreen(ctx.screen, ctx.defs, projected),
    now: () => at,
    touchNow,
    valuesOf: () => values,
    status: { ...ctx.status, confirmation: ctx.confirmationFor(data, at) },
    mounted: new Map(ctx.mounted),
    hold: { parts: new Map(ctx.hold.parts), approval: holdApproval },
    disabledParts,
    liveScreen: (next, sheet, covered) =>
      withDisabledSelectionChecks(ctx.liveScreen(next, sheet, covered, at), disabledParts),
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

function commitSteps(
  ctx: ControllerContext,
  result: ReturnType<typeof planSteps>,
  hadConfirmation: boolean,
  agent: boolean,
  media: Values,
) {
  const { state, effects } = result;
  ctx.status.openSheet = state.sheet;
  ctx.status.confirmation = state.confirmation;
  if (!ctx.standalone) {
    state.values[`${ctx.screen.id}/$sheet`] = state.sheet;
    state.values[`${ctx.screen.id}/$agentMode`] = agent;
  }
  // Planning timestamps must not freeze subsequent detached reads.
  for (const { c, id } of ctx.screen.components) {
    const meta = ctx.defs[c]?.meta;
    if (meta && (hasRecordClock(meta) || (!ctx.standalone && hasPlaybackClock(meta))))
      state.values[ctx.key(id, "$now")] = undefined;
  }
  if (!ctx.standalone || state.confirmation || hadConfirmation)
    state.values[`${ctx.screen.id}/$confirmation`] = state.confirmation;
  delete state.values[mediaHostKey];
  ctx.hosts.commit(state.values);
  ctx.store.setMany({ ...media, ...state.values });
  ctx.hosts.prune();
  for (const step of result.performed)
    if (step.action === "stop") ctx.micCapture.release(step.address, "stop");
  for (const effect of effects) effect();
}

export function createAct(ctx: ControllerContext, media: MediaRuntime, scheduleClock: () => void) {
  return function act(
    steps: ActStep | ActStep[],
    opts: ActOptions = {},
    markToken?: symbol,
    holdApproval?: symbol,
  ): ActReply {
    if (ctx.status.disposed) return actionFailure(0, "not_actionable", "This screen is no longer mounted");
    if (ctx.options.interactive === false)
      return actionFailure(0, "not_interactive", "This screen is a preview");
    if (!ctx.admitted()) return actionFailure(0, "not_actionable", "This screen requires admission");
    const list = Array.isArray(steps) ? steps : [steps];
    if (markToken && (ctx.standalone || opts.agent || list.length !== 1))
      return actionFailure(0, "not_actionable", "Private control");
    if (!list.length) return { ok: true, screen: ctx.screen.id, changed: "", dryRun: Boolean(opts.dryRun) };
    // Sample contact before projection, and reuse it if the action is planned again.
    let touchTime = opts.dryRun ? 0 : list.some((step) => isBuzz(ctx, step)) ? ctx.touchNow() : undefined;
    // A host snapshot change invalidates the confirmation independently of this action's result.
    if (!opts.dryRun) discardHiddenConfirmation(ctx);
    const planning = snapshotPlanning(ctx, () => (touchTime ??= ctx.touchNow()), holdApproval);
    const preview = planSteps(list, planning, media, null, markToken, opts.agent);
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
    const result = preview.drew
      ? planSteps(list, planning, media, ctx.options.random, markToken, opts.agent)
      : preview;
    if (result.error) {
      settleMedia(false);
      return result.error;
    }
    commitSteps(ctx, result, Boolean(planning.status.confirmation), Boolean(opts.agent), settleMedia(true));
    media.reconcile();
    scheduleClock();
    ctx.notifyChange();
    return { ok: true, screen: ctx.screen.id, changed: result.state.changes.join("\n"), dryRun: false };
  };
}
