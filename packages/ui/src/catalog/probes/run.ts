import { choosePrompt, readPrompt, writePrompt } from "./prompts";
import { scoreChoose, scoreRead, scoreWrite } from "./score";
import type { CallModel, Definition, Probe, ProbeResult } from "./types";

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
  const reply = await callModel(prompt);
  const { pass, detail } = scoreWrite(reply, def);
  return { ...base, prompt, reply, status: pass ? "pass" : "fail", detail };
}

/**
 * Run the probes of the selected components against one model. Pure: the model call is injected.
 * Choose probes see the whole catalog, so adding a component can change another component's result.
 */
export async function runProbes(options: {
  defs: readonly Definition[];
  callModel: CallModel;
  only?: readonly string[];
}): Promise<ProbeResult[]> {
  const { defs, callModel, only } = options;
  const selected = defs.filter((def) => !only?.length || only.includes(def.meta.id));
  const results: ProbeResult[] = [];
  for (const def of selected) {
    for (const probe of def.probes) results.push(await runOne(def, probe, defs, callModel));
  }
  return results;
}
