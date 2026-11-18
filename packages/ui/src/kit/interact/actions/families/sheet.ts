import { confirmLabel, type ActStep } from "../../../../catalog";
import { rejected, type ActionContext, type ActionResult, type ActionState } from "../index";
export function showConfirmation(state: ActionState, action: ActStep, ctx: ActionContext): ActionResult {
  const { input, entry, key } = ctx;
  const source = action.address === entry.id ? key(entry.id, "root") : `${ctx.screen.id}/${action.address}`;
  const kind = ["primary", "secondary", "quiet", "danger"].includes(String(input.kind))
    ? (input.kind as NonNullable<ActionState["confirmation"]>["kind"])
    : "danger";
  return {
    state: {
      ...state,
      confirmation: {
        message: String(input.confirm ?? confirmLabel),
        kind,
        source,
        ...(input.goto ? { goto: String(input.goto) } : {}),
        step: { ...action, address: source },
      },
    },
    effects: [],
  };
}
export function confirmationAction(
  state: ActionState,
  action: ActStep,
  ctx: Pick<ActionContext, "screen" | "at" | "options">,
  resume?: (state: ActionState, step: ActStep) => ActionResult,
): ActionResult {
  const accepting = action.address === "confirm/confirm" && action.action === "press";
  const cancelling = action.address === "confirm/cancel" && action.action === "dismiss";
  if (!accepting && !cancelling)
    return rejected(state, ctx.at, "not_actionable", "Answer the confirmation first");
  if (action.value !== undefined)
    return rejected(state, ctx.at, "invalid_value", "Confirmation takes no value");
  const pending = state.confirmation!;
  if (accepting && pending.step && resume)
    return resume(
      {
        ...state,
        confirmation: undefined,
        changes: [...state.changes, `${action.address} ${action.action}`],
      },
      pending.step,
    );
  let sheet = state.sheet;
  const effects: (() => void)[] = [];
  if (accepting) {
    if (pending.goto === "sheet") {
      const sheets = ctx.screen.components.filter((entry) => entry.c === "Sheet");
      if (sheets.length !== 1)
        return rejected(
          state,
          ctx.at,
          "not_actionable",
          "A sheet link needs exactly one sheet on this screen",
        );
      sheet = sheets[0]!.id;
    }
    effects.push(() => {
      if (pending.goto && pending.goto !== "sheet") ctx.options.onLink?.(pending.goto, pending.source);
      ctx.options.onAction?.({ address: pending.source, action: "press" });
    });
  }
  return {
    state: {
      ...state,
      sheet,
      confirmation: undefined,
      changes: [...state.changes, `${action.address} ${action.action}`],
    },
    effects,
  };
}
