import {
  isNestedTarget,
  planAct,
  sessionEvent,
  sessionKey,
  type ActStep,
  type Values,
} from "../../../../catalog";
import type { ControllerContext, ScreenComponent } from "../index";

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
  if (!session && !nested) return false;
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
