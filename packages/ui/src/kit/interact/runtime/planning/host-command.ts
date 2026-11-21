import type { HostIntent } from "../../../../catalog";
import {
  actionFailure,
  confirmationFor,
  showConfirmation,
  type ActionResult,
  type ActionState,
} from "../../actions";
import type { ControllerContext } from "../index";
import { bindCommandConfirmation, commandForConfirmation } from "../host";
import type { PreparedAction } from "./prepare-step";

export function runHostCommand(
  ctx: ControllerContext,
  before: ActionState,
  { state: planned, context }: PreparedAction,
  intent: HostIntent,
  source: { agent: boolean; single: boolean },
  confirmed?: ActionState["confirmation"],
): ActionResult {
  const { at, selected: step } = context;
  const { request } = intent;
  const normal = !confirmed ? confirmationFor(before, step, context) : undefined;
  if (!confirmed && (request.kind === "external" || normal)) {
    if (request.kind === "external" && !ctx.mounted.has(step.address))
      return {
        state: before,
        effects: [],
        error: actionFailure(at, "not_mounted", "This control is not mounted"),
      };
    const result = normal ?? showConfirmation(before, step, context);
    if (result.error) return result;
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
