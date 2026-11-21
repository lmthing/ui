import { describe, expect, it } from "vitest";
import { archetypes, components, runComposeProbes } from "@lmthing/ui/catalog";
import { probeModels } from "../scripts/llm";
import { replayCall } from "../scripts/llm";
import { compositionHistoryCast } from "../scripts/llm";
import { selectedLayouts } from "../scripts/build";
describe.each(probeModels.filter((model) => model.required))("archetype composition on $id", (model) => {
  it("passes every current layout and the text-first rubric from real recorded replies", async () => {
    const metas = Object.values(archetypes).map((def) => def.meta);
    const only = selectedLayouts(metas, import.meta.url);
    if (only && !only.length) return;
    const results = await runComposeProbes({
      archetypes: metas,
      ...(only ? { only } : {}),
      defs: components,
      cast: compositionHistoryCast,
      callModel: replayCall("Archetypes", model.id),
      samples: model.samples,
      rubric: true,
    });
    expect(results).toHaveLength(only?.length ?? 35);
    expect(
      results
        .filter((result) => result.status === "fail")
        .map((result) => `${result.archetype}/${result.layout}: ${result.detail}`),
    ).toEqual([]);
  });
});
