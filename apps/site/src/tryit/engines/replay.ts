import { packFor } from "../scope";
import { isSuggestion } from "../suggestions";
import { recordedNow } from "../../data/recorded";
import { site } from "../../data/site";
import type { Engine } from "./types";

export type ReplayPlan = { lines: string[]; origin: string; ids: string[]; title: string };

const lineOf = (c: Record<string, unknown>) => JSON.stringify(c);

/** A real recorded screen for the request: a model's recorded reply, else a pack's worked example. */
export function planReplay(request: string): ReplayPlan {
  const pack = packFor(request);
  const recorded =
    recordedNow().screens.find((s) => s.pack === pack && s.screen.components.length >= 4) ??
    recordedNow().screens.find((s) => s.pack === null && s.screen.components.length >= 4);
  if (recorded) {
    const lines = recorded.screen.components.map(lineOf);
    return {
      lines,
      origin: `recorded from ${recorded.model}`,
      ids: recorded.screen.components.map((c) => c.c),
      title: recorded.screen.title ?? recorded.screen.id.replace(/_/g, " "),
    };
  }
  const worked = site.packs.find((p) => p.id === pack && p.lines.length);
  const lines = worked?.lines ?? [];
  return {
    lines,
    origin: `worked example, packs/${pack}/example.jsonl`,
    ids: lines.map((l) => JSON.parse(l).c as string),
    title: worked?.example ?? String(pack),
  };
}

const delay = (ms: number, signal: AbortSignal) =>
  new Promise<void>((done) => (signal.aborted ? done() : setTimeout(done, ms)));

/** Streams a recorded reply back as text, as if a model were writing it. Tier 4: no model runs. */
export function replayEngine(request: string): Engine {
  const plan = planReplay(request);
  const note = isSuggestion(request)
    ? undefined
    : `Nothing was recorded for "${request.trim()}". Replaying the closest recording: ${plan.title} (${plan.origin}).`;
  return {
    tier: 4,
    label: "Recorded replay",
    ...(note ? { note } : {}),
    model: plan.origin,
    async run({ signal, onText, onStatus }) {
      onStatus(note ?? `Replaying a real output, ${plan.origin}`);
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
