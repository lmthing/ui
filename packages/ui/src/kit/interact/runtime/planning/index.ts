import { isLocalAnchorAction, type ActStep, type RandomSource } from "../../../../catalog";
import { selectedStep, stageConfirmedClear, type ActReply } from "../../index";
import {
  actionFailure,
  confirmationAction,
  confirmationFor,
  handlerFor,
  type ActionContext,
  type ActionResult,
  type ActionState,
} from "../../actions";
import type { ControllerContext, MediaRuntime } from "../index";
import {
  confirmReport,
  dispatchPlan,
  drivenPartBlock,
  hostCaptureEffects,
  inactive,
  introducedPart,
  isDraw,
  isRevealRelease,
  needsConfirmation,
  runAnchor,
  standaloneEffects,
} from "./introduced-part";
import { actionInput, disabledHint } from "./action-input";
export { driveAccess } from "./introduced-part";

type PreparedStep =
  | { state: ActionState; context: ActionContext; drive: ActStep | undefined }
  | { error: Extract<ActReply, { ok: false }> };
function prepareStep(
  state: ActionState,
  action: ActStep,
  ctx: ControllerContext,
  media: MediaRuntime,
  at: number,
  confirmed?: ActionState["confirmation"],
  markToken?: symbol,
): PreparedStep {
  const active = ctx.liveScreen(state.values, state.sheet, Boolean(state.sheet));
  const id = action.address.split("/")[0]!;
  const entry = active.components.find((item) => item.id === id);
  const fail = (code: string, hint: string) => ({ error: actionFailure(at, code, hint) });
  if (!entry || !ctx.defs[entry.c]) return fail("not_actionable", "No component at this address");
  if (inactive(ctx, entry)) return fail("not_actionable", "This component is not filled");
  const def = ctx.defs[entry.c]!;
  if (ctx.disabledParts.has(action.address) && !introducedPart(ctx, state, entry, action, true))
    return fail("disabled", "This control is disabled");
  const input = actionInput(ctx, entry, state.values);
  if (!input) return fail("invalid_value", "This component has invalid props");
  const hint = !ctx.standalone && disabledHint(entry.c, action.action, input);
  if (hint) return fail("disabled", hint);
  const selected = ctx.standalone ? action : selectedStep(action, entry, input, def);
  const plan = dispatchPlan(ctx, active, state.values, selected, null, markToken);
  if (!plan.ok) return { error: { ...plan, at } };
  const mustMount = ctx.options.requireMounted && !confirmed && !ctx.mounted.has(action.address);
  if (mustMount && !introducedPart(ctx, state, entry, action))
    return fail("not_mounted", "This control is not mounted");
  const values =
    confirmed && (!ctx.standalone || def.meta.items?.reset !== undefined)
      ? stageConfirmedClear(ctx.screen.id, entry, input, def, selected, plan.values)
      : plan.values;
  if (!values) return fail("invalid_value", "Clear conflicts with component props");
  if (confirmed && confirmReport(ctx, active, values, selected, confirmed.removal) === false)
    return fail("invalid_value", "Confirmation conflicts with report props");
  return {
    state: { ...state, values, changes: [...state.changes, ...plan.changed] },
    drive: plan.driven?.[0],
    context: {
      screen: ctx.screen,
      active,
      entry,
      input,
      defs: ctx.defs,
      selected,
      links: plan.links,
      anchors: plan.anchors,
      send: plan.sends?.[0],
      at,
      now: ctx.now,
      key: ctx.key,
      options: ctx.options,
      playMedia: media.playMedia,
      seekMedia: media.seekMedia,
      requestPhoto: media.requestPhoto,
    },
  };
}

function runControl(
  { state, context }: Extract<PreparedStep, { context: ActionContext }>,
  selected: ActStep,
  address: string,
) {
  const { links, screen } = context;
  return handlerFor(selected.action)(
    state,
    { ...selected, address },
    { ...context, links: links.map((link) => ({ ...link, address: `${screen.id}/${address}` })) },
  );
}

function stepRunner(
  ctx: ControllerContext,
  media: MediaRuntime,
  random: RandomSource | null | undefined,
  at: number,
  execution: { performed: ActStep[]; drew: boolean },
  markToken: symbol | undefined,
) {
  const run = (
    before: ActionState,
    original: ActStep,
    confirmed?: ActionState["confirmation"],
  ): ActionResult => {
    const selected = markToken ? original : { ...original, address: ctx.relative(original.address) };
    if (!markToken && ctx.privateMarks.has(selected.address))
      return { state: before, effects: [], error: actionFailure(at, "not_actionable", "Private control") };
    const prepared = prepareStep(before, selected, ctx, media, at, confirmed, markToken);
    if ("error" in prepared) return { state: before, effects: [], error: prepared.error };
    const pending =
      !confirmed &&
      needsConfirmation(ctx, prepared.context) &&
      confirmationFor(before, selected, prepared.context);
    if (markToken) {
      if (pending)
        return { state: before, effects: [], error: actionFailure(at, "not_actionable", "Private control") };
      return { state: prepared.state, effects: hostCaptureEffects(prepared.context) };
    }
    if (pending) return pending;
    if (!ctx.standalone && prepared.drive) {
      const block = drivenPartBlock(ctx, prepared.drive.address, prepared.drive.action);
      if (block) return { state: before, effects: [], error: actionFailure(at, block.code, block.hint) };
      return run(before, { ...prepared.drive, address: `${ctx.screen.id}/${prepared.drive.address}` });
    }
    execution.performed.push({ ...selected, address: `${ctx.screen.id}/${selected.address}` });
    if (isDraw(prepared.context)) {
      execution.drew = true;
      if (random !== null) {
        const { active, selected: planned } = prepared.context;
        const plan = dispatchPlan(ctx, active, before.values, planned, random);
        if (!plan.ok) return { state: before, effects: [], error: { ...plan, at } };
        prepared.state.values = plan.values;
        prepared.state.changes = [...before.changes, ...plan.changed];
        prepared.context.links = plan.links;
      }
    }
    if (ctx.standalone)
      return {
        state: prepared.state,
        effects: standaloneEffects(prepared.context),
      };
    if (isLocalAnchorAction(selected.action))
      return runAnchor(ctx, before, prepared.state, selected.address, selected.action, at);
    const address = confirmed ? original.address.replace(`${ctx.screen.id}/`, "") : selected.address;
    return runControl(prepared, selected, address);
  };
  return run;
}

export function planSteps(
  list: ActStep[],
  ctx: ControllerContext,
  media: MediaRuntime,
  random: RandomSource | null | undefined,
  markToken?: symbol,
): ActionResult & { performed: ActStep[]; drew?: boolean } {
  let state: ActionState = {
    values: { ...ctx.valuesOf() },
    sheet: ctx.status.openSheet,
    confirmation: ctx.status.confirmation,
    changes: [],
  };
  const effects: (() => void)[] = [];
  const execution = { performed: [] as ActStep[], drew: false };
  for (const [at, step] of list.entries()) {
    const action = markToken ? step : { ...step, address: ctx.relative(step.address) };
    const run = stepRunner(ctx, media, random, at, execution, markToken);
    let result: ActionResult;
    if (state.confirmation && !isRevealRelease(ctx, action))
      result = confirmationAction(state, action, { screen: ctx.screen, at, options: ctx.options }, run);
    else result = run(state, step);
    if (result.error) return { ...result, performed: [] };
    state = result.state;
    if (!ctx.standalone) Object.assign(state.values, ctx.expiredProgress(state.values));
    effects.push(...result.effects);
  }
  return { state, effects, ...execution };
}
