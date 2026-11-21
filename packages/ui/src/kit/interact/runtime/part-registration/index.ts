export function registerPart(parts: Map<string, symbol>, local: string) {
  const token = Symbol(local);
  parts.set(local, token);
  return () => {
    if (parts.get(local) === token) parts.delete(local);
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
