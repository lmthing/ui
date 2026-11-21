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
import { createStandaloneAccess, readControls } from "./runtime";
import { deliverSend, type SendHandler } from "./actions";
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
  onSend?: SendHandler;
  runtime?: { act(steps: ActStep | ActStep[], opts?: ActOptions): ActReply; read(): string; reset(): void };
};

/** Opted-in confirmations work without a mounted phone, keeping the agent's data-only dispatch. */
function standaloneAccess(options: AgentOptions, screen: ScreenLike, currency: AppCurrency | undefined) {
  if (
    screen.components.some(({ c }) => {
      const meta = options.defs[c]?.meta;
      return (
        meta &&
        (meta.recordRuntime ||
          meta.buzz ||
          meta.draw?.kind === "deck" ||
          hasReportConfirmation(meta) ||
          (meta.confirmParts?.length &&
            (meta.session ||
              meta.successActions?.length ||
              meta.errorActions?.length ||
              meta.live?.derive ||
              meta.linkedEdits)))
      );
    })
  )
    return createStandaloneAccess({ ...options, screen }, currency);
}

/** Every step is checked before commit. Dry runs and rejected batches leave the store untouched. */
export function createAgentAccess(options: AgentOptions) {
  const { defs, store, current, onLink } = options;
  const currency = parseAppCurrency(options.currency);
  const log: ActLogEntry[] = [];
  return {
    read: () => {
      if (options.runtime) return options.runtime.read();
      const screen = current();
      return (
        standaloneAccess(options, screen, currency)?.read() ??
        readControls(
          screen,
          defs,
          store.snapshot(screen.id),
          options.lang,
          undefined,
          options.deviceData,
          currency,
        )
      );
    },
    act(steps: ActStep | ActStep[], opts: ActOptions = {}): ActReply {
      const screen = options.runtime ? undefined : current();
      const runtime = options.runtime ?? (screen && standaloneAccess(options, screen, currency));
      if (runtime) {
        const reply = runtime.act(steps, { ...opts, agent: true });
        if (reply.ok && !opts.dryRun)
          for (const step of Array.isArray(steps) ? steps : [steps]) log.push({ ...step, at: Date.now() });
        return reply;
      }
      const list = Array.isArray(steps) ? steps : [steps];
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
