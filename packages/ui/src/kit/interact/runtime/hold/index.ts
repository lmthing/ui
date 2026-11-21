import type { ControllerContext, createAct } from "../index";

export function registerHoldPart(ctx: ControllerContext, act: ReturnType<typeof createAct>, address: string) {
  const local = ctx.relative(address);
  const token = Symbol(local);
  ctx.hold.parts.set(local, token);
  const registered = () => ctx.hold.parts.get(local) === token;
  return {
    complete: () => {
      if (registered()) return act({ address, action: "press" }, {}, token);
    },
    unregister: () => {
      if (registered()) ctx.hold.parts.delete(local);
    },
  };
}
