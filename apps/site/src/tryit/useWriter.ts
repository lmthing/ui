import { useCallback, useRef, useState } from "react";
import { writePrompt } from "./prompt";
import { checkLine, closedLines, type Outcome } from "./assemble";
import { planReplay, replayEngine } from "./engines/replay";
import type { Engine } from "./engines/types";
import type { Failure } from "./openrouter";
import { linesSchema, scopeFor } from "./scope";

export type Written = { raw: string; outcome: Outcome };

const advice: Record<Failure["kind"], string> = {
  key: "Reconnect OpenRouter.",
  quota: "The free quota is used up for now; try again later.",
  model: "Try another free model.",
};

const finished = (engine: Engine) =>
  engine.tier === 4 ? `Replay finished.${engine.note ? ` ${engine.note}` : ""}` : "Done.";

/** One run of the model writing a screen: lines are validated as each one closes in the streamed text. */
export function useWriter(pick: (request: string) => Engine, setStatus: (status: string) => void) {
  const [running, setRunning] = useState(false);
  const [written, setWritten] = useState<Written[]>([]);
  const [engine, setEngine] = useState<Engine | null>(null);
  const abort = useRef<AbortController | null>(null);

  /** Streams one engine's lines into `written`, validating each against the scope it was allowed. */
  const write = useCallback(
    async (chosen: Engine, request: string, signal: AbortSignal) => {
      const scope = scopeFor(request);
      const allowed = chosen.tier === 4 ? planReplay(request).ids : scope.ids;
      const taken = new Set<string>();
      (setEngine(chosen), setWritten([]));
      let seen = 0;
      const onText = (text: string) => {
        const lines = closedLines(text);
        const fresh = lines
          .slice(seen)
          .map((line, i) => ({ raw: line, outcome: checkLine(line, allowed, seen + i, taken) }));
        seen = lines.length;
        if (fresh.length) setWritten((now) => [...now, ...fresh]);
      };
      const input = { prompt: writePrompt(scope, request), schema: linesSchema(scope), signal };
      await chosen.run({ ...input, onText, onStatus: setStatus });
    },
    [setStatus],
  );

  const run = useCallback(
    async (request: string) => {
      abort.current?.abort();
      const controller = new AbortController();
      abort.current = controller;
      const chosen = pick(request);
      setRunning(true);
      try {
        await write(chosen, request, controller.signal);
        if (!controller.signal.aborted) setStatus(finished(chosen));
      } catch (error) {
        if (controller.signal.aborted) return;
        const { message, kind } = error as Failure;
        if (chosen.tier !== 3) return setStatus(`${chosen.label} failed (${message}).`);
        // A free model can be busy, rate-limited or off-format; the recorded run keeps the panel useful.
        await write(replayEngine(request), request, controller.signal);
        setStatus(
          `OpenRouter failed: ${message}. ${advice[kind] ?? advice.model} The recorded replay is shown instead.`,
        );
      } finally {
        setRunning(false);
      }
    },
    [pick, setStatus, write],
  );
  return { engine, running, written, run, stop: () => abort.current?.abort() };
}
