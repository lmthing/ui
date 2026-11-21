/** Proof enters only through a trusted host control, not through catalog props or ActStep. */
export type ParentGateProof = { kind: "hold" } | { kind: "math"; answer: string };
type Attempt = { address: string; destination: string; proof: ParentGateProof };
export type ParentGate = {
  allows(destination: string): boolean;
  submit(attempt: Attempt): boolean;
  subscribe(listener: () => void): () => void;
};
type Options = {
  destinations: readonly string[];
  ttlMs: number;
  now?: () => number;
  /** Verify an authorized source and its completed hold or math challenge. */
  verify(attempt: Attempt): boolean;
};

/** An expiring destination grant, not verification of the person's identity. */
export function createParentGate({ destinations, ttlMs, now = Date.now, verify }: Options) {
  const restricted = new Set(destinations);
  const grants = new Map<string, number>();
  const listeners = new Set<() => void>();
  let wake: ReturnType<typeof setTimeout> | undefined;
  const notify = () => listeners.forEach((listener) => listener());
  const allows = (destination: string) =>
    !restricted.has(destination) || (grants.get(destination) ?? -Infinity) > now();
  function schedule() {
    if (wake !== undefined) clearTimeout(wake);
    wake = undefined;
    if (!listeners.size || !grants.size) return;
    const time = now();
    const next = Math.min(...grants.values());
    wake = setTimeout(
      () => {
        let expired = false;
        for (const [destination, at] of grants) {
          if (at > now()) continue;
          grants.delete(destination);
          expired = true;
        }
        schedule();
        if (expired) notify();
      },
      Math.min(Math.max(0, next - time), 2 ** 31 - 1),
    );
  }
  const gate: ParentGate & { revoke(destination: string): void } = {
    allows,
    submit(attempt) {
      if (!restricted.has(attempt.destination)) return false;
      if (!Number.isFinite(ttlMs) || ttlMs <= 0 || !validProof(attempt, verify)) return false;
      const until = now() + ttlMs;
      if (!Number.isFinite(until)) return false;
      grants.set(attempt.destination, until);
      schedule();
      notify();
      return true;
    },
    revoke(destination) {
      if (!grants.delete(destination)) return;
      schedule();
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      schedule();
      return () => {
        listeners.delete(listener);
        schedule();
      };
    },
  };
  return gate;
}

function validProof(attempt: Attempt, verify: Options["verify"]) {
  const { proof } = attempt;
  if (
    proof.kind !== "hold" &&
    (proof.kind !== "math" || typeof proof.answer !== "string" || proof.answer.length > 128)
  )
    return false;
  try {
    return verify(attempt) === true;
  } catch {
    return false;
  }
}

export function allowsDestination(gate: ParentGate | undefined, destination: string) {
  if (!gate) return true;
  try {
    return gate.allows(destination) === true;
  } catch {
    return false;
  }
}
