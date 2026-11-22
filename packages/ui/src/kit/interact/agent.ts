import {
  planAct,
  hasReportConfirmation,
  parseAppCurrency,
  type ActStep,
  type AppCurrency,
  type Definition,
  type DeviceData,
  type RandomSource,
  type ScreenLike,
} from "../../catalog";
import { createStandaloneAccess, readControls, type Confirmation } from "./runtime";
import { deliverSend, type SendHandler } from "./actions";
import type { ClipboardText, ClipboardWriter } from "./clipboard";
import type { InteractionStore } from "./store";

export type ActOptions = { dryRun?: boolean; agent?: boolean };
export type ActReply =
  | { ok: true; screen: string; changed: string; dryRun: boolean }
  | { ok: false; code: string; at: number; hint?: string };
export type ActLogEntry = { address: string; action: string; value?: unknown; at: number };

type AgentOptions = {
  defs: Record<string, Definition>;
  lang?: string | undefined;
  currency?: AppCurrency | undefined;
  store: InteractionStore;
  random?: RandomSource | undefined;
  touchNow?: (() => number) | undefined;
  deviceData?: DeviceData | undefined;
  current: () => ScreenLike;
  onLink?: (goto: string, address: string) => void;
  onAnchor?: (address: string, action: "focus" | "jump") => void;
  onSend?: SendHandler;
  writeClipboard?: ClipboardWriter;
  resolveClipboardText?: ClipboardText;
  runtime?: { act(steps: ActStep | ActStep[], opts?: ActOptions): ActReply; read(): string; reset(): void };
};

function requiresStandalone(options: AgentOptions, screen: ScreenLike) {
  return screen.components.some(({ c }) => {
    const meta = options.defs[c]?.meta;
    if (!meta) return false;
    return (
      meta.recordRuntime ||
      meta.buzz ||
      meta.draw?.kind === "deck" ||
      meta.items?.reset ||
      hasReportConfirmation(meta) ||
      (meta.confirmParts?.length &&
        (meta.session ||
          meta.successActions?.length ||
          meta.errorActions?.length ||
          meta.live?.derive ||
          meta.linkedEdits))
    );
  });
}

/** Opted-in confirmations and copy work without a mounted phone. */
function standaloneAccess(
  options: AgentOptions,
  screen: ScreenLike,
  currency: AppCurrency | undefined,
  copy = false,
) {
  const pending = options.store.get(`${screen.id}/$confirmation`) as Confirmation | undefined;
  const needsEffects = copy || pending?.step?.action === "copy";
  if (needsEffects || requiresStandalone(options, screen))
    return createStandaloneAccess({ ...options, screen }, currency, needsEffects);
}

function detachedRead(options: AgentOptions, currency: AppCurrency | undefined) {
  const { store, defs, lang, deviceData } = options;
  const screen = options.current();
  return (
    standaloneAccess(options, screen, currency)?.read() ??
    readControls(screen, defs, store.snapshot(screen.id), lang, undefined, deviceData, currency)
  );
}

/** Every step is checked before commit. Dry runs and rejected batches leave the store untouched. */
export function createAgentAccess(options: AgentOptions) {
  const { defs, store, current, onLink } = options;
  const currency = parseAppCurrency(options.currency);
  const log: ActLogEntry[] = [];
  const detached = (screen: ScreenLike, steps: ActStep[]) =>
    standaloneAccess(
      options,
      screen,
      currency,
      steps.some(({ action }) => action === "copy"),
    );
  return {
    read: () => options.runtime?.read() ?? detachedRead(options, currency),
    act(steps: ActStep | ActStep[], opts: ActOptions = {}): ActReply {
      const list = Array.isArray(steps) ? steps : [steps];
      const screen = options.runtime ? undefined : current();
      const runtime = options.runtime ?? (screen && detached(screen, list));
      if (runtime) {
        const reply = runtime.act(steps, { ...opts, agent: true });
        if (reply.ok && !opts.dryRun) for (const step of list) log.push({ ...step, at: Date.now() });
        return reply;
      }
      const plan = planAct(
        screen!,
        defs,
        store.snapshot(screen!.id),
        list,
        opts.dryRun ? null : options.random,
        "planner",
        options.deviceData,
      );
      if (!plan.ok) return plan;
      const reply = { ok: true as const, screen: screen!.id, changed: plan.changed.join("\n") };
      if (opts.dryRun) return { ...reply, dryRun: true };
      store.setMany(plan.values);
      for (const link of plan.links) onLink?.(link.goto, link.address);
      for (const { address, action } of plan.anchors ?? []) options.onAnchor?.(address, action);
      for (const send of plan.sends ?? []) deliverSend(send, options.onSend);
      for (const step of list) log.push({ ...step, at: Date.now() });
      return { ...reply, dryRun: false };
    },
    log: () => [...log],
    reset: () => {
      if (options.runtime) options.runtime.reset();
      else store.reset(current().id);
      log.length = 0;
    },
  };
}
