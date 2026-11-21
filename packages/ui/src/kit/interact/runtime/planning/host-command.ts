import type { ActStep, HostIntent } from "../../../../catalog";
import {
  actionFailure,
  showConfirmation,
  type ActionContext,
  type ActionResult,
  type ActionState,
} from "../../actions";
import type { ControllerContext } from "../index";
import { bindCommandConfirmation, commandForConfirmation } from "../host";

export function runHostCommand(
  ctx: ControllerContext,
  before: ActionState,
  planned: ActionState,
  context: ActionContext,
  step: ActStep,
  intent: HostIntent,
  source: { agent: boolean; single: boolean },
  confirmed?: ActionState["confirmation"],
): ActionResult {
  const { entry, defs, at } = context;
  const { request } = intent;
  const meta = defs[entry.c]!.meta;
  const part =
    step.address === entry.id || step.address === `${entry.id}/${intent.subject.row}`
      ? "root"
      : step.address.split("/").at(-1)!;
  if (!confirmed && (request.kind === "external" || meta.confirmParts?.includes(part))) {
    if (request.kind === "external" && !ctx.mounted.has(step.address))
      return {
        state: before,
        effects: [],
        error: actionFailure(at, "not_mounted", "This control is not mounted"),
      };
    const result = showConfirmation(before, step, context);
    const pending = result.state.confirmation!;
    pending.host = true;
    bindCommandConfirmation(pending, intent);
    delete pending.goto;
    return result;
  }
  if (confirmed && JSON.stringify(commandForConfirmation(confirmed)) !== JSON.stringify(intent))
    return failed(before, at, "The host command changed");
  if (request.kind === "external" && (source.agent || !source.single || !ctx.mounted.has("confirm/confirm")))
    return failed(before, at, "Confirm the handoff in person");
  const effect = ctx.hosts.stage(planned.values, intent, source.agent ? "agent" : "human");
  return { state: planned, effects: [effect] };
}

function failed(state: ActionState, at: number, hint: string): ActionResult {
  return { state, effects: [], error: actionFailure(at, "not_actionable", hint) };
}
