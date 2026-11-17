// What people and agents change on a screen (toggles, ticks, typed text), keyed by full address.

export type InteractionStore = {
  get(address: string): unknown;
  set(address: string, value: unknown): void;
  setMany(values: Record<string, unknown>): void;
  reset(screen?: string): void;
  snapshot(screen?: string): Record<string, unknown>;
  subscribe(listener: () => void): () => void;
};

export function createInteractionStore(initial: Record<string, unknown> = {}): InteractionStore {
  let values: Record<string, unknown> = { ...initial };
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());
  const inScreen = (screen?: string) => (address: string) => !screen || address.startsWith(`${screen}/`);
  return {
    get: (address) => values[address],
    set: (address, value) => {
      values = { ...values, [address]: value };
      notify();
    },
    setMany: (next) => {
      values = { ...values, ...next };
      notify();
    },
    reset: (screen) => {
      values = Object.fromEntries(Object.entries(values).filter(([address]) => !inScreen(screen)(address)));
      notify();
    },
    snapshot: (screen) =>
      Object.fromEntries(Object.entries(values).filter(([address]) => inScreen(screen)(address))),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
