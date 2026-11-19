import { packFor } from "../scope";
import { site } from "../../data/site";
import type { Engine } from "./types";

export type ReplayPlan = { lines: string[]; origin: string; ids: string[] };

const lineOf = (c: Record<string, unknown>) => JSON.stringify(c);

/** A real recorded screen for the request: a model's recorded reply, else a pack's worked example. */
export function planReplay(request: string): ReplayPlan {
  const pack = packFor(request);
  const recorded =
    site.screens.find((s) => s.pack === pack && s.screen.components.length >= 4) ??
    site.screens.find((s) => s.pack === null && s.screen.components.length >= 4);
  if (recorded) {
    const lines = recorded.screen.components.map(lineOf);
    return {
      lines,
      origin: `recorded from ${recorded.model}`,
      ids: recorded.screen.components.map((c) => c.c),
    };
  }
  const worked = site.packs.find((p) => p.id === pack && p.lines.length);
  const lines = worked?.lines ?? [];
  return {
    lines,
    origin: `worked example, packs/${pack}/example.jsonl`,
    ids: lines.map((l) => JSON.parse(l).c as string),
  };
}

const delay = (ms: number, signal: AbortSignal) =>
  new Promise<void>((done) => (signal.aborted ? done() : setTimeout(done, ms)));

/** Streams a recorded reply back as text, as if a model were writing it. Tier 3: nothing runs locally. */
export function replayEngine(request: string): Engine {
  const plan = planReplay(request);
  return {
    tier: 3,
    label: "Recorded replay",
    model: plan.origin,
    async run({ signal, onText, onStatus }) {
      onStatus(`Replaying a real output, ${plan.origin}`);
      const text = `{"lines":[${plan.lines.join(",")}]}`;
      const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      for (let at = 0; at < text.length && !signal.aborted; at += 9) {
        onText(text.slice(0, at + 9));
        if (!reduced) await delay(14, signal);
      }
      onText(text);
    },
  };
}
