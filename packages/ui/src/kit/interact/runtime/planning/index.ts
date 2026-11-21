import type { ActStep, RandomSource } from "../../../../catalog";
import {
  actionFailure,
  confirmationAction,
  confirmationFor,
  handlerFor,
  type ActionResult,
  type ActionState,
} from "../../actions";
import type { ControllerContext, MediaRuntime } from "../index";
import {
  dispatchPlan,
  drivenPartBlock,
  hostCaptureEffects,
  isDraw,
  needsConfirmation,
  standaloneEffects,
} from "./introduced-part";
import { prepareStep, type PreparedAction } from "./prepare-step";
import { runHostCommand } from "./host-command";
export { drivenPartBlock, inactive } from "./introduced-part";

function runControl({ state, context }: PreparedAction, selected: ActStep, address: string) {
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
  source: { agent: boolean; single: boolean },
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
    if (prepared.host && !markToken)
      return runHostCommand(ctx, before, prepared, prepared.host, source, confirmed);
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
  agent = false,
): ActionResult & { performed: ActStep[]; drew?: boolean } {
  let state: ActionState = {
    values: { ...ctx.valuesOf() },
    sheet: ctx.status.openSheet,
    confirmation: ctx.status.confirmation,
    changes: [],
  };
  const effects: (() => void)[] = [];
  const execution = { performed: [] as ActStep[], drew: false };
  const source = { agent, single: list.length === 1 };
  for (const [at, step] of list.entries()) {
    const action = markToken ? step : { ...step, address: ctx.relative(step.address) };
    const run = stepRunner(ctx, media, random, at, execution, markToken, source);
    let result: ActionResult;
    if (state.confirmation)
      result = confirmationAction(state, action, { screen: ctx.screen, at, options: ctx.options }, run);
    else result = run(state, step);
    if (result.error) return { ...result, performed: [] };
    state = result.state;
    if (!ctx.standalone) Object.assign(state.values, ctx.expiredProgress(state.values));
    effects.push(...result.effects);
  }
  return { state, effects, ...execution };
}
