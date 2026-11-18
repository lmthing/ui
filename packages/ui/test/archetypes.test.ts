import { describe, expect, it } from "vitest";
import { archetypes, components, runComposeProbes } from "@lmthing/ui/catalog";
import { probeModels } from "../scripts/llm.config";
import { replayCall } from "../scripts/recordings";
import { compositionCast } from "../scripts/compose-casts";
describe.each(probeModels.filter((model) => model.required))("archetype composition on $id", (model) => {
  it("passes every current layout and the text-first rubric from real recorded replies", async () => {
    const results = await runComposeProbes({
      archetypes: Object.values(archetypes).map((def) => def.meta),
      defs: components,
      cast: compositionCast,
      callModel: replayCall("Archetypes", model.id),
      samples: model.samples,
      rubric: true,
    });
    expect(results).toHaveLength(35);
    expect(
      results
        .filter((result) => result.status === "fail")
        .map((result) => `${result.archetype}/${result.layout}: ${result.detail}`),
    ).toEqual([]);
  });
});
