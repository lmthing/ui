import { expect, test } from "vitest";
import { components, flowTemplates, runFlowProbes } from "@lmthing/ui/catalog";
import { probeModels, replayCall } from "../scripts/llm";

for (const model of probeModels.filter(({ required }) => required)) {
  test.each(flowTemplates.list)(`$id: pick and fill replays on ${model.id}`, async (template) => {
    const call = replayCall(`flows/${template.id}`, model.id);
    const results = await runFlowProbes(template, flowTemplates.list, components, call, model.samples);
    expect(results).toHaveLength(template.probes.pick.length + template.probes.fill.length);
    expect(results.filter(({ passed }) => !passed)).toEqual([]);
    expect(results.flatMap(({ samples }) => samples.filter(({ reply }) => reply === undefined))).toEqual([]);
  });
}
