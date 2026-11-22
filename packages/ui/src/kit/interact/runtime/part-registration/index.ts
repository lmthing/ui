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

export function createDisabledParts() {
  const parts = new Map<string, number>();
  const listeners = new Set<() => void>();
  const changed = () => listeners.forEach((listener) => listener());
  return {
    parts,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    register(local: string) {
      const previous = parts.get(local) ?? 0;
      parts.set(local, previous + 1);
      if (!previous) changed();
      let registered = true;
      return () => {
        if (!registered) return;
        registered = false;
        const count = parts.get(local)!;
        if (count > 1) parts.set(local, count - 1);
        else {
          parts.delete(local);
          changed();
        }
      };
    },
  };
}
