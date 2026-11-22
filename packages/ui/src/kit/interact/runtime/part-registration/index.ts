import type { ControllerContext } from "../index";

export function registerEntry<T>(
  parts: Map<string, T>,
  local: string,
  registration: T,
  refresh: () => void,
  revoke?: (address: string) => void,
) {
  const existed = parts.has(local);
  if (existed) revoke?.(local);
  parts.set(local, registration);
  if (!existed) refresh();
  return () => {
    if (parts.get(local) !== registration) return;
    parts.delete(local);
    revoke?.(local);
    refresh();
  };
}

export function registerPart(
  parts: Map<string, symbol>,
  local: string,
  revoke?: (address: string) => void,
  refresh = () => {},
) {
  return registerEntry(parts, local, Symbol(local), refresh, revoke);
}

export function driveRefresh(ctx: ControllerContext) {
  const bound = ctx.screen.components.some(({ c }) => typeof ctx.defs[c]?.meta.drives === "object");
  let pending = false;
  return () => {
    if (!bound || pending || ctx.status.disposed) return;
    pending = true;
    queueMicrotask(() => {
      pending = false;
      if (!ctx.status.disposed) ctx.store.setMany({});
    });
  };
}
