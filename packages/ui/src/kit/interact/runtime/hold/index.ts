import type { ActStep } from "../../../../catalog";
import { actionFailure } from "../../actions";
import type { ControllerContext, createAct } from "../index";

export function holdFailure(
  ctx: ControllerContext,
  local: string,
  action: ActStep["action"],
  at: number,
  approval?: symbol,
) {
  const hold = action === "press" && ctx.hold.parts.get(local);
  if (hold && hold !== approval) return actionFailure(at, "hold_required", "Hold the button on the screen");
}

export function registerHoldPart(ctx: ControllerContext, act: ReturnType<typeof createAct>, address: string) {
  const local = ctx.relative(address);
  const token = Symbol(local);
  ctx.hold.parts.set(local, token);
  const registered = () => ctx.hold.parts.get(local) === token;
  return {
    complete: () => {
      if (registered()) return act({ address, action: "press" }, undefined, undefined, token);
    },
    unregister: () => {
      if (registered()) ctx.hold.parts.delete(local);
    },
  };
}
