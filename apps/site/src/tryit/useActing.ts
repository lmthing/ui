import { useCallback, useState } from "react";
import type { ScreenLike } from "@lmthing/ui/catalog";
import { actPrompt } from "./prompt";
import { actSchema, offered, resolveAnswer, type ActOutcome } from "./act";
import type { Engine } from "./engines/types";

const no = (message: string): ActOutcome => ({ ok: false, address: "", action: "", message });

/** The Act step: the model answers with an address and action, limited to the screen's real ones. */
export function useActing(
  engine: Engine | null,
  screen: ScreenLike,
  view: string,
  setStatus: (s: string) => void,
) {
  const [answer, setAnswer] = useState<ActOutcome | null>(null);
  const act = useCallback(
    async (task: string) => {
      const affordances = offered(screen);
      if (!engine || engine.tier === 3 || !affordances.length)
        return setAnswer(no("Acting needs a model in tier 1 or 2 and a screen with actions."));
      let text = "";
      setStatus("Choosing an action");
      const signal = new AbortController().signal;
      const input = { prompt: actPrompt(view, task), schema: actSchema(affordances), signal };
      await engine.run({ ...input, onText: (t) => (text = t), onStatus: setStatus });
      setAnswer(resolveAnswer(screen, text));
      setStatus("Done.");
    },
    [engine, screen, view, setStatus],
  );
  return { answer, act, clear: () => setAnswer(null) };
}
