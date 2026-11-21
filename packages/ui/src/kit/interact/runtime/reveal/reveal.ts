import { actionFailure } from "../../actions";
import { offersReveal } from "../access";
import type { ControllerContext } from "../context";
import type { createAct } from "../dispatch";

type AuthResult = "approved" | "denied" | "unavailable";
export type AuthenticateReveal = (request: { address: string; tier: "ok" }) => Promise<AuthResult>;
type RevealStatus = "masked" | "pending" | "revealed" | "denied" | "unavailable";
type Attempt = {
  authenticate: AuthenticateReveal;
  status: RevealStatus;
  expires?: number;
  timer?: ReturnType<typeof setTimeout>;
};
type Act = ReturnType<typeof createAct>;
const revealMs = 15_000;

function trackAttempts(ctx: ControllerContext, eligible: (address: string) => boolean) {
  const attempts = new Map<string, Attempt>();
  const listeners = new Set<() => void>();
  let unsubscribe: (() => void) | undefined;
  const notify = () => listeners.forEach((listener) => listener());
  const valid = (address: string, attempt: Attempt) =>
    attempt.authenticate === ctx.options.authenticateReveal && eligible(address);
  function revoke(address: string) {
    const attempt = attempts.get(address);
    if (!attempt) return;
    clearTimeout(attempt.timer);
    attempts.delete(address);
    if (!attempts.size) {
      unsubscribe?.();
      unsubscribe = undefined;
    }
    notify();
  }
  function reconcile() {
    for (const [address, attempt] of attempts) if (!valid(address, attempt)) revoke(address);
  }
  function settle(address: string, attempt: Attempt, result: AuthResult) {
    if (attempts.get(address) !== attempt) return;
    if (!valid(address, attempt)) return revoke(address);
    attempt.status = result === "approved" ? "revealed" : result === "denied" ? "denied" : "unavailable";
    if (attempt.status === "revealed") {
      attempt.expires = ctx.now() + revealMs;
      attempt.timer = setTimeout(() => revoke(address), revealMs);
    }
    notify();
  }
  async function authorize(address: string, attempt: Attempt) {
    let result: AuthResult;
    try {
      result = await attempt.authenticate({ address: `${ctx.screen.id}/${address}`, tier: "ok" });
    } catch {
      result = "unavailable";
    }
    settle(address, attempt, result);
  }
  function request(address: string, authenticate: AuthenticateReveal) {
    const current = attempts.get(address);
    if (current?.authenticate === authenticate) {
      if (current.status === "pending") return;
      if (current.status === "revealed" && ctx.now() < current.expires!) return revoke(address);
    }
    revoke(address);
    const attempt: Attempt = { status: "pending", authenticate };
    attempts.set(address, attempt);
    unsubscribe ??= ctx.store.subscribe(reconcile);
    notify();
    void authorize(address, attempt);
  }
  function status(address: string): RevealStatus {
    const attempt = attempts.get(address);
    if (!attempt || !valid(address, attempt)) return "masked";
    return attempt.expires !== undefined && ctx.now() >= attempt.expires ? "masked" : attempt.status;
  }
  return { request, revoke, reconcile, status, attempts, listeners };
}

/** Grants are view-local. Neither authenticator results nor grants enter the interaction store. */
export function createReveal(ctx: ControllerContext) {
  const { requireMounted, interactive } = ctx.options;
  const eligible = (address: string) =>
    interactive !== false && (!requireMounted || ctx.mounted.has(address)) && offersReveal(ctx, address);
  const { request, revoke, reconcile, status, attempts, listeners } = trackAttempts(ctx, eligible);
  const isRevealControl = (address: string) => {
    const entry = ctx.sourceOf(ctx.relative(address).split("/")[0]!);
    return Boolean(entry && ctx.defs[entry.c]?.meta.actions?.reveal && offersReveal(ctx, address, true));
  };
  const dispatch =
    (act: Act): Act =>
    (steps, opts, markToken) => {
      if (markToken !== undefined) return act(steps, opts, markToken);
      const list = Array.isArray(steps) ? steps : [steps];
      const index = list.findIndex(({ address, action }) => action === "press" && isRevealControl(address));
      if (index < 0) return act(steps, opts);
      const step = list[index]!;
      const address = ctx.relative(step.address);
      if (opts?.agent || list.length !== 1 || !eligible(address))
        return actionFailure(index, "not_actionable", "Reveal requires a local press");
      if (step.value !== undefined || step.recordTarget !== undefined)
        return actionFailure(index, "invalid_value", "Reveal does not take a value");
      const authenticate = ctx.options.authenticateReveal;
      if (!opts?.dryRun && authenticate) request(address, authenticate);
      return { ok: true, screen: ctx.screen.id, changed: "", dryRun: Boolean(opts?.dryRun) };
    };
  return {
    dispatch,
    revoke,
    reconcile,
    clear: () => {
      for (const address of attempts.keys()) revoke(address);
    },
    view: {
      isRevealControl,
      subscribeReveal(listener: () => void) {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
      revealStatus: (full: string): RevealStatus =>
        ctx.options.authenticateReveal ? status(ctx.relative(full)) : "unavailable",
    },
  };
}
