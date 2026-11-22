import type { ActResult, ActStep, HostIntent, ScreenLike, Values } from "../../../../catalog";
import { selectedStep, stageConfirmedClear, type ActReply } from "../../index";
import { actionFailure, type ActionContext, type ActionState } from "../../actions";
import type { ControllerContext, MediaRuntime, ScreenComponent } from "../index";
import { confirmReport, dispatchPlan, inactive, introducedPart, mediaContext } from "./introduced-part";
import { matchesMediaConfirmation } from "../media";
import { actionInput, disabledHint } from "./action-input";

export type PreparedAction = {
  state: ActionState;
  context: ActionContext;
  drive: ActStep | undefined;
  host: HostIntent | undefined;
  localEvent?: true;
};
type PreparedStep = PreparedAction | { error: Extract<ActReply, { ok: false }> };
type Plan = Extract<ActResult, { ok: true }>;

function confirmedValues(
  ctx: ControllerContext,
  active: ScreenLike,
  entry: ScreenComponent,
  input: Values,
  selected: ActStep,
  plan: Plan,
  confirmed: NonNullable<ActionState["confirmation"]>,
  at: number,
) {
  if (!matchesMediaConfirmation(confirmed, plan.media?.[0]))
    return { error: actionFailure(at, "not_actionable", "The attachment changed") };
  if (confirmed.host && !plan.hostCommands?.length)
    return { error: actionFailure(at, "not_actionable", "The host command changed") };
  if (plan.hostCommands?.length) return { values: plan.values };
  const values =
    ctx.standalone && ctx.defs[entry.c]!.meta.items?.reset === undefined
      ? plan.values
      : stageConfirmedClear(ctx.screen.id, entry, input, ctx.defs[entry.c]!, selected, plan.values);
  if (!values) return { error: actionFailure(at, "invalid_value", "Clear conflicts with component props") };
  if (confirmReport(ctx, active, values, selected, confirmed.removal) === false)
    return { error: actionFailure(at, "invalid_value", "Confirmation conflicts with report props") };
  return { values };
}

export function prepareStep(
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
  const resolution = confirmed
    ? confirmedValues(ctx, active, entry, input, selected, plan, confirmed, at)
    : { values: plan.values };
  if (resolution.error) return { error: resolution.error };
  const { values } = resolution;
  return {
    state: { ...state, values, changes: [...state.changes, ...plan.changed] },
    drive: plan.driven?.[0],
    host: plan.hostCommands?.[0],
    ...(plan.localEvent && { localEvent: true }),
    context: {
      screen: ctx.screen,
      active,
      entry,
      input,
      defs: ctx.defs,
      selected,
      plannedDate: plan.datePicks?.[0],
      links: plan.links,
      anchors: plan.anchors,
      send: plan.sends?.[0],
      media: plan.media?.[0],
      sequence: plan.sequence,
      at,
      now: ctx.now,
      key: ctx.key,
      options: ctx.options,
      ...mediaContext(media),
    },
  };
}
