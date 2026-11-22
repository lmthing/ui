import { choosePrompt, readPrompt, writePrompt } from "./prompts";
import { scoreChoose, scoreRead, scoreWrite } from "./score";
import type { Definition, Probe, ProbeCall, ProbeResult } from "./types";
import { componentReplayProbe } from "./replay-probe";
import { writerFormatFor } from "../format";
import { variantProbeDefinitions } from "./variants";
import { readFixtureFor } from "./fixtures";

async function runOne(
  def: Definition,
  probe: Probe,
  defs: readonly Definition[],
  callModel: ProbeCall,
): Promise<ProbeResult> {
  const base = { component: def.meta.id, probe, prompt: "", reply: "" };
  // The model never sees code-owned components (TabBar) as choices.
  const offered = defs.filter((entry) => !entry.meta.codeOwned);
  const ids = offered.map((entry) => entry.meta.id);
  if (probe.kind === "read") {
    const instance = probe.expect.address.split("/")[0]!;
    const prompt = readPrompt(
      def,
      probe.screen,
      instance,
      probe.task,
      undefined,
      readFixtureFor(def.meta.id, probe),
      probe.at,
      probe.siblings ? { siblings: probe.siblings, defs } : undefined,
    );
    const reply = await callModel(prompt, 0, undefined, componentReplayProbe(def, probe, prompt));
    const { pass, detail } = scoreRead(reply, probe.expect);
    return { ...base, prompt, reply, status: pass ? "pass" : "fail", detail };
  }
  if (!ids.includes(probe.expect)) {
    return { ...base, status: "skipped", detail: `${probe.expect} is not in the catalog yet` };
  }
  if (probe.kind === "choose") {
    const prompt = choosePrompt(offered, probe.need);
    const reply = await callModel(
      prompt,
      0,
      undefined,
      componentReplayProbe(def, probe, choosePrompt([def], probe.need)),
    );
    const { pass, detail } = scoreChoose(reply, ids, probe.expect);
    return { ...base, prompt, reply, status: pass ? "pass" : "fail", detail };
  }
  const prompt = writePrompt(def, probe.brief);
  const reply = await callModel(prompt, 0, writerFormatFor(def), componentReplayProbe(def, probe, prompt));
  const { pass, detail } = scoreWrite(reply, def, probe.variant, probe.expectProps);
  return { ...base, prompt, reply, status: pass ? "pass" : "fail", detail };
}

/** Run one probe `samples` times; it passes when a majority pass. Reports the first failing sample. */
async function sampled(
  def: Definition,
  probe: Probe,
  defs: readonly Definition[],
  callModel: ProbeCall,
  samples: number,
  component = true,
): Promise<ProbeResult> {
  const runs: ProbeResult[] = [];
  for (let sample = 0; sample < samples; sample++) {
    const run = await runOne(def, probe, defs, (prompt, _sample, format, replayProbe) =>
      callModel(prompt, sample, format, {
        ...replayProbe,
        samples,
        ...(component ? { sourceComponent: def.meta.id } : {}),
      }),
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
  callModel: ProbeCall;
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
  // The CLI sends this selector as its component id and records into its own book.
  if (only?.includes("variants"))
    for (const def of variantProbeDefinitions)
      for (const probe of def.probes)
        results.push(await sampled(def, probe, variantProbeDefinitions, callModel, samples, false));
  return results;
}
