import { resolveTextKeypad, type KeypadEdit } from "../../../../catalog";
import { actionFailure } from "../../actions";
import type { ControllerContext } from "../context";
import type { createAct } from "../dispatch";
import { offersAt } from "../offers";
import { trackPrivateOperations, type PrivateResult } from "./operations";
import { offered, partAddress, partSpec, privateProfile, type Operation } from "./target";

export type { PrivateResult, PrivateStatus } from "./operations";
type HostResult = PrivateResult | Promise<PrivateResult>;
/** Trusted bindings keyed by full, canonical part address (item and component roots omit `/root`). */
export type PrivateValuesHost = {
  copy?: Readonly<Record<string, () => HostResult>>;
  verify?: Readonly<Record<string, (candidate: string) => HostResult>>;
};

type Act = ReturnType<typeof createAct>;

function bindingAt<T>(
  ctx: ControllerContext,
  address: string,
  table: Readonly<Record<string, T>> | undefined,
) {
  const full = `${ctx.screen.id}/${address}`;
  return Object.hasOwn(table ?? {}, full) ? table![full] : undefined;
}

function privateDrafts(ctx: ControllerContext, notify: () => void) {
  const drafts = new Map<string, { value: string; host: PrivateValuesHost }>();
  const valid = (address: string) => offered(ctx, address, "input");
  const read = (address: string) => {
    const draft = drafts.get(address);
    return draft?.host === ctx.options.privateValues ? draft?.value : undefined;
  };
  const remove = (address: string) => {
    if (drafts.delete(address)) notify();
  };
  return {
    read,
    valid,
    remove,
    clear: () => drafts.clear(),
    reconcile() {
      for (const address of drafts.keys()) if (!read(address) || !valid(address)) remove(address);
    },
    length(address: string) {
      return privateProfile(ctx, address) ? [...(read(address) ?? "")].length : undefined;
    },
    edit(address: string, edit: KeypadEdit) {
      const profile = privateProfile(ctx, address);
      if (!profile) return false;
      const host = ctx.options.privateValues;
      if (!host || !valid(address) || typeof edit === "string") return true;
      const resolved = resolveTextKeypad(edit, read(address), profile);
      if (!("code" in resolved)) {
        if (resolved.value) drafts.set(address, { value: resolved.value, host });
        else drafts.delete(address);
        notify();
      }
      return true;
    },
  };
}

type Drafts = ReturnType<typeof privateDrafts>;
type Operations = ReturnType<typeof trackPrivateOperations>;

function runCopy(ctx: ControllerContext, address: string, ops: Operations) {
  const host = ctx.options.privateValues;
  const binding = bindingAt(ctx, address, host?.copy);
  const authenticate = ctx.options.authenticateReveal;
  if (!binding || !authenticate) return;
  const current = () =>
    binding === bindingAt(ctx, address, ctx.options.privateValues?.copy) &&
    host === ctx.options.privateValues &&
    authenticate === ctx.options.authenticateReveal &&
    offered(ctx, address, "copy");
  ops.start(address, "copy", current, async (valid) => {
    const result = await authenticate({
      address: `${ctx.screen.id}/${address}`,
      tier: "ok",
      action: "copy",
    });
    if (!valid() || result !== "approved") return result;
    return binding();
  });
}

function runVerify(
  ctx: ControllerContext,
  address: string,
  dryRun: boolean,
  ops: Operations,
  drafts: Drafts,
) {
  if (ops.status(address, "verify") === "pending")
    return actionFailure(0, "not_actionable", "Private verification is pending");
  const { id, part, spec } = partSpec(ctx, address);
  const source = spec?.privateVerify?.[part];
  const input = source && partAddress(id, source);
  const host = ctx.options.privateValues;
  const check = bindingAt(ctx, address, host?.verify);
  const candidate = input && drafts.read(input);
  if (!input || !check || !candidate || !drafts.valid(input))
    return actionFailure(0, "not_actionable", "Private input is unavailable");
  if (!dryRun)
    ops.start(
      address,
      "verify",
      () =>
        host === ctx.options.privateValues &&
        check === bindingAt(ctx, address, ctx.options.privateValues?.verify) &&
        offered(ctx, address, "verify") &&
        drafts.valid(input),
      (valid) => {
        drafts.remove(input);
        return valid() ? check(candidate) : "unavailable";
      },
      input,
    );
}

function ready(ctx: ControllerContext, address: string, kind: Operation) {
  const host = ctx.options.privateValues;
  return kind === "copy"
    ? Boolean(ctx.options.authenticateReveal && bindingAt(ctx, address, host?.copy))
    : Boolean(bindingAt(ctx, address, host?.verify));
}

function privateDispatch(ctx: ControllerContext, act: Act, ops: Operations, drafts: Drafts): Act {
  return (steps, opts, markToken) => {
    const list = Array.isArray(steps) ? steps : [steps];
    const step = list.length === 1 && list[0];
    if (!step || markToken !== undefined || opts?.agent) return act(steps, opts, markToken);
    const address = ctx.relative(step.address);
    const kind = step.action === "copy" ? "copy" : step.action === "press" ? "verify" : undefined;
    if (!kind || !offered(ctx, address, kind)) return act(steps, opts, markToken);
    if (step.value !== undefined || step.recordTarget !== undefined)
      return actionFailure(0, "invalid_value", "This control does not take a value");
    if (!ready(ctx, address, kind))
      return actionFailure(0, "not_actionable", "Private control is unavailable");
    if (kind === "verify") {
      const failure = runVerify(ctx, address, Boolean(opts?.dryRun), ops, drafts);
      if (failure) return failure;
    } else if (!opts?.dryRun) runCopy(ctx, address, ops);
    return { ok: true, screen: ctx.screen.id, changed: "", dryRun: Boolean(opts?.dryRun) };
  };
}

export function createPrivateValues(ctx: ControllerContext) {
  const ops = trackPrivateOperations();
  const drafts = privateDrafts(ctx, ops.notify);
  const reconcile = () => {
    drafts.reconcile();
    ops.reconcile();
  };
  const hasControls = ctx.screen.components.some(({ c }) => {
    const spec = ctx.defs[c]?.meta.actions;
    return spec?.privateInput || spec?.privateVerify || spec?.authenticatedCopy;
  });
  let unsubscribe: (() => void) | undefined;
  if (hasControls)
    ops.subscribe(() => {
      if (!ctx.status.disposed) unsubscribe ??= ctx.store.subscribe(reconcile);
    });
  return {
    dispatch: (act: Act) => (hasControls ? privateDispatch(ctx, act, ops, drafts) : act),
    revoke(address: string) {
      drafts.remove(address);
      ops.revoke(address);
    },
    reconcile,
    clear() {
      drafts.clear();
      ops.clear();
    },
    dispose: () => unsubscribe?.(),
    view: {
      subscribePrivateValues: ops.subscribe,
      isPrivateVerification(full: string) {
        return (
          hasControls && offersAt(ctx, full, false, true).some(({ hostSecret }) => hostSecret === "verify")
        );
      },
      privateStatus(full: string, kind: Operation) {
        const address = ctx.relative(full);
        return ready(ctx, address, kind) ? ops.status(address, kind) : "unavailable";
      },
      privateKeypadLength(full: string) {
        return drafts.length(ctx.relative(full));
      },
      privateKeypadEdit(full: string, edit: KeypadEdit) {
        return drafts.edit(ctx.relative(full), edit);
      },
    },
  };
}
