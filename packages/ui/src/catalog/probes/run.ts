import { choosePrompt, readPrompt, writePrompt } from "./prompts";
import { scoreChoose, scoreRead, scoreWrite } from "./score";
import type { CallModel, Definition, Probe, ProbeResult } from "./types";
import { writerFormatFor } from "../format";

async function runOne(
  def: Definition,
  probe: Probe,
  defs: readonly Definition[],
  callModel: CallModel,
): Promise<ProbeResult> {
  const base = { component: def.meta.id, probe, prompt: "", reply: "" };
  // The model never sees code-owned components (TabBar) as choices.
  const offered = defs.filter((entry) => !entry.meta.codeOwned);
  const ids = offered.map((entry) => entry.meta.id);
  if (probe.kind === "read") {
    const instance = probe.expect.address.split("/")[0]!;
    const prompt = readPrompt(def, probe.screen, instance, probe.task);
    const reply = await callModel(prompt);
    const { pass, detail } = scoreRead(reply, probe.expect);
    return { ...base, prompt, reply, status: pass ? "pass" : "fail", detail };
  }
  if (!ids.includes(probe.expect)) {
    return { ...base, status: "skipped", detail: `${probe.expect} is not in the catalog yet` };
  }
  if (probe.kind === "choose") {
    const prompt = choosePrompt(offered, probe.need);
    const reply = await callModel(prompt);
    const { pass, detail } = scoreChoose(reply, ids, probe.expect);
    return { ...base, prompt, reply, status: pass ? "pass" : "fail", detail };
  }
  const prompt = writePrompt(def, probe.brief);
  const reply = await callModel(prompt, 0, writerFormatFor(def));
  const { pass, detail } = scoreWrite(reply, def);
  return { ...base, prompt, reply, status: pass ? "pass" : "fail", detail };
}

/** Run one probe `samples` times; it passes when a majority pass. Reports the first failing sample. */
async function sampled(
  def: Definition,
  probe: Probe,
  defs: readonly Definition[],
  callModel: CallModel,
  samples: number,
): Promise<ProbeResult> {
  const runs: ProbeResult[] = [];
  for (let sample = 0; sample < samples; sample++) {
    const run = await runOne(def, probe, defs, (prompt, _sample, format) =>
      callModel(prompt, sample, format),
    );
    if (run.status === "skipped") return run;
    runs.push(run);
  }
  const passed = runs.filter((run) => run.status === "pass").length;
  const shown = runs.find((run) => run.status === "fail") ?? runs[0]!;
  const status = passed * 2 > samples ? "pass" : "fail";
  return {
    ...shown,
    status,
    score: `${passed}/${samples}`,
    detail: status === "pass" && passed < samples ? `unstable: ${shown.detail}` : shown.detail,
  };
}

/**
 * Run the probes of the selected components against one model. Pure: the model call is injected.
 * Choose probes see the whole catalog, so adding a component can change another component's result.
 */
export async function runProbes(options: {
  defs: readonly Definition[];
  callModel: CallModel;
  only?: readonly string[];
  /** Calls per probe; a probe passes when a majority of its samples pass (2 of 3). */
  samples?: number;
}): Promise<ProbeResult[]> {
  const { defs, callModel, only, samples = 1 } = options;
  const selected = defs.filter((def) => !only?.length || only.includes(def.meta.id));
  const results: ProbeResult[] = [];
  for (const def of selected) {
    for (const probe of def.probes) results.push(await sampled(def, probe, defs, callModel, samples));
  }
  return results;
}
