import {
  drawRole,
  isLocalAnchorAction,
  privateMarkKey,
  reportConfirmation,
  sessionEvent,
  type ActStep,
  type RandomSource,
} from "../../../../catalog";
import {
  actionFailure,
  confirmationAction,
  confirmationFor,
  deliverSend,
  handlerFor,
  navigationAction,
  type ActionContext,
  type ActionResult,
  type ActionState,
} from "../../actions";
import type { ControllerContext, MediaRuntime } from "../index";
import { dispatchPlan, prepareStep, type PreparedAction } from "./prepare-step";
import { runHostCommand } from "../host";
import { holdFailure } from "../hold";
export { inactive } from "./prepare-step";

function runControl({ state, context, localEvent }: PreparedAction, selected: ActStep, address: string) {
  const { links, screen } = context;
  return (localEvent ? navigationAction : handlerFor(selected.action))(
    state,
    { ...(context.plannedDate ?? selected), address },
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
    const hold = !confirmed && holdFailure(ctx, selected.address, selected.action, at, ctx.hold.approval);
    if (hold) return { state: before, effects: [], error: hold };
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
      const block = drivenPartBlock(ctx, prepared.drive.address, prepared.drive.action);
      if (block) return { state: before, effects: [], error: actionFailure(at, block.code, block.hint) };
      return run(before, { ...prepared.drive, address: `${ctx.screen.id}/${prepared.drive.address}` });
    }
    if (!prepared.localEvent)
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
    if (ctx.standalone) return { state: prepared.state, effects: standaloneEffects(prepared.context) };
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

function drivenPartBlock(ctx: ControllerContext, address: string, action?: string) {
  if (ctx.privateMarks.has(address) || ctx.store.get(privateMarkKey(ctx.screen.id, address)))
    return { code: "not_actionable", hint: "Private control" };
  if (ctx.disabledParts.has(address)) return { code: "disabled", hint: "This control is disabled" };
  if (action && isLocalAnchorAction(action) && !ctx.anchors.has(address))
    return { code: "not_mounted", hint: "This anchor is not mounted" };
  if (ctx.options.requireMounted && !ctx.mounted.has(address))
    return { code: "not_mounted", hint: "This control is not mounted" };
}

export function driveAccess(ctx: ControllerContext) {
  return (part: string, observe?: true, action?: string) =>
    observe ? !ctx.privateMarks.has(part) : !drivenPartBlock(ctx, part, action);
}

function runAnchor(
  ctx: ControllerContext,
  before: ActionState,
  state: ActionState,
  address: string,
  action: "focus" | "jump",
  at: number,
): ActionResult {
  const block = drivenPartBlock(ctx, address, action);
  if (block) return { state: before, effects: [], error: actionFailure(at, block.code, block.hint) };
  return { state, effects: [() => ctx.anchors.get(address)?.(action)] };
}

function needsConfirmation(ctx: ControllerContext, { entry, selected }: ActionContext) {
  if (!ctx.standalone) return true;
  const meta = ctx.defs[entry.c]!.meta;
  const { successActions, errorActions, live } = meta;
  const part = selected.address.split("/").slice(1).join("/") || "root";
  if (meta.draw?.kind === "deck" && drawRole(meta, part, selected.action) === "reset") return true;
  if (selected.action === "press" && meta.items?.reset === part) return true;
  if (reportConfirmation(meta, part, selected.action)) return true;
  if (successActions?.length || errorActions?.length || live?.derive || meta.linkedEdits || meta.localState)
    return true;
  return Boolean(sessionEvent(meta, part, selected.action));
}

function isDraw({ entry, defs, selected }: ActionContext) {
  const target = selected.address.split("/").slice(1).join("/") || "root";
  const role = drawRole(defs[entry.c]!.meta, target, selected.action);
  return role === "draw" || role === "redraw";
}

/** The planner has staged the mark already; don't send its canonical address through other controls. */
function hostCaptureEffects({ selected, screen, options }: ActionContext) {
  return [() => options.onAction?.({ ...selected, address: `${screen.id}/${selected.address}` })];
}

function standaloneEffects({ links, anchors, send, options }: ActionContext) {
  const effects = links.map(
    ({ goto, address }) =>
      () =>
        options.onLink?.(goto, address),
  );
  if (send) effects.push(() => deliverSend(send, options.onSend));
  for (const { address, action } of anchors ?? []) effects.push(() => options.onAnchor?.(address, action));
  return effects;
}

/** Releasing a private hold cannot be blocked by an unrelated confirmation. */
function isRevealRelease(ctx: ControllerContext, action: ActStep) {
  if (action.action !== "stop") return false;
  const [id, ...parts] = action.address.split("/");
  const entry = ctx.sourceOf(id!);
  const meta = entry && ctx.defs[entry.c]?.meta;
  return !!meta && sessionEvent(meta, parts.join("/") || "root", action.action) === "hide";
}
