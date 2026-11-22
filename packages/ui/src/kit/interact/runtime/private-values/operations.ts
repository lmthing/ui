export type PrivateResult = "approved" | "denied" | "unavailable";
export type PrivateStatus = "idle" | "pending" | PrivateResult;
type Kind = "copy" | "verify";
type Attempt = { current: () => boolean; status: PrivateStatus; input?: string | undefined };
type Effect = (valid: () => boolean) => PrivateResult | Promise<PrivateResult>;

function startOperation(
  map: Map<string, Attempt>,
  address: string,
  current: () => boolean,
  effect: Effect,
  notify: () => void,
  input?: string,
) {
  const before = map.get(address);
  if (before?.status === "pending" && before.current()) return;
  const attempt: Attempt = { current, status: "pending", input };
  map.set(address, attempt);
  const valid = () => map.get(address) === attempt && current();
  const settle = (status: unknown) => {
    if (!valid()) {
      if (map.get(address) === attempt && map.delete(address)) notify();
      return;
    }
    attempt.status = status === "approved" || status === "denied" ? status : "unavailable";
    notify();
  };
  notify();
  if (!valid()) return;
  try {
    void Promise.resolve(effect(valid)).then(settle, () => settle("unavailable"));
  } catch {
    settle("unavailable");
  }
}

/** Only opaque results leave this registry. Replaced or hidden bindings cannot finish an old operation. */
export function trackPrivateOperations() {
  const copies = new Map<string, Attempt>();
  const checks = new Map<string, Attempt>();
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());
  const entries = (kind: Kind) => (kind === "copy" ? copies : checks);
  function remove(map: Map<string, Attempt>, address: string) {
    if (map.delete(address)) notify();
  }
  return {
    notify,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    status(address: string, kind: Kind): PrivateStatus {
      const attempt = entries(kind).get(address);
      return attempt?.current() ? attempt.status : "idle";
    },
    revoke(address: string) {
      remove(copies, address);
      remove(checks, address);
      for (const [part, attempt] of checks) if (attempt.input === address) remove(checks, part);
    },
    reconcile() {
      for (const map of [copies, checks])
        for (const [address, attempt] of map) if (!attempt.current()) remove(map, address);
    },
    clear() {
      copies.clear();
      checks.clear();
      notify();
    },
    start(address: string, kind: Kind, current: () => boolean, effect: Effect, input?: string) {
      startOperation(entries(kind), address, current, effect, notify, input);
    },
  };
}
