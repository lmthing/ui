import { useCallback, useRef, useState } from "react";
import { writePrompt } from "./prompt";
import { checkLine, closedLines, type Outcome } from "./assemble";
import { planReplay } from "./engines/replay";
import type { Engine } from "./engines/types";
import { linesSchema, scopeFor } from "./scope";

export type Written = { raw: string; outcome: Outcome };

/** One run of the model writing a screen: lines are validated as each one closes in the streamed text. */
export function useWriter(pick: (request: string) => Engine, setStatus: (status: string) => void) {
  const [running, setRunning] = useState(false);
  const [written, setWritten] = useState<Written[]>([]);
  const [engine, setEngine] = useState<Engine | null>(null);
  const abort = useRef<AbortController | null>(null);

  const run = useCallback(
    async (request: string) => {
      abort.current?.abort();
      const controller = new AbortController();
      abort.current = controller;
      const chosen = pick(request);
      const scope = scopeFor(request);
      const allowed = chosen.tier === 3 ? planReplay(request).ids : scope.ids;
      const taken = new Set<string>();
      (setEngine(chosen), setRunning(true), setWritten([]));
      let seen = 0;
      const onText = (text: string) => {
        const lines = closedLines(text);
        const fresh = lines
          .slice(seen)
          .map((line, i) => ({ raw: line, outcome: checkLine(line, allowed, seen + i, taken) }));
        seen = lines.length;
        if (fresh.length) setWritten((now) => [...now, ...fresh]);
      };
      try {
        const input = {
          prompt: writePrompt(scope, request),
          schema: linesSchema(scope),
          signal: controller.signal,
        };
        await chosen.run({ ...input, onText, onStatus: setStatus });
        if (!controller.signal.aborted)
          setStatus(chosen.tier === 3 ? `Replay finished.${chosen.note ? ` ${chosen.note}` : ""}` : "Done.");
      } catch (error) {
        if (!controller.signal.aborted) setStatus(`${chosen.label} failed (${(error as Error).message}).`);
      } finally {
        setRunning(false);
      }
    },
    [pick, setStatus],
  );
  return { engine, running, written, run, stop: () => abort.current?.abort() };
}
