import { actionFailure } from "../../actions";
import type { ControllerContext } from "../context";
import type { createAct } from "../dispatch";
import { offersAt } from "../offers";

/** Raise brightness for the lifetime of the signal. On abort, restore the previous level. */
export type ScannerBrightnessAdapter = (request: {
  address: string;
  tier: "ok";
  signal: AbortSignal;
}) => boolean | Promise<boolean>;

type Status = "off" | "pending" | "on" | "failed";
type Lease = {
  address: string;
  adapter: ScannerBrightnessAdapter;
  abort: AbortController;
  status: Status;
};
type Act = ReturnType<typeof createAct>;

function scannerAt(ctx: ControllerContext, address: string) {
  const [id, part, subpart] = address.split("/");
  const entry = ctx.sourceOf(id!);
  return (
    !!entry &&
    !subpart &&
    ctx.defs[entry.c]?.meta.actions?.scannerBrightness?.includes(part ?? "root") === true
  );
}

function trackBrightness(ctx: ControllerContext, eligible: (address: string) => boolean) {
  let lease: Lease | undefined;
  let unsubscribe: (() => void) | undefined;
  const current = (value: Lease) =>
    value.adapter === ctx.options.hostCommands?.scannerBrightness && eligible(value.address);
  const notify = () => ctx.store.setMany({});
  function clear() {
    const previous = lease;
    if (!previous) return;
    lease = undefined;
    unsubscribe?.();
    unsubscribe = undefined;
    previous.abort.abort();
    notify();
  }
  function reconcile() {
    if (lease && !current(lease)) clear();
  }
  function toggle(address: string, adapter: ScannerBrightnessAdapter) {
    const close = lease?.address === address && lease.adapter === adapter && lease.status !== "failed";
    clear();
    if (close || !eligible(address)) return;
    const next = { address, adapter, abort: new AbortController(), status: "pending" } satisfies Lease;
    lease = next;
    unsubscribe = ctx.store.subscribe(reconcile);
    const settle = (accepted: boolean) => {
      if (lease !== next) return;
      if (!current(next)) return clear();
      lease.status = accepted === true ? "on" : "failed";
      if (accepted !== true) next.abort.abort();
      notify();
    };
    try {
      const result = adapter({
        address: `${ctx.screen.id}/${address}`,
        tier: "ok",
        signal: next.abort.signal,
      });
      if (typeof result === "boolean") settle(result);
      else {
        notify();
        void Promise.resolve(result).then(settle, () => settle(false));
      }
    } catch {
      settle(false);
    }
  }
  return {
    clear,
    reconcile,
    toggle,
    revoke: (address: string) => {
      if (lease?.address === address) clear();
    },
    status: (address: string): Status =>
      lease?.address === address && current(lease) ? lease.status : "off",
  };
}

export function createScannerBrightness(ctx: ControllerContext) {
  const eligible = (address: string) =>
    !ctx.status.disposed &&
    ctx.admitted() &&
    ctx.options.interactive !== false &&
    (!ctx.options.requireMounted || ctx.mounted.has(address)) &&
    offersAt(ctx, address).some(({ hostSecret }) => hostSecret === "brightness");
  const brightness = trackBrightness(ctx, eligible);
  const dispatch =
    (act: Act): Act =>
    (steps, options, markToken, approval) => {
      const list = Array.isArray(steps) ? steps : [steps];
      const at = list.findIndex(
        ({ address, action }) => action === "toggle" && scannerAt(ctx, ctx.relative(address)),
      );
      if (markToken || at < 0) return act(steps, options, markToken, approval);
      const step = list[at]!;
      const address = ctx.relative(step.address);
      const adapter = ctx.options.hostCommands?.scannerBrightness;
      if (options?.agent || list.length !== 1 || !adapter || !eligible(address))
        return actionFailure(
          at,
          "not_actionable",
          "Scanner brightness requires a local press and host support",
        );
      if (step.value !== undefined || step.recordTarget !== undefined)
        return actionFailure(at, "invalid_value", "Scanner brightness does not take a value");
      if (!options?.dryRun) brightness.toggle(address, adapter);
      return { ok: true, screen: ctx.screen.id, changed: "", dryRun: Boolean(options?.dryRun) };
    };
  return {
    ...brightness,
    dispatch,
    view: {
      scannerBrightnessAvailable: () => !!ctx.options.hostCommands?.scannerBrightness,
      scannerBrightnessStatus: (full: string) => brightness.status(ctx.relative(full)),
    },
  };
}
