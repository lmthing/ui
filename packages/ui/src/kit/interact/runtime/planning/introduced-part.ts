import {
  isNestedTarget,
  planAct,
  sessionEvent,
  sessionKey,
  type ActStep,
  type Values,
} from "../../../../catalog";
import type { ControllerContext, ScreenComponent } from "../index";
import type { ActionContext } from "../../actions";

export function standaloneEffects({ links, send, options }: ActionContext) {
  const effects = links.map(
    ({ goto, address }) =>
      () =>
        options.onLink?.(goto, address),
  );
  if (send) effects.push(() => options.onSend?.(send.text, send.address));
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
    (meta.live?.derive || meta.items?.visibleWhen) &&
    Object.keys(staged.values).some((key) => key.startsWith(prefix) && staged.values[key] !== initial[key]);
  if (!session && !nested && !gated) return false;
  const sheet = ctx.status.openSheet;
  const source = ctx.liveScreen(initial, sheet, Boolean(sheet));
  const plan = planAct(
    source,
    ctx.defs,
    initial,
    [{ ...action, address: `${source.id}/${action.address}` }],
    null,
  );
  return !plan.ok && (Boolean(session) || plan.code === "not_actionable");
}
