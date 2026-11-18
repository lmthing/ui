import type { ActStep } from "../../../../catalog";
import { rejected, type ActionContext, type ActionResult, type ActionState } from "../index";
export function navigationAction(state: ActionState, action: ActStep, ctx: ActionContext): ActionResult {
  let sheet = state.sheet;
  const effects: (() => void)[] = [];
  if (ctx.entry.c === "Sheet" && ["dismiss", "press"].includes(action.action)) sheet = undefined;
  for (const link of ctx.links) {
    if (link.goto === "sheet") {
      const sheets = ctx.screen.components.filter((component) => component.c === "Sheet");
      if (sheets.length !== 1)
        return rejected(
          state,
          ctx.at,
          "not_actionable",
          "A sheet link needs exactly one sheet on this screen",
        );
      sheet = sheets[0]!.id;
    } else effects.push(() => ctx.options.onLink?.(link.goto, link.address));
  }
  effects.push(() => ctx.options.onAction?.({ ...action, address: `${ctx.screen.id}/${action.address}` }));
  return { state: { ...state, sheet }, effects };
}
