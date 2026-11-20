import { drawRole, sessionEvent, type ActStep, type RandomSource, type Values } from "../../../../catalog";
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
  dispatchPlan,
  drivenPartBlock,
  inactive,
  introducedPart,
  standaloneEffects,
} from "./introduced-part";
import { actionInput, disabledHint } from "./action-input";
export { drivenPartBlock } from "./introduced-part";

type PreparedStep =
  | { state: ActionState; context: ActionContext; drive: ActStep | undefined }
  | { error: Extract<ActReply, { ok: false }> };
function prepareStep(
  state: ActionState,
  action: ActStep,
  ctx: ControllerContext,
  media: MediaRuntime,
  at: number,
  confirmed = false,
): PreparedStep {
  const active = ctx.liveScreen(state.values, state.sheet, Boolean(state.sheet));
  const id = action.address.split("/")[0]!;
  const entry = active.components.find((item) => item.id === id);
  const fail = (code: string, hint: string) => ({ error: actionFailure(at, code, hint) });
  if (!entry || !ctx.defs[entry.c]) return fail("not_actionable", "No component at this address");
  if (inactive(ctx, entry)) return fail("not_actionable", "This component is not filled");
  const def = ctx.defs[entry.c]!;
  const disabled = ctx.disabledParts.has(action.address);
  if (disabled && !introducedPart(ctx, state, entry, action, true))
    return fail("disabled", "This control is disabled");
  let input: Values;
  try {
    input = actionInput(ctx, entry, state.values);
  } catch {
    return fail("invalid_value", "This component has invalid props");
  }
  const hint = !ctx.standalone && disabledHint(entry.c, action.action, input);
  if (hint) return fail("disabled", hint);
  const selected = ctx.standalone ? action : selectedStep(action, entry, input, def);
  const plan = dispatchPlan(ctx, active, state.values, selected, null);
  if (!plan.ok) return { error: { ...plan, at } };
  const mustMount = ctx.options.requireMounted && !confirmed && !ctx.mounted.has(action.address);
  if (mustMount && !introducedPart(ctx, state, entry, action))
    return fail("not_mounted", "This control is not mounted");
  const values =
    confirmed && !ctx.standalone
      ? stageConfirmedClear(ctx.screen.id, entry, input, def, selected, plan.values)
      : plan.values;
  if (!values) return fail("invalid_value", "Clear conflicts with component props");
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
function needsConfirmation(ctx: ControllerContext, { entry, selected }: ActionContext) {
  if (!ctx.standalone) return true;
  const meta = ctx.defs[entry.c]!.meta;
  const { successActions, errorActions, live } = meta;
  const part = selected.address.split("/").slice(1).join("/") || "root";
  if (successActions?.length || errorActions?.length || live?.derive || meta.linkedEdits) return true;
  return Boolean(sessionEvent(meta, part, selected.action));
}
function isDraw({ entry, defs, selected }: ActionContext) {
  const target = selected.address.split("/").slice(1).join("/") || "root";
  const role = drawRole(defs[entry.c]!.meta, target, selected.action);
  return role === "draw" || role === "redraw";
}

function stepRunner(
  ctx: ControllerContext,
  media: MediaRuntime,
  random: RandomSource | null | undefined,
  at: number,
  execution: { performed: ActStep[]; drew: boolean },
) {
  const run = (before: ActionState, original: ActStep, confirmed = false): ActionResult => {
    const selected = { ...original, address: ctx.relative(original.address) };
    const prepared = prepareStep(before, selected, ctx, media, at, confirmed);
    if ("error" in prepared) return { state: before, effects: [], error: prepared.error };
    const pending =
      !confirmed &&
      needsConfirmation(ctx, prepared.context) &&
      confirmationFor(before, selected, prepared.context);
    if (pending) return pending;
    if (!ctx.standalone && prepared.drive) {
      const block = drivenPartBlock(ctx, prepared.drive.address);
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
    const address = confirmed ? original.address.replace(`${ctx.screen.id}/`, "") : selected.address;
    const links = prepared.context.links.map((link) => ({
      ...link,
      address: `${ctx.screen.id}/${address}`,
    }));
    return handlerFor(selected.action)(
      prepared.state,
      { ...selected, address },
      { ...prepared.context, links },
    );
  };
  return run;
}

export function planSteps(
  list: ActStep[],
  ctx: ControllerContext,
  media: MediaRuntime,
  random: RandomSource | null | undefined,
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
    const action = { ...step, address: ctx.relative(step.address) };
    const run = stepRunner(ctx, media, random, at, execution);
    let result: ActionResult;
    if (state.confirmation)
      result = confirmationAction(state, action, { screen: ctx.screen, at, options: ctx.options }, (s, a) =>
        run(s, a, true),
      );
    else result = run(state, step);
    if (result.error) return { ...result, performed: [] };
    state = result.state;
    if (!ctx.standalone) Object.assign(state.values, ctx.expiredProgress(state.values));
    effects.push(...result.effects);
  }
  return { state, effects, ...execution };
}
