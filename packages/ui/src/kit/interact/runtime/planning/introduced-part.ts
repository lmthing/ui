import {
  isNestedTarget,
  planAct,
  sessionEvent,
  sessionKey,
  stageReportEdit,
  type ActStep,
  type RandomSource,
  type ScreenLike,
  type Values,
} from "../../../../catalog";
import type { ControllerContext, ScreenComponent } from "../index";
import { deliverSend, type ActionContext } from "../../actions";

export function confirmReport(ctx: ControllerContext, screen: ScreenLike, values: Values, step: ActStep) {
  return stageReportEdit(
    screen,
    ctx.defs,
    values,
    step,
    { kind: "confirm", now: ctx.now() },
    ctx.options.deviceData,
  );
}

export function dispatchPlan(
  ctx: ControllerContext,
  screen: ScreenLike,
  values: Values,
  step: ActStep,
  random: RandomSource | null | undefined,
) {
  return planAct(
    screen,
    ctx.defs,
    values,
    [{ ...step, address: `${screen.id}/${step.address}` }],
    random,
    ctx.standalone ? "planner" : "controller",
    ctx.options.deviceData,
  );
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
    (meta.live?.derive || meta.linkedEdits || meta.items?.visibleWhen || meta.items?.edits || meta.signOff) &&
    Object.keys(staged.values).some((key) => key.startsWith(prefix) && staged.values[key] !== initial[key]);
  if (!session && !nested && !gated) return false;
  const sheet = ctx.status.openSheet;
  const source = ctx.liveScreen(initial, sheet, Boolean(sheet));
  const plan = dispatchPlan(ctx, source, initial, action, null);
  return !plan.ok && (Boolean(session) || plan.code === "not_actionable");
}
