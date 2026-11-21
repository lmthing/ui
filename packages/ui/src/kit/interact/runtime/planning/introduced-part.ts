import {
  drawRole,
  isNestedTarget,
  planAct,
  privateMarkKey,
  reportConfirmation,
  sessionEvent,
  sessionKey,
  stageReportEdit,
  type ActStep,
  type RandomSource,
  type ReportRemoval,
  type ScreenLike,
  type Values,
} from "../../../../catalog";
import { planHostAct } from "../../../../catalog/agent/action-input";
import type { ControllerContext, ScreenComponent } from "../index";
import { deliverSend, type ActionContext } from "../../actions";

export function drivenPartBlock(ctx: ControllerContext, address: string) {
  if (ctx.privateMarks.has(address) || ctx.store.get(privateMarkKey(ctx.screen.id, address)))
    return { code: "not_actionable", hint: "Private control" };
  if (ctx.disabledParts.has(address)) return { code: "disabled", hint: "This control is disabled" };
  if (ctx.options.requireMounted && !ctx.mounted.has(address))
    return { code: "not_mounted", hint: "This control is not mounted" };
}

export function confirmReport(
  ctx: ControllerContext,
  screen: ScreenLike,
  values: Values,
  step: ActStep,
  removal: ReportRemoval | undefined,
) {
  return stageReportEdit(
    screen,
    ctx.defs,
    values,
    step,
    { kind: "confirm", now: ctx.now(), removal },
    ctx.options.deviceData,
  );
}

export function needsConfirmation(ctx: ControllerContext, { entry, selected }: ActionContext) {
  if (!ctx.standalone) return true;
  const meta = ctx.defs[entry.c]!.meta;
  const { successActions, errorActions, live } = meta;
  const part = selected.address.split("/").slice(1).join("/") || "root";
  if (meta.draw?.kind === "deck" && drawRole(meta, part, selected.action) === "reset") return true;
  if (reportConfirmation(meta, part, selected.action)) return true;
  if (successActions?.length || errorActions?.length || live?.derive || meta.linkedEdits) return true;
  return Boolean(sessionEvent(meta, part, selected.action));
}

export function isDraw({ entry, defs, selected }: ActionContext) {
  const target = selected.address.split("/").slice(1).join("/") || "root";
  const role = drawRole(defs[entry.c]!.meta, target, selected.action);
  return role === "draw" || role === "redraw";
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

/** The planner has staged the mark already; don't send its canonical address through other controls. */
export function hostCaptureEffects({ selected, screen, options }: ActionContext) {
  return [() => options.onAction?.({ ...selected, address: `${screen.id}/${selected.address}` })];
}

export function standaloneEffects({ links, send, options }: ActionContext) {
  const effects = links.map(
    ({ goto, address }) =>
      () =>
        options.onLink?.(goto, address),
  );
  if (send) effects.push(() => deliverSend(send, options.onSend));
  return effects;
}

export function inactive(ctx: ControllerContext, entry: ScreenComponent) {
  if (ctx.standalone || !entry.state || entry.state === "filled") return false;
  const { draw, emptyActions, errorActions, session, successActions } = ctx.defs[entry.c]!.meta;
  return !draw && !emptyActions?.length && !errorActions?.length && !session && !successActions?.length;
}

/** Check whether an earlier step introduced the part before the view could update. */
export function introducedPart(
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
      meta.select?.runtime ||
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
