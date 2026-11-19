import {
  planAct,
  readScreen,
  type ActStep,
  type Definition,
  type RandomSource,
  type ScreenLike,
} from "../../catalog";
import type { InteractionStore } from "./store";

export type ActOptions = { dryRun?: boolean; agent?: boolean };
export type ActReply =
  | { ok: true; screen: string; changed: string; dryRun: boolean }
  | { ok: false; code: string; at: number; hint?: string };
export type ActLogEntry = { address: string; action: string; value?: unknown; at: number };

/**
 * read and act for agents (plan 5.9). `act` runs a list of steps atomically: every step is checked
 * first and nothing changes unless all pass. `dryRun` returns what would change without changing it.
 * Mounted-part checks and settling arrive with the dispatcher (U2); this layer works on screen data.
 */
export function createAgentAccess(options: {
  defs: Record<string, Definition>;
  lang?: string | undefined;
  store: InteractionStore;
  random?: RandomSource | undefined;
  current: () => ScreenLike;
  onLink?: (goto: string, address: string) => void;
  runtime?: { act(steps: ActStep | ActStep[], opts?: ActOptions): ActReply; read(): string; reset(): void };
}) {
  const { defs, store, current, onLink } = options;
  const log: ActLogEntry[] = [];
  return {
    read: () =>
      options.runtime?.read() ?? readScreen(current(), defs, store.snapshot(current().id), options.lang),
    act(steps: ActStep | ActStep[], opts: ActOptions = {}): ActReply {
      if (options.runtime) {
        const reply = options.runtime.act(steps, { ...opts, agent: true });
        if (reply.ok && !opts.dryRun)
          for (const step of Array.isArray(steps) ? steps : [steps]) log.push({ ...step, at: Date.now() });
        return reply;
      }
      const screen = current();
      const list = Array.isArray(steps) ? steps : [steps];
      const plan = planAct(
        screen,
        defs,
        store.snapshot(screen.id),
        list,
        opts.dryRun ? null : options.random,
      );
      if (!plan.ok) return plan;
      const reply = { ok: true as const, screen: screen.id, changed: plan.changed.join("\n") };
      if (opts.dryRun) return { ...reply, dryRun: true };
      store.setMany(plan.values);
      for (const link of plan.links) onLink?.(link.goto, link.address);
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
