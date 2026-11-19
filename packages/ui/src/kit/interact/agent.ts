import { planAct, type ActStep, type Definition, type RandomSource, type ScreenLike } from "../../catalog";
import { readControls } from "./runtime";
import { createScreenController } from "./controller";
import type { InteractionStore } from "./store";

export type ActOptions = { dryRun?: boolean; agent?: boolean };
export type ActReply =
  | { ok: true; screen: string; changed: string; dryRun: boolean }
  | { ok: false; code: string; at: number; hint?: string };
export type ActLogEntry = { address: string; action: string; value?: unknown; at: number };

type AgentOptions = {
  defs: Record<string, Definition>;
  lang?: string | undefined;
  store: InteractionStore;
  random?: RandomSource | undefined;
  current: () => ScreenLike;
  onLink?: (goto: string, address: string) => void;
  runtime?: { act(steps: ActStep | ActStep[], opts?: ActOptions): ActReply; read(): string; reset(): void };
};

/** Use the same confirmation dispatcher for opt-in actions even without a mounted phone. */
function withRuntime<T>(
  options: AgentOptions,
  screen: ScreenLike,
  run: (runtime: NonNullable<AgentOptions["runtime"]>) => T,
) {
  if (options.runtime) return run(options.runtime);
  if (
    !screen.components.some(({ c }) => options.defs[c]?.meta.session || options.defs[c]?.meta.successActions)
  )
    return;
  const runtime = createScreenController({ ...options, screen });
  try {
    return run(runtime);
  } finally {
    runtime.dispose();
  }
}

/** Every step is checked before commit. Dry runs and rejected batches leave the store untouched. */
export function createAgentAccess(options: AgentOptions) {
  const { defs, store, current, onLink } = options;
  const log: ActLogEntry[] = [];
  return {
    read: () => {
      const screen = current();
      return (
        withRuntime(options, screen, (runtime) => runtime.read()) ??
        readControls(screen, defs, store.snapshot(screen.id), options.lang)
      );
    },
    act(steps: ActStep | ActStep[], opts: ActOptions = {}): ActReply {
      const screen = current();
      const dispatched = withRuntime(options, screen, (runtime) =>
        runtime.act(steps, { ...opts, agent: true }),
      );
      if (dispatched) {
        const reply = dispatched;
        if (reply.ok && !opts.dryRun)
          for (const step of Array.isArray(steps) ? steps : [steps]) log.push({ ...step, at: Date.now() });
        return reply;
      }
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
