import { URL } from "node:url";
import { readFileSync, writeFileSync } from "node:fs";
import type { Definition } from "../src/catalog/probes/types";
import { mergePairs, mergeDecision } from "../src/catalog/probes/merge-pairs";
import type * as Catalog from "@lmthing/ui/catalog";
const { runProbes } = (await import(new URL("../dist/catalog.js", import.meta.url).href)) as typeof Catalog;
import { keyOf, readBook, writeBook, replayCall } from "./recordings";
import type { ProbeModel } from "./llm.config";
export async function checkCoreMerges(
  defs: readonly Definition[],
  models: readonly ProbeModel[],
  liveCall: (model: ProbeModel, prompt: string) => Promise<string>,
  replay = false,
) {
  const evidence: {
    pair: string;
    model: string;
    decision: string;
    results: { need: string; expected: string; score?: string; status: string; replies: string[] }[];
  }[] = [];
  let failures = 0;
  for (const model of models) {
    const book = readBook("CoreMerges", model.id);
    const call = replay
      ? replayCall("CoreMerges", model.id)
      : async (prompt: string, sample = 0) => {
          const reply = await liveCall(model, prompt),
            key = keyOf(model.id, prompt);
          const replies = sample === 0 ? [] : [...(book[key]?.replies ?? [])];
          replies[sample] = reply;
          book[key] = { prompt, reply: replies[0]!, replies };
          return reply;
        };
    for (const pair of mergePairs) {
      const scoped = defs.map((def) =>
        (pair.ids as readonly string[]).includes(def.meta.id)
          ? { ...def, probes: pair.probes.filter((probe) => probe.expect === def.meta.id) }
          : def,
      );
      const results = await runProbes({
        defs: scoped,
        callModel: call,
        only: [...pair.ids],
        samples: model.samples,
      });
      const decision = mergeDecision(pair.ids, results);
      evidence.push({
        pair: pair.id,
        model: model.id,
        decision,
        results: results.map((result) => ({
          need: result.probe.kind === "choose" ? result.probe.need : "",
          expected: result.probe.expect as string,
          ...(result.score ? { score: result.score } : {}),
          status: result.status,
          replies: book[keyOf(model.id, result.prompt)]?.replies ?? [result.reply],
        })),
      });
      for (const result of results)
        console.log(
          `${result.status.toUpperCase()} ${result.score} ${pair.id}: ${result.probe.kind === "choose" ? result.probe.need : ""}`,
        );
      console.log(`${pair.id}: ${decision.toUpperCase()}`);
      if (model.required && decision === "retain")
        failures += results.filter((result) => result.status === "fail").length;
    }
    if (!replay) writeBook("CoreMerges", model.id, book);
  }
  if (!replay) {
    const report = new URL("../../../docs/catalog/core-merge-evidence.json", import.meta.url);
    let archived: typeof evidence = [];
    try {
      archived = (JSON.parse(readFileSync(report, "utf8")) as { evidence: typeof evidence }).evidence.filter(
        (entry) => !mergePairs.some((pair) => pair.id === entry.pair),
      );
    } catch {}
    writeFileSync(
      report,
      `${JSON.stringify({ generatedAt: new Date().toISOString(), evidence: [...archived, ...evidence] }, null, 2)}\n`,
    );
  }
  return { failures, evidence };
}
