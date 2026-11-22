import type { ControllerContext } from "../context";
import { offersAt } from "../offers";

export type Operation = "copy" | "verify";
export const partAddress = (id: string, part: string) => (part === "root" ? id : `${id}/${part}`);

export function partSpec(ctx: ControllerContext, address: string) {
  const [id, ...parts] = address.split("/");
  const entry = ctx.sourceOf(id!);
  const spec = entry && ctx.defs[entry.c]?.meta.actions;
  return { id: id!, part: parts.join("/") || "root", spec };
}

export function privateProfile(ctx: ControllerContext, address: string) {
  const { part, spec } = partSpec(ctx, address);
  return Object.hasOwn(spec?.privateInput ?? {}, part) ? spec!.privateInput![part] : undefined;
}

export function offered(ctx: ControllerContext, address: string, kind: Operation | "input") {
  return (
    ctx.options.interactive !== false &&
    (!ctx.options.requireMounted || ctx.mounted.has(address)) &&
    offersAt(ctx, address).some(({ hostSecret }) => hostSecret === kind)
  );
}
