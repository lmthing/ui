import {
  hasNestedCollectionControls,
  isNestedTarget,
  parseControlProps,
  planAct,
  projectAdjustments,
  sessionEvent,
  sessionKey,
  stageReportEdit,
  type ActResult,
  type ActStep,
  type HostIntent,
  type RandomSource,
  type ScreenLike,
  type Values,
} from "../../../../catalog";
import { planHostAct } from "../../../../catalog/agent/action-input";
import { selectedStep, stageConfirmedClear, type ActReply } from "../../index";
import { actionFailure, type ActionContext, type ActionState } from "../../actions";
import type { ControllerContext, MediaRuntime, ScreenComponent } from "../index";
import { matchesMediaConfirmation, mediaActionContext } from "../media";

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
  const edit = { kind: "confirm" as const, now: ctx.now(), removal: confirmed.removal };
  if (stageReportEdit(active, ctx.defs, values, selected, edit, ctx.options.deviceData) === false)
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
      ...mediaActionContext(media),
    },
  };
}

function actionInput(ctx: ControllerContext, entry: ScreenComponent, values: Values) {
  try {
    return parseActionInput(ctx, entry, values);
  } catch {
    return undefined;
  }
}

function parseActionInput(ctx: ControllerContext, entry: ScreenComponent, values: Values) {
  const def = ctx.defs[entry.c]!;
  const get = (part: string) => values[ctx.key(entry.id, part)];
  if (ctx.standalone) {
    const { meta } = def;
    const { id: _id, c: _c, state: _state, ...raw } = entry;
    const { session, successActions, errorActions, live } = meta;
    const useParsed =
      meta.items?.reset ||
      (meta.confirmParts?.length &&
        (session || successActions?.length || errorActions?.length || live?.derive || meta.linkedEdits));
    return useParsed ? parseControlProps(def, raw, get) : raw;
  }
  const input = ctx.inputOf(entry);
  return def.meta.items?.set ? projectAdjustments(def.meta, input, get) : input;
}

function disabledHint(component: string, action: string, input: Values) {
  if (component === "Composer" && action === "send" && !String(input.value ?? "").trim())
    return "Write a reply before sending";
  if (component === "Counter" && action === "decrement" && Number(input.value) < Number(input.step))
    return "The counter cannot go below zero";
}

export function inactive(ctx: ControllerContext, entry: ScreenComponent) {
  if (ctx.standalone || !entry.state || entry.state === "filled") return false;
  const { draw, emptyActions, errorActions, loadingActions, session, successActions } =
    ctx.defs[entry.c]!.meta;
  return (
    !draw &&
    !emptyActions?.length &&
    !errorActions?.length &&
    !loadingActions?.length &&
    !session &&
    !successActions?.length
  );
}

/** Check whether an earlier step introduced the part before the view could update. */
function introducedPart(
  ctx: ControllerContext,
  staged: { sheet: string | undefined; values: Values },
  entry: ScreenComponent,
  action: ActStep,
  strict = false,
) {
  const initial = ctx.valuesOf();
  const cursor = ctx.key(entry.id, "$cursor");
  if (!strict && entry.c === "Sheet" && staged.sheet !== ctx.status.openSheet) return true;
  if (!strict && entry.c === "SwipeStack" && staged.values[cursor] !== initial[cursor]) return true;
  const target = action.address.split("/").slice(1).join("/") || "root";
  const key = ctx.key(entry.id, sessionKey);
  const meta = ctx.defs[entry.c]!.meta;
  const session = staged.values[key] !== initial[key] && sessionEvent(meta, target, action.action);
  const nested = !strict && meta.items?.nested?.activeParent && isNestedTarget(meta, target);
  const prefix = `${ctx.screen.id}/${entry.id}/`;
  const gated =
    (meta.live?.derive ||
      meta.live?.toggles ||
      meta.localState ||
      meta.collections ||
      (hasNestedCollectionControls(meta) && isNestedTarget(meta, target)) ||
      (isNestedTarget(meta, target) && (action.action === "increment" || action.action === "decrement")) ||
      meta.select?.runtime ||
      meta.dateSpan ||
      meta.linkedEdits ||
      meta.items?.visibleWhen ||
      meta.items?.edits ||
      meta.signOff) &&
    Object.keys(staged.values).some((key) => key.startsWith(prefix) && staged.values[key] !== initial[key]);
  if (!session && !nested && !gated) return false;
  const sheet = ctx.status.openSheet;
  const source = ctx.liveScreen(initial, sheet, Boolean(sheet));
  const plan = dispatchPlan(ctx, source, initial, action, null);
  return !plan.ok && (Boolean(session) || plan.code === "not_actionable");
}

export function dispatchPlan(
  ctx: ControllerContext,
  screen: ScreenLike,
  values: Values,
  step: ActStep,
  random: RandomSource | null | undefined,
  markToken?: symbol,
) {
  if (markToken) {
    if (!ctx.mounted.has(step.address)) return { ok: false as const, code: "not_mounted" as const, at: 0 };
    return planHostAct(screen, ctx.defs, values, step, ctx.privateMarks, markToken, ctx.options.deviceData);
  }
  return planAct(
    screen,
    ctx.defs,
    values,
    [{ ...step, address: `${screen.id}/${step.address}` }],
    random,
    ctx.standalone ? "planner" : "controller",
    ctx.options.deviceData,
    ctx.now(),
    ctx.touchNow,
  );
}
