import { URL } from "node:url";
import { readFileSync, writeFileSync } from "node:fs";
import type { Definition } from "@lmthing/ui/catalog";
import type * as Catalog from "@lmthing/ui/catalog";
const { runProbes, mergePairs, mergeDecision } = (await import(
  new URL("../../dist/catalog.js", import.meta.url).href
)) as typeof Catalog;
import { recordingCall, readBook, writeBook, replayCall } from "./recordings";
import type { ProbeModel } from "./llm.config";
type Evidence = {
  pair: string;
  model: string;
  decision: string;
  results: { need: string; expected: string; score?: string; status: string; replies: string[] }[];
}[];
type LiveCall = (model: ProbeModel, prompt: string) => Promise<string>;

export async function checkCoreMerges(
  defs: readonly Definition[],
  models: readonly ProbeModel[],
  liveCall: LiveCall,
  replay = false,
) {
  const evidence: Evidence = [];
  let failures = 0;
  for (const model of models) failures += await checkModel(defs, model, liveCall, replay, evidence);
  if (!replay) writeEvidence(evidence);
  return { failures, evidence };
}
async function checkModel(
  defs: readonly Definition[],
  model: ProbeModel,
  liveCall: LiveCall,
  replay: boolean,
  evidence: Evidence,
) {
  let failures = 0;
  const book = readBook("CoreMerges", model.id);
  const call = replay
    ? replayCall("CoreMerges", model.id)
    : recordingCall(model.id, book, (prompt) => liveCall(model, prompt));

  for (const pair of mergePairs) failures += await checkPair(defs, model, pair, call, evidence);
  if (!replay) writeBook("CoreMerges", model.id, book);
  return failures;
}
async function checkPair(
  defs: readonly Definition[],
  model: ProbeModel,
  pair: (typeof mergePairs)[number],
  call: ReturnType<typeof replayCall>,
  evidence: Evidence,
) {
  const scoped = defs.map((def) =>
    (pair.ids as readonly string[]).includes(def.meta.id)
      ? { ...def, probes: pair.probes.filter((probe) => probe.expect === def.meta.id) }
      : def,
  );
  const replies = new Map<string, string[]>();
  const results = await runProbes({
    defs: scoped,
    callModel: async (prompt, sample, format, probe) => {
      const reply = await call(prompt, sample, format, probe);
      const samples = replies.get(prompt) ?? [];
      samples[sample] = reply;
      replies.set(prompt, samples);
      return reply;
    },
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
      replies: replies.get(result.prompt) ?? [result.reply],
    })),
  });
  for (const result of results)
    console.log(
      `${result.status.toUpperCase()} ${result.score} ${pair.id}: ${result.probe.kind === "choose" ? result.probe.need : ""}`,
    );
  console.log(`${pair.id}: ${decision.toUpperCase()}`);
  if (model.required && decision === "retain")
    return results.filter((result) => result.status === "fail").length;
  return 0;
}
function writeEvidence(evidence: Evidence) {
  const report = new URL("../../../../docs/catalog/core-merge-evidence.json", import.meta.url);
  let archived: Evidence = [];
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
