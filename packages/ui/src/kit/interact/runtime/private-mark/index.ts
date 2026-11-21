import { registerPrivateMark } from "../../../../catalog/agent/action-input";
import type { ControllerContext } from "../context";
import type { createAct } from "../dispatch";
export { PrivateMarkContext, type PrivateMarkAdapter, type PrivateMarkSurfaceProps } from "./adapter";
export { createPrivateMarks } from "../../../../catalog/agent/action-input";

export function privateMarkRegistration(ctx: ControllerContext, act: ReturnType<typeof createAct>) {
  return (address: string, accepts?: (reference: string) => boolean) => {
    const local = ctx.relative(address);
    return registerPrivateMark(ctx.privateMarks, local, accepts, (value, token) => {
      act({ address: local, action: "set", value }, undefined, token);
    });
  };
}
